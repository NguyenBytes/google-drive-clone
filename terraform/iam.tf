# IAM group for people who administer file metadata in DynamoDB.
resource "aws_iam_group" "file_metadata_managers" {
  name = "google-drive-clone-file-metadata-managers"
}

# Keep group access limited to the application's DynamoDB table.
data "aws_iam_policy_document" "file_metadata_access" {
  statement {
    sid = "ManageFileMetadata"

    actions = [
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
    ]

    resources = [aws_dynamodb_table.files.arn]
  }
}

resource "aws_iam_group_policy" "file_metadata_access" {
  name   = "google-drive-clone-file-metadata-access"
  group  = aws_iam_group.file_metadata_managers.name
  policy = data.aws_iam_policy_document.file_metadata_access.json
}

# Attach this role to the EC2 instance that runs the Express server. The AWS SDK
# automatically retrieves its short-lived credentials from the instance profile;
# do not configure static AWS keys in the server container.
data "aws_iam_policy_document" "express_server_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "express_server" {
  name               = "google-drive-clone-express-server"
  assume_role_policy = data.aws_iam_policy_document.express_server_assume_role.json
}

data "aws_iam_policy_document" "express_server_access" {
  statement {
    sid = "ListApplicationFiles"

    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
    ]

    resources = [aws_s3_bucket.files.arn]
  }

  statement {
    sid = "ManageApplicationFiles"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = ["${aws_s3_bucket.files.arn}/*"]
  }

  # Reserved for the API's file-metadata implementation.
  statement {
    sid = "ManageFileMetadata"

    actions = [
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
    ]

    resources = [aws_dynamodb_table.files.arn]
  }
}

resource "aws_iam_role_policy" "express_server_access" {
  name   = "google-drive-clone-express-server-access"
  role   = aws_iam_role.express_server.id
  policy = data.aws_iam_policy_document.express_server_access.json
}

resource "aws_iam_instance_profile" "express_server" {
  name = "google-drive-clone-express-server"
  role = aws_iam_role.express_server.name
}

output "file_metadata_managers_group_name" {
  description = "IAM group to which file-metadata administrators can be added."
  value       = aws_iam_group.file_metadata_managers.name
}

output "express_server_role_arn" {
  description = "Attach this role to the EC2 instance that runs the Express server."
  value       = aws_iam_role.express_server.arn
}

output "express_server_instance_profile_name" {
  description = "EC2 instance profile containing the Express server role."
  value       = aws_iam_instance_profile.express_server.name
}
