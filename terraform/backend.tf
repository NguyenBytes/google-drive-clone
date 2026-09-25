# This bucket is provisioned separately by the bootstrap configuration.
# S3-native locking avoids the need for a DynamoDB lock table.
terraform {
  backend "s3" {
    bucket       = "google-drive-clone-state"
    key          = "google-drive-clone/terraform.tfstate"
    region       = "us-west-2"
    encrypt      = true
    use_lockfile = true
  }
}
