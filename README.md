# Google Drive Clone

A learning project for a file-storage application on AWS. The repository contains a React/Vite frontend, an Express API for file operations, and Terraform infrastructure.

> The API currently stores file objects in S3. Terraform also provisions a DynamoDB table for future file-metadata use; the API does not yet read or write that table.

## Architecture

```mermaid
flowchart LR
  User[User] --> Web[React + Vite frontend]
  Web --> API[Express API]
  API --> S3[(S3 files bucket)]
  API -. future metadata .-> DDB[(DynamoDB files table)]

  subgraph AWS[Amazon Web Services — us-west-2]
    S3
    DDB
    VPC[VPC: public and private subnets]
    Endpoints[S3 and DynamoDB VPC gateway endpoints]
    VPC --- Endpoints
  end

  GitHub[GitHub Actions] -->|OIDC role| AWS
  GitHub -->|Terraform state + S3 lockfile| State[(google-drive-clone-state)]
```

## Repository layout

| Path | Purpose |
| --- | --- |
| `frontend/` | React 19 and Vite frontend (currently a starter UI). |
| `server/` | Express and TypeScript API that performs S3 file operations. |
| `terraform/` | AWS infrastructure: VPC, S3, DynamoDB, VPC endpoints, IAM group, and remote-state backend configuration. |
| `.github/workflows/terraform.yml` | Terraform CI/CD workflow. |

## API

The server listens on port `3000` by default.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Health check. |
| `GET` | `/api/v1/files?prefix=…` | List immediate files and directories under the required prefix with `key`, `name`, `isDirectory`, and file metadata. |
| `GET` | `/api/v1/files/presigned-url?key=…` | Get a presigned download URL for one object (valid for 15 minutes). |
| `GET` | `/api/v1/files/object?key=…` | Download one object. |
| `POST` | `/api/v1/files` | Upload an object; JSON body requires `key` and base64 `content`. |
| `PUT` | `/api/v1/files` | Replace an object using the same request body. |
| `DELETE` | `/api/v1/files?key=…` | Delete an object. |

The API root and health endpoint are available at `/api/v1/` and `/api/v1/health`.
Use a prefix ending in `/` to browse a directory. Directory entries appear in the
`files` array with `isDirectory: true` and a key ending in `/`; pass that key as
the next prefix to list its contents. Both empty folders and folders implied by
nested objects are included. Pagination totals count both files and directories.
For local development, the API allows requests from `http://localhost:5173`. Set `CORS_ORIGIN` on the server to a comma-separated list of allowed frontend origins when using a different host or port.

For uploads, `contentType` is optional. Example payload:

```json
{
  "key": "documents/hello.txt",
  "content": "SGVsbG8sIHdvcmxkIQ==",
  "contentType": "text/plain"
}
```

## Local development

Prerequisites: Node.js, npm, Terraform, and AWS credentials that can access the configured S3 files bucket.

```bash
# API
cd server
cp .env.example .env
# Set AWS_REGION and S3_BUCKET_NAME in .env
npm install
npm run dev
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

## Infrastructure and CI/CD

Terraform uses the separate `google-drive-clone-state` S3 bucket in `us-west-2` for remote state. It uses S3 lockfiles, so no DynamoDB lock table is needed. The state bucket must be created by a separate bootstrap process before initializing this stack.

```bash
cd terraform
terraform init -input=false
terraform plan
```

GitHub Actions runs an AWS identity check, initialization, formatting, validation, and a plan on pull requests. A push to `main` runs the same checks and then applies the approved configuration.

To enable the workflow, configure an AWS IAM role that trusts GitHub Actions through OIDC and add its ARN as the repository variable `AWS_ROLE_TO_ASSUME`. Do not store long-lived AWS access keys in the repository.

## Cost note

The DynamoDB table is configured for on-demand (`PAY_PER_REQUEST`) billing. It has no idle throughput charge, but reads, writes, storage, and any enabled optional features can incur charges. For a low-traffic learning project, only use DynamoDB once the API needs durable file metadata.
