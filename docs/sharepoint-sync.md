# SharePoint to Gemini Sync

This document describes how Atlas syncs documents from SharePoint to Google Gemini's Vector Store and resolves SharePoint URLs for citations.

## Overview

Atlas uses a two-part system to provide clickable SharePoint links in citations:

1. **Fargate Sync Task** - Uploads documents from SharePoint to Gemini and creates a URL mapping file
2. **File Mapping Lookup** - Resolves SharePoint URLs at query time using the mapping file

This approach is necessary because Gemini's grounding response doesn't return custom metadata - only the file title and an internal URI.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SYNC (Fargate Task)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   SharePoint ──(Graph API)──→ Fargate ──(Gemini API)──→ Vector Store│
│                                  │                                  │
│                                  └──(S3)──→ file-mapping.json       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      QUERY (Next.js App)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   User Question ──→ Gemini API ──→ Response + Citations             │
│                                           │                         │
│   S3 (file-mapping.json) ──→ resolveSharePointUrl() ──→ Citation    │
│                                                          with URL   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Sync Script (`scripts/sharepoint-sync/`)

A Python script that runs as an AWS Fargate task:

- **sync.py** - Main sync script
- **Dockerfile** - Container definition
- **requirements.txt** - Python dependencies

#### What it does:

1. Authenticates to SharePoint via Microsoft Graph API
2. Recursively lists files in a document library
3. Streams each file to Gemini Vector Store (no local download)
4. Creates a `file-mapping.json` with SharePoint URLs
5. Tracks progress in S3 for resumption

#### File Mapping Structure:

```json
{
  "Commercial Roadmap/Solutions Brief.pdf": {
    "fileName": "Solutions Brief.pdf",
    "sourcePath": "Commercial Roadmap/Solutions Brief.pdf",
    "sharePointUrl": "https://company.sharepoint.com/:b:/r/sites/..."
  }
}
```

### 2. File Mapping Utility (`src/lib/fileMapping.ts`)

A Next.js utility that resolves SharePoint URLs:

```typescript
import { resolveSharePointUrl } from "@/lib/fileMapping";

// Returns the SharePoint URL for a file, or undefined if not found
const url = await resolveSharePointUrl("Solutions Brief.pdf");
```

Features:
- Loads mapping from S3 with 5-minute caching
- Multiple matching strategies (exact path, fileName, partial match)
- Graceful fallback if mapping not available

### 3. Chat API Integration (`src/app/api/chat/route.ts`)

The chat API automatically resolves SharePoint URLs for citations:

1. Gemini returns citations with `sourceTitle` (file name)
2. `resolveSharePointUrl()` looks up the SharePoint URL
3. Citation is returned with `sourceUri` set to the SharePoint URL
4. If no mapping found, falls back to Gemini's internal URI

## Setup

### Prerequisites

1. **Entra ID App Registration** (in Microsoft 365)
   - Create app with `Sites.Read.All` permission
   - Note the tenant ID, client ID, and client secret

2. **AWS Resources**
   - S3 bucket for file mapping and progress tracking
   - ECR repository for the Docker image
   - ECS cluster with Fargate
   - IAM roles for task execution

3. **Environment Variables**

   For the Fargate task:
   ```bash
   MICROSOFT_TENANT_ID=your-tenant-id
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   GEMINI_API_KEY=your-gemini-key
   PROGRESS_BUCKET=your-s3-bucket
   ```

   For the Next.js app (`.env.local`):
   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   FILE_MAPPING_BUCKET=your-s3-bucket
   FILE_MAPPING_KEY=sharepoint-sync/atlas-store/file-mapping.json
   ```

### Running the Sync

#### Local Testing

```bash
cd scripts/sharepoint-sync
pip install -r requirements.txt

export MICROSOFT_TENANT_ID="..."
export MICROSOFT_CLIENT_ID="..."
export MICROSOFT_CLIENT_SECRET="..."
export GEMINI_API_KEY="..."

python sync.py \
  --site-url "https://company.sharepoint.com/sites/MySite" \
  --drive-name "Shared Documents" \
  --store-name "atlas-store"
```

#### Fargate Deployment

1. Build and push Docker image:
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker build -t sharepoint-sync scripts/sharepoint-sync/
   docker tag sharepoint-sync:latest <account>.dkr.ecr.<region>.amazonaws.com/sharepoint-sync:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/sharepoint-sync:latest
   ```

2. Run the task:
   ```bash
   aws ecs run-task \
     --cluster your-cluster \
     --task-definition sharepoint-sync \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

See `scripts/sharepoint-sync/README.md` for the full CloudFormation template.

## How Citations Work

1. User asks a question
2. Gemini searches the vector store and returns grounded response
3. Grounding metadata includes `groundingChunks` with:
   - `title` - The file's display name (set during upload)
   - `uri` - Gemini's internal file URI
   - `text` - The relevant chunk text

4. Chat API calls `resolveSharePointUrl(title)` for each citation
5. If found in mapping, `sourceUri` is set to the SharePoint URL
6. Citation component displays clickable "View source" link

## Troubleshooting

### Citations don't have SharePoint links

1. Check that `FILE_MAPPING_BUCKET` is set in environment
2. Verify the mapping file exists in S3
3. Check CloudWatch logs for S3 access errors
4. Ensure file names in mapping match Gemini's `sourceTitle`

### Sync fails to authenticate to SharePoint

1. Verify Entra ID app has `Sites.Read.All` permission
2. Check that admin consent was granted
3. Verify tenant ID, client ID, and secret are correct

### Sync is slow

1. Increase Fargate task CPU/memory
2. Check network configuration (needs internet access)
3. Consider running during off-peak hours

## File Reference

| File | Purpose |
|------|---------|
| `scripts/sharepoint-sync/sync.py` | Main sync script |
| `scripts/sharepoint-sync/Dockerfile` | Container definition |
| `scripts/sharepoint-sync/requirements.txt` | Python dependencies |
| `scripts/sharepoint-sync/README.md` | Detailed setup instructions |
| `src/lib/fileMapping.ts` | SharePoint URL resolution |
| `src/app/api/chat/route.ts` | Chat API with citation resolution |
