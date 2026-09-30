# ECR provides a registry per AWS account and region. Use the project name
# as a namespace for the frontend and server repositories in that registry.
resource "aws_ecr_repository" "frontend" {
  name = "google-drive-clone/frontend"

  tags = {
    Name = "google-drive-clone/frontend"
  }
}

resource "aws_ecr_repository" "server" {
  name = "google-drive-clone/server"

  tags = {
    Name = "google-drive-clone/server"
  }
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for pushing frontend and server images."
  value = {
    frontend = aws_ecr_repository.frontend.repository_url
    server   = aws_ecr_repository.server.repository_url
  }
}
