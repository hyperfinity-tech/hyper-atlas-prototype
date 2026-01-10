#!/usr/bin/env python3
"""
Upload files to Google Gemini File Search Store.

Usage:
    python upload_files.py <folder_path> [--store-name <name>]

Example:
    python upload_files.py ./documents --store-name my-knowledge-base
"""

import argparse
import os
import sys
from pathlib import Path

from google import genai

# Supported file extensions (Gemini supports 150+ file types)
SUPPORTED_EXTENSIONS = {
    # Documents
    ".pdf", ".doc", ".docx", ".txt", ".md", ".rtf",
    # Spreadsheets
    ".xls", ".xlsx", ".csv",
    # Presentations
    ".ppt", ".pptx",
    # Code
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".h",
    ".cs", ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".scala",
    ".html", ".css", ".scss", ".json", ".xml", ".yaml", ".yml",
    # Other text
    ".log", ".ini", ".cfg", ".conf",
}


def get_files_recursive(folder_path: Path) -> list[Path]:
    """Recursively find all supported files in a folder."""
    files = []
    for path in folder_path.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(path)
    return files


def create_store(client: genai.Client, store_name: str) -> str:
    """Create a new File Search Store and return its name."""
    print(f"Creating File Search Store: {store_name}")
    store = client.file_search_stores.create(
        config={"display_name": store_name}
    )
    print(f"Created store: {store.name}")
    return store.name


def upload_file(client: genai.Client, store_name: str, file_path: Path) -> bool:
    """Upload a single file to the File Search Store."""
    try:
        client.file_search_stores.upload_to_file_search_store(
            file=str(file_path),
            file_search_store_name=store_name,
            config={"display_name": file_path.name},
        )
        return True
    except Exception as e:
        print(f"  Error uploading {file_path.name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Upload files to Google Gemini File Search Store"
    )
    parser.add_argument(
        "folder_path",
        type=str,
        help="Path to folder containing files to upload",
    )
    parser.add_argument(
        "--store-name",
        type=str,
        default="atlas-store",
        help="Name for the File Search Store (default: atlas-store)",
    )
    args = parser.parse_args()

    folder_path = Path(args.folder_path)
    if not folder_path.exists():
        print(f"Error: Folder not found: {folder_path}")
        sys.exit(1)

    if not folder_path.is_dir():
        print(f"Error: Path is not a directory: {folder_path}")
        sys.exit(1)

    # Check for API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        sys.exit(1)

    # Initialize client
    client = genai.Client(api_key=api_key)

    # Find files
    files = get_files_recursive(folder_path)
    if not files:
        print(f"No supported files found in {folder_path}")
        sys.exit(0)

    print(f"Found {len(files)} files to upload")

    # Create store
    store_name = create_store(client, args.store_name)

    # Upload files
    success_count = 0
    for i, file_path in enumerate(files, 1):
        print(f"[{i}/{len(files)}] Uploading: {file_path.name}")
        if upload_file(client, store_name, file_path):
            success_count += 1

    print(f"\nUpload complete: {success_count}/{len(files)} files uploaded successfully")
    print(f"\nStore name for .env.local:")
    print(f"FILE_SEARCH_STORE_NAME={store_name}")


if __name__ == "__main__":
    main()
