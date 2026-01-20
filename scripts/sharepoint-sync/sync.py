#!/usr/bin/env python3
"""
Sync SharePoint documents to Google Gemini Vector Store.

Streams files directly from SharePoint to Gemini without local storage.
Stores SharePoint webUrl as metadata for clickable citations.

Environment variables:
    MICROSOFT_TENANT_ID     - Entra ID tenant ID
    MICROSOFT_CLIENT_ID     - App registration client ID
    MICROSOFT_CLIENT_SECRET - App registration client secret
    SHAREPOINT_SITE_ID      - SharePoint site ID (or use --site-url)
    GEMINI_API_KEY          - Google Gemini API key
    PROGRESS_BUCKET         - S3 bucket for progress tracking (optional)
"""

import argparse
import hashlib
import io
import json
import logging
import os
import sys
import tempfile
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Generator

import boto3
import requests
from azure.identity import ClientSecretCredential
from msgraph import GraphServiceClient
from msgraph.generated.models.drive_item import DriveItem
from google import genai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf",
    ".xls", ".xlsx", ".csv",
    ".ppt", ".pptx",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml",
    ".log", ".ini", ".cfg", ".conf",
}


@dataclass
class SyncProgress:
    """Track sync progress for resumption."""
    store_name: str
    total_files: int
    uploaded_files: int
    failed_files: list[str]
    uploaded_hashes: set[str]
    last_updated: str

    def to_dict(self) -> dict:
        d = asdict(self)
        d["uploaded_hashes"] = list(self.uploaded_hashes)
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "SyncProgress":
        d["uploaded_hashes"] = set(d.get("uploaded_hashes", []))
        d["failed_files"] = d.get("failed_files", [])
        return cls(**d)


@dataclass
class SharePointFile:
    """Represents a file in SharePoint."""
    id: str
    name: str
    web_url: str
    download_url: str
    size: int
    path: str  # Relative path within the document library
    content_hash: str


class FileMappingStore:
    """Store and persist file mappings to S3 for URL resolution."""

    def __init__(self, bucket: str | None, key: str = "sharepoint-sync/file-mapping.json"):
        self.bucket = bucket
        self.key = key
        self.s3 = boto3.client("s3") if bucket else None
        self.mappings: dict[str, dict] = {}  # fileName -> {sourcePath, sharePointUrl}

    def load(self):
        """Load existing mappings from S3."""
        if self.s3 and self.bucket:
            try:
                response = self.s3.get_object(Bucket=self.bucket, Key=self.key)
                self.mappings = json.loads(response["Body"].read().decode("utf-8"))
                logger.info(f"Loaded {len(self.mappings)} existing file mappings")
            except self.s3.exceptions.NoSuchKey:
                logger.info("No existing file mappings found, starting fresh")
            except Exception as e:
                logger.warning(f"Could not load file mappings: {e}")

    def add(self, file_name: str, source_path: str, sharepoint_url: str):
        """Add a file mapping."""
        # Use a composite key to handle duplicate file names in different folders
        key = f"{source_path}"  # Use full path as key for uniqueness
        self.mappings[key] = {
            "fileName": file_name,
            "sourcePath": source_path,
            "sharePointUrl": sharepoint_url,
        }

    def save(self):
        """Persist mappings to S3."""
        if self.s3 and self.bucket:
            try:
                self.s3.put_object(
                    Bucket=self.bucket,
                    Key=self.key,
                    Body=json.dumps(self.mappings, indent=2),
                    ContentType="application/json",
                )
                logger.info(f"Saved {len(self.mappings)} file mappings to s3://{self.bucket}/{self.key}")
            except Exception as e:
                logger.error(f"Could not save file mappings: {e}")
        else:
            # Write locally if no S3 bucket
            local_path = "file-mapping.json"
            with open(local_path, "w") as f:
                json.dump(self.mappings, f, indent=2)
            logger.info(f"Saved {len(self.mappings)} file mappings to {local_path}")


class ProgressTracker:
    """Track and persist sync progress to S3."""

    def __init__(self, bucket: str | None, key: str = "sharepoint-sync-progress.json"):
        self.bucket = bucket
        self.key = key
        self.s3 = boto3.client("s3") if bucket else None
        self.progress: SyncProgress | None = None

    def load(self, store_name: str) -> SyncProgress:
        """Load existing progress or create new."""
        if self.s3 and self.bucket:
            try:
                response = self.s3.get_object(Bucket=self.bucket, Key=self.key)
                data = json.loads(response["Body"].read().decode("utf-8"))
                self.progress = SyncProgress.from_dict(data)
                logger.info(f"Resumed progress: {self.progress.uploaded_files}/{self.progress.total_files} files")
                return self.progress
            except self.s3.exceptions.NoSuchKey:
                pass
            except Exception as e:
                logger.warning(f"Could not load progress: {e}")

        self.progress = SyncProgress(
            store_name=store_name,
            total_files=0,
            uploaded_files=0,
            failed_files=[],
            uploaded_hashes=set(),
            last_updated=datetime.utcnow().isoformat(),
        )
        return self.progress

    def save(self):
        """Persist progress to S3."""
        if not self.progress:
            return

        self.progress.last_updated = datetime.utcnow().isoformat()

        if self.s3 and self.bucket:
            try:
                self.s3.put_object(
                    Bucket=self.bucket,
                    Key=self.key,
                    Body=json.dumps(self.progress.to_dict(), indent=2),
                    ContentType="application/json",
                )
            except Exception as e:
                logger.warning(f"Could not save progress: {e}")

    def mark_uploaded(self, content_hash: str):
        """Mark a file as uploaded."""
        if self.progress:
            self.progress.uploaded_files += 1
            self.progress.uploaded_hashes.add(content_hash)

    def mark_failed(self, file_path: str):
        """Mark a file as failed."""
        if self.progress:
            self.progress.failed_files.append(file_path)

    def is_uploaded(self, content_hash: str) -> bool:
        """Check if file was already uploaded."""
        return self.progress is not None and content_hash in self.progress.uploaded_hashes


class SharePointClient:
    """Client for interacting with SharePoint via Microsoft Graph."""

    def __init__(self, tenant_id: str, client_id: str, client_secret: str):
        self.credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
        self.graph = GraphServiceClient(self.credential)
        self._access_token: str | None = None

    def _get_access_token(self) -> str:
        """Get access token for direct API calls."""
        if not self._access_token:
            token = self.credential.get_token("https://graph.microsoft.com/.default")
            self._access_token = token.token
        return self._access_token

    async def get_site_id(self, site_url: str) -> str:
        """Get site ID from SharePoint site URL.

        Args:
            site_url: Full SharePoint site URL, e.g.,
                      https://company.sharepoint.com/sites/MySite
        """
        # Parse the URL to extract hostname and site path
        from urllib.parse import urlparse
        parsed = urlparse(site_url)
        hostname = parsed.netloc
        site_path = parsed.path.rstrip("/")

        # Use Graph API to get site by path
        site = await self.graph.sites.by_site_id(f"{hostname}:{site_path}:").get()
        if site and site.id:
            return site.id
        raise ValueError(f"Could not find site: {site_url}")

    async def list_files(
        self,
        site_id: str,
        drive_name: str = "Documents",
        folder_path: str | None = None,
    ) -> Generator[SharePointFile, None, None]:
        """Recursively list all files in a SharePoint document library.

        Args:
            site_id: SharePoint site ID
            drive_name: Name of the document library (default: "Documents")
            folder_path: Optional subfolder path to start from
        """
        # Get the drive (document library)
        drives = await self.graph.sites.by_site_id(site_id).drives.get()
        drive = None
        for d in drives.value or []:
            if d.name == drive_name or d.id == drive_name:
                drive = d
                break

        if not drive:
            raise ValueError(f"Document library not found: {drive_name}")

        logger.info(f"Scanning document library: {drive.name}")

        # List files recursively
        async for file in self._list_files_recursive(site_id, drive.id, folder_path or ""):
            yield file

    async def _list_files_recursive(
        self,
        site_id: str,
        drive_id: str,
        path: str,
    ) -> Generator[SharePointFile, None, None]:
        """Recursively list files in a folder."""
        try:
            if path:
                items = await (
                    self.graph.sites.by_site_id(site_id)
                    .drives.by_drive_id(drive_id)
                    .root.item_with_path(path)
                    .children.get()
                )
            else:
                items = await (
                    self.graph.sites.by_site_id(site_id)
                    .drives.by_drive_id(drive_id)
                    .root.children.get()
                )

            for item in items.value or []:
                if item.folder:
                    # Recurse into subfolder
                    subfolder_path = f"{path}/{item.name}" if path else item.name
                    async for file in self._list_files_recursive(site_id, drive_id, subfolder_path):
                        yield file
                elif item.file:
                    # Check if supported file type
                    ext = os.path.splitext(item.name)[1].lower()
                    if ext not in SUPPORTED_EXTENSIONS:
                        continue

                    # Get download URL (requires additional API call for @microsoft.graph.downloadUrl)
                    download_url = await self._get_download_url(site_id, drive_id, item.id)

                    yield SharePointFile(
                        id=item.id,
                        name=item.name,
                        web_url=item.web_url or "",
                        download_url=download_url,
                        size=item.size or 0,
                        path=f"{path}/{item.name}" if path else item.name,
                        content_hash=item.file.hashes.quick_xor_hash if item.file.hashes else "",
                    )

        except Exception as e:
            logger.error(f"Error listing files in {path}: {e}")

    async def _get_download_url(self, site_id: str, drive_id: str, item_id: str) -> str:
        """Get the download URL for a file."""
        # The SDK doesn't directly expose @microsoft.graph.downloadUrl,
        # so we make a direct API call
        token = self._get_access_token()
        url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives/{drive_id}/items/{item_id}"
        headers = {"Authorization": f"Bearer {token}"}

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        return data.get("@microsoft.graph.downloadUrl", "")

    def download_file(self, download_url: str) -> io.BytesIO:
        """Download file content to memory."""
        response = requests.get(download_url, stream=True)
        response.raise_for_status()

        buffer = io.BytesIO()
        for chunk in response.iter_content(chunk_size=8192):
            buffer.write(chunk)
        buffer.seek(0)
        return buffer


class GeminiUploader:
    """Upload files to Gemini Vector Store."""

    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def create_store(self, store_name: str) -> str:
        """Create a new vector store."""
        logger.info(f"Creating vector store: {store_name}")
        store = self.client.file_search_stores.create(
            config={"display_name": store_name}
        )
        logger.info(f"Created store: {store.name}")
        return store.name

    def get_or_create_store(self, store_name: str) -> str:
        """Get existing store or create new one."""
        # List existing stores
        stores = self.client.file_search_stores.list()
        for store in stores:
            if store.display_name == store_name:
                logger.info(f"Using existing store: {store.name}")
                return store.name

        return self.create_store(store_name)

    def upload_file(
        self,
        store_name: str,
        file_content: io.BytesIO,
        file_name: str,
        source_url: str,
        source_path: str,
    ) -> bool:
        """Upload a file to the vector store with metadata."""
        try:
            # Write to temp file (Gemini SDK requires file path)
            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=os.path.splitext(file_name)[1],
            ) as tmp:
                tmp.write(file_content.read())
                tmp_path = tmp.name

            try:
                self.client.file_search_stores.upload_to_file_search_store(
                    file=tmp_path,
                    file_search_store_name=store_name,
                    config={
                        "display_name": file_name,
                        "custom_metadata": [
                            {"key": "source_url", "string_value": source_url},
                            {"key": "source_path", "string_value": source_path},
                        ],
                    },
                )
                return True
            finally:
                os.unlink(tmp_path)

        except Exception as e:
            logger.error(f"Error uploading {file_name}: {e}")
            return False


async def sync(
    sharepoint_client: SharePointClient,
    gemini_uploader: GeminiUploader,
    progress_tracker: ProgressTracker,
    file_mapping_store: FileMappingStore,
    site_id: str,
    drive_name: str,
    folder_path: str | None,
    store_name: str,
    batch_size: int = 100,
):
    """Main sync function."""
    # Get or create vector store
    vector_store_name = gemini_uploader.get_or_create_store(store_name)

    # Load progress and existing mappings
    progress = progress_tracker.load(vector_store_name)
    file_mapping_store.load()

    # Count files first
    logger.info("Counting files...")
    files: list[SharePointFile] = []
    async for file in sharepoint_client.list_files(site_id, drive_name, folder_path):
        files.append(file)

    progress.total_files = len(files)
    logger.info(f"Found {len(files)} files to process")

    # Upload files
    for i, file in enumerate(files, 1):
        # Always add to mapping (even if already uploaded to Gemini)
        file_mapping_store.add(file.name, file.path, file.web_url)

        # Skip Gemini upload if already uploaded
        if progress_tracker.is_uploaded(file.content_hash):
            logger.info(f"[{i}/{len(files)}] Skipping (already uploaded): {file.name}")
            continue

        logger.info(f"[{i}/{len(files)}] Uploading: {file.path}")

        try:
            # Download from SharePoint
            content = sharepoint_client.download_file(file.download_url)

            # Upload to Gemini
            success = gemini_uploader.upload_file(
                store_name=vector_store_name,
                file_content=content,
                file_name=file.name,
                source_url=file.web_url,
                source_path=file.path,
            )

            if success:
                progress_tracker.mark_uploaded(file.content_hash)
            else:
                progress_tracker.mark_failed(file.path)

        except Exception as e:
            logger.error(f"Error processing {file.path}: {e}")
            progress_tracker.mark_failed(file.path)

        # Save progress periodically
        if i % batch_size == 0:
            progress_tracker.save()
            file_mapping_store.save()
            logger.info(f"Progress saved: {progress.uploaded_files}/{progress.total_files}")

    # Final save
    progress_tracker.save()
    file_mapping_store.save()

    logger.info(f"\nSync complete!")
    logger.info(f"  Uploaded: {progress.uploaded_files}")
    logger.info(f"  Failed: {len(progress.failed_files)}")
    logger.info(f"  Mappings: {len(file_mapping_store.mappings)}")
    logger.info(f"  Store name: {vector_store_name}")

    if progress.failed_files:
        logger.warning("Failed files:")
        for f in progress.failed_files[:10]:
            logger.warning(f"  - {f}")
        if len(progress.failed_files) > 10:
            logger.warning(f"  ... and {len(progress.failed_files) - 10} more")


def main():
    parser = argparse.ArgumentParser(
        description="Sync SharePoint documents to Gemini Vector Store"
    )
    parser.add_argument(
        "--site-url",
        type=str,
        help="SharePoint site URL (e.g., https://company.sharepoint.com/sites/MySite)",
    )
    parser.add_argument(
        "--site-id",
        type=str,
        help="SharePoint site ID (alternative to --site-url)",
    )
    parser.add_argument(
        "--drive-name",
        type=str,
        default="Documents",
        help="Document library name (default: Documents)",
    )
    parser.add_argument(
        "--folder-path",
        type=str,
        help="Subfolder path within the document library (optional)",
    )
    parser.add_argument(
        "--store-name",
        type=str,
        default="atlas-store",
        help="Gemini vector store name (default: atlas-store)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Save progress every N files (default: 100)",
    )
    args = parser.parse_args()

    # Validate environment
    required_env = [
        "MICROSOFT_TENANT_ID",
        "MICROSOFT_CLIENT_ID",
        "MICROSOFT_CLIENT_SECRET",
        "GEMINI_API_KEY",
    ]
    missing = [e for e in required_env if not os.environ.get(e)]
    if missing:
        logger.error(f"Missing environment variables: {', '.join(missing)}")
        sys.exit(1)

    if not args.site_url and not args.site_id:
        logger.error("Either --site-url or --site-id is required")
        sys.exit(1)

    # Initialize clients
    sharepoint = SharePointClient(
        tenant_id=os.environ["MICROSOFT_TENANT_ID"],
        client_id=os.environ["MICROSOFT_CLIENT_ID"],
        client_secret=os.environ["MICROSOFT_CLIENT_SECRET"],
    )

    gemini = GeminiUploader(api_key=os.environ["GEMINI_API_KEY"])

    bucket = os.environ.get("PROGRESS_BUCKET")

    progress = ProgressTracker(
        bucket=bucket,
        key=f"sharepoint-sync/{args.store_name}/progress.json",
    )

    file_mapping = FileMappingStore(
        bucket=bucket,
        key=f"sharepoint-sync/{args.store_name}/file-mapping.json",
    )

    # Get site ID if URL provided
    import asyncio

    async def run():
        site_id = args.site_id
        if args.site_url:
            site_id = await sharepoint.get_site_id(args.site_url)
            logger.info(f"Resolved site ID: {site_id}")

        await sync(
            sharepoint_client=sharepoint,
            gemini_uploader=gemini,
            progress_tracker=progress,
            file_mapping_store=file_mapping,
            site_id=site_id,
            drive_name=args.drive_name,
            folder_path=args.folder_path,
            store_name=args.store_name,
            batch_size=args.batch_size,
        )

    asyncio.run(run())


if __name__ == "__main__":
    main()
