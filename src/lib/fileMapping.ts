import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

interface FileMapping {
  fileName: string;
  sourcePath: string;
  sharePointUrl: string;
}

type FileMappings = Record<string, FileMapping>;

let cachedMappings: FileMappings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load file mappings from S3.
 * Caches the result for 5 minutes to avoid repeated S3 calls.
 */
async function loadMappings(): Promise<FileMappings> {
  const now = Date.now();

  // Return cached mappings if still valid
  if (cachedMappings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMappings;
  }

  const bucket = process.env.FILE_MAPPING_BUCKET;
  const key = process.env.FILE_MAPPING_KEY || "sharepoint-sync/atlas-store/file-mapping.json";

  if (!bucket) {
    console.warn("FILE_MAPPING_BUCKET not set, SharePoint URLs will not be resolved");
    return {};
  }

  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
    });

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const body = await response.Body?.transformToString();
    if (!body) {
      console.warn("Empty file mapping response from S3");
      return {};
    }

    cachedMappings = JSON.parse(body) as FileMappings;
    cacheTimestamp = now;

    console.log(`Loaded ${Object.keys(cachedMappings).length} file mappings from S3`);
    return cachedMappings;
  } catch (error) {
    console.error("Failed to load file mappings from S3:", error);
    return cachedMappings || {};
  }
}

/**
 * Look up the SharePoint URL for a file by its title/name.
 * Tries multiple matching strategies:
 * 1. Exact match on sourcePath
 * 2. Match by fileName
 * 3. Partial match on title
 */
export async function resolveSharePointUrl(
  title: string | undefined
): Promise<string | undefined> {
  if (!title) return undefined;

  const mappings = await loadMappings();

  // Strategy 1: Direct key lookup (title might be the full path)
  if (mappings[title]) {
    return mappings[title].sharePointUrl;
  }

  // Strategy 2: Search by fileName
  for (const mapping of Object.values(mappings)) {
    if (mapping.fileName === title) {
      return mapping.sharePointUrl;
    }
  }

  // Strategy 3: Partial match (title contains fileName or vice versa)
  for (const mapping of Object.values(mappings)) {
    const fileNameWithoutExt = mapping.fileName.replace(/\.[^/.]+$/, "");
    if (
      title.includes(mapping.fileName) ||
      title.includes(fileNameWithoutExt) ||
      mapping.fileName.includes(title)
    ) {
      return mapping.sharePointUrl;
    }
  }

  return undefined;
}

/**
 * Resolve SharePoint URLs for multiple citations.
 * Returns a map of title -> sharePointUrl.
 */
export async function resolveSharePointUrls(
  titles: (string | undefined)[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const mappings = await loadMappings();

  for (const title of titles) {
    if (!title) continue;

    const url = await resolveSharePointUrl(title);
    if (url) {
      result.set(title, url);
    }
  }

  return result;
}

/**
 * Force refresh the mappings cache.
 * Call this if you know the mappings have been updated.
 */
export function invalidateMappingsCache(): void {
  cachedMappings = null;
  cacheTimestamp = 0;
}
