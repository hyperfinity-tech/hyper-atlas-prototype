# SharePoint to Gemini Sync

Syncs documents from SharePoint to Google Gemini Vector Store for RAG.

## How It Works

1. Authenticates to SharePoint via Microsoft Graph API
2. Lists all files in a document library (recursively)
3. Streams each file directly to Gemini Vector Store
4. Stores the SharePoint `webUrl` as metadata for clickable citations
5. Tracks progress in S3 for resumption if interrupted

## Prerequisites

### 1. Entra ID App Registration

Create an app registration in your Microsoft 365 tenant (not Azure):

1. Go to [Entra ID Admin Center](https://entra.microsoft.com)
2. Navigate to **Applications** → **App registrations** → **New registration**
3. Name it something like `atlas-sharepoint-sync`
4. Under **API permissions**, add:
   - `Microsoft Graph` → `Sites.Read.All` (Application permission)
5. Grant admin consent for the permissions
6. Under **Certificates & secrets**, create a new client secret
7. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**
   - **Client secret value**

### 2. AWS Resources

You'll need these AWS resources (CloudFormation template notes below):

- **ECR Repository** - to store the Docker image
- **ECS Cluster** - Fargate cluster to run the task
- **ECS Task Definition** - defines the container and secrets
- **Secrets Manager** - stores credentials
- **S3 Bucket** - for progress tracking (optional)
- **IAM Roles** - task execution and task roles

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MICROSOFT_TENANT_ID` | Entra ID tenant ID |
| `MICROSOFT_CLIENT_ID` | App registration client ID |
| `MICROSOFT_CLIENT_SECRET` | App registration client secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PROGRESS_BUCKET` | S3 bucket for progress tracking (optional) |

## Usage

### Local Testing

```bash
cd scripts/sharepoint-sync

# Set environment variables
export MICROSOFT_TENANT_ID="your-tenant-id"
export MICROSOFT_CLIENT_ID="your-client-id"
export MICROSOFT_CLIENT_SECRET="your-secret"
export GEMINI_API_KEY="your-gemini-key"

# Run sync
python sync.py \
  --site-url "https://methodanalyticscom.sharepoint.com/sites/HyperDrive" \
  --drive-name "Shared Documents" \
  --folder-path "Commercial Roadmap" \
  --store-name "atlas-store"
```

### Docker

```bash
# Build
docker build -t sharepoint-sync .

# Run
docker run --rm \
  -e MICROSOFT_TENANT_ID \
  -e MICROSOFT_CLIENT_ID \
  -e MICROSOFT_CLIENT_SECRET \
  -e GEMINI_API_KEY \
  sharepoint-sync \
  --site-url "https://methodanalyticscom.sharepoint.com/sites/HyperDrive" \
  --store-name "atlas-store"
```

### Fargate

Run as an ECS Fargate task (see CloudFormation notes below).

## CloudFormation Resources

Here's what you'll need in your CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: SharePoint to Gemini Sync Fargate Task

Parameters:
  Environment:
    Type: String
    Default: prod

Resources:
  # ECR Repository
  ECRRepository:
    Type: AWS::ECR::Repository
    Properties:
      RepositoryName: sharepoint-sync
      ImageScanningConfiguration:
        ScanOnPush: true

  # Secrets
  MicrosoftCredentials:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub ${Environment}/sharepoint-sync/microsoft
      SecretString: !Sub |
        {
          "tenant_id": "REPLACE_ME",
          "client_id": "REPLACE_ME",
          "client_secret": "REPLACE_ME"
        }

  GeminiApiKey:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: !Sub ${Environment}/sharepoint-sync/gemini
      SecretString: '{"api_key": "REPLACE_ME"}'

  # S3 Bucket for progress tracking
  ProgressBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub ${Environment}-sharepoint-sync-progress
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256

  # ECS Cluster
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub ${Environment}-sharepoint-sync
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT

  # Task Execution Role (for pulling images and secrets)
  TaskExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${Environment}-sharepoint-sync-execution
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: SecretsAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource:
                  - !Ref MicrosoftCredentials
                  - !Ref GeminiApiKey

  # Task Role (for S3 access during runtime)
  TaskRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub ${Environment}-sharepoint-sync-task
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ecs-tasks.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: S3Access
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - s3:GetObject
                  - s3:PutObject
                Resource: !Sub ${ProgressBucket.Arn}/*

  # Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: sharepoint-sync
      Cpu: '1024'
      Memory: '2048'
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      ExecutionRoleArn: !GetAtt TaskExecutionRole.Arn
      TaskRoleArn: !GetAtt TaskRole.Arn
      ContainerDefinitions:
        - Name: sharepoint-sync
          Image: !Sub ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/sharepoint-sync:latest
          Essential: true
          Command:
            - --site-url
            - https://methodanalyticscom.sharepoint.com/sites/HyperDrive
            - --drive-name
            - Shared Documents
            - --store-name
            - atlas-store
          Environment:
            - Name: PROGRESS_BUCKET
              Value: !Ref ProgressBucket
          Secrets:
            - Name: MICROSOFT_TENANT_ID
              ValueFrom: !Sub ${MicrosoftCredentials}:tenant_id::
            - Name: MICROSOFT_CLIENT_ID
              ValueFrom: !Sub ${MicrosoftCredentials}:client_id::
            - Name: MICROSOFT_CLIENT_SECRET
              ValueFrom: !Sub ${MicrosoftCredentials}:client_secret::
            - Name: GEMINI_API_KEY
              ValueFrom: !Sub ${GeminiApiKey}:api_key::
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Ref LogGroup
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: sync

  LogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub /ecs/${Environment}-sharepoint-sync
      RetentionInDays: 30

Outputs:
  ECRRepositoryUri:
    Value: !Sub ${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/sharepoint-sync
    Description: ECR repository URI for pushing images

  ClusterName:
    Value: !Ref ECSCluster
    Description: ECS cluster name for running tasks

  TaskDefinitionArn:
    Value: !Ref TaskDefinition
    Description: Task definition ARN for running the sync
```

## Running the Fargate Task

After deploying the CloudFormation stack:

```bash
# Push Docker image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker build -t sharepoint-sync .
docker tag sharepoint-sync:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/sharepoint-sync:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sharepoint-sync:latest

# Run the task
aws ecs run-task \
  --cluster prod-sharepoint-sync \
  --task-definition sharepoint-sync \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

## Using Citations in the App

The sync creates a **file mapping** in S3 that maps file names/paths to SharePoint URLs. This is necessary because Gemini's grounding response doesn't include custom metadata.

### How It Works

1. During sync, a `file-mapping.json` is uploaded to S3:
   ```json
   {
     "Commercial Roadmap/Solutions Brief.pdf": {
       "fileName": "Solutions Brief.pdf",
       "sourcePath": "Commercial Roadmap/Solutions Brief.pdf",
       "sharePointUrl": "https://company.sharepoint.com/:b:/r/sites/..."
     }
   }
   ```

2. The Next.js app loads this mapping and resolves URLs when displaying citations.

### Next.js App Configuration

Add these environment variables to your `.env.local`:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
FILE_MAPPING_BUCKET=your-bucket-name
FILE_MAPPING_KEY=sharepoint-sync/atlas-store/file-mapping.json
```

The chat API route automatically resolves SharePoint URLs for citations using `src/lib/fileMapping.ts`. The Citation component already handles displaying clickable links via `citation.sourceUri`.
