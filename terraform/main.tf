resource "aws_s3_bucket" "files" {
  bucket_prefix = "google-drive-clone-"

  tags = {
    Name = "google-drive-clone-files"
  }
}

resource "aws_dynamodb_table" "files" {
  name         = "google-drive-clone-files"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "google-drive-clone-files"
  }
}

# Cognito user pool and its default application-user group.
resource "aws_cognito_user_pool" "main" {
  name = "google-drive-clone-users"

  tags = {
    Name = "google-drive-clone-users"
  }
}

resource "aws_cognito_user_group" "users" {
  name         = "users"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Default group for Google Drive Clone application users."
  precedence   = 1
}
