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

output "file_metadata_managers_group_name" {
  description = "IAM group to which file-metadata administrators can be added."
  value       = aws_iam_group.file_metadata_managers.name
}
