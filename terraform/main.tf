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
