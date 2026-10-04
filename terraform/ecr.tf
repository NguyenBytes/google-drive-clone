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

# Count tagged builds rather than their untagged platform/provenance manifests.
resource "aws_ecr_lifecycle_policy" "application_images" {
  for_each = {
    frontend = aws_ecr_repository.frontend.name
    server   = aws_ecr_repository.server.name
  }

  repository = each.value
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the 10 most recent tagged builds"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Clean up untagged images after one day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for pushing frontend and server images."
  value = {
    frontend = aws_ecr_repository.frontend.repository_url
    server   = aws_ecr_repository.server.repository_url
  }
}
