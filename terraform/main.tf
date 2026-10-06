resource "aws_s3_bucket" "files" {
  bucket = "google-drive-clone-app-bucket"

  tags = {
    Name = "google-drive-clone-app-bucket"
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

  # Cognito sends a confirmation code to the email supplied at sign-up.
  auto_verified_attributes = ["email"]

  tags = {
    Name = "google-drive-clone-users"
  }
}

data "aws_caller_identity" "current" {}

# Include the AWS account ID to avoid collisions with other projects' domains.
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "google-drive-clone-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

#random cmment to set
resource "aws_cognito_user_group" "users" {
  name         = "users"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Default group for Google Drive Clone application users."
  precedence   = 1
}

# Public browser client for Amplify's native username/password authentication.
# Browser clients must not have a client secret because it cannot be kept private.
resource "aws_cognito_user_pool_client" "web" {
  name         = "google-drive-clone-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  prevent_user_existence_errors = "ENABLED"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID for the Amplify frontend configuration."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_web_client_id" {
  description = "Public Cognito app-client ID for the Amplify frontend configuration."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  description = "Cognito domain hostname for VITE_COGNITO_DOMAIN."
  value       = "${aws_cognito_user_pool_domain.main.domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
}
