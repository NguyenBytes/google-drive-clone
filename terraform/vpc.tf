# VPC: the private network that contains all application resources.
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/24"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "google-drive-clone-vpc"
  }
}

# Internet gateway: allows the public subnet to communicate with the internet.
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "google-drive-clone-igw"
  }
}

# Public subnet: the first half of the VPC address range.
# Resources launched here can receive public IPv4 addresses.
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/25"
  map_public_ip_on_launch = true

  tags = {
    Name = "google-drive-clone-public-subnet"
  }
}

# Private subnet: the second half of the VPC address range.
# Resources here do not receive public IPv4 addresses.
resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.0.128/25"

  tags = {
    Name = "google-drive-clone-private-subnet"
  }
}

# Private route table: keeps private-subnet traffic inside the VPC,
# except for the S3 and DynamoDB endpoint routes added below.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "google-drive-clone-private-routes"
  }
}

# Associates the private subnet with its private route table.
resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# Public route table: sends internet-bound traffic through the internet gateway.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "google-drive-clone-public-routes"
  }
}

# Associates the public subnet with the route table that has internet access.
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Reads the configured AWS region to construct regional endpoint service names.
data "aws_region" "current" {}

# S3 gateway endpoint: lets private resources reach S3 without a NAT Gateway
# or a public IP address. Gateway endpoints have no hourly charge.
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "google-drive-clone-s3-endpoint"
  }
}

# DynamoDB gateway endpoint: lets private resources reach DynamoDB without a
# NAT Gateway or a public IP address. Gateway endpoints have no hourly charge.
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "google-drive-clone-dynamodb-endpoint"
  }
}
