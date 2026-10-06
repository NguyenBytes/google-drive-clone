data "archive_file" "link_google_account" {
  type        = "zip"
  source_file = "${path.module}/lambda/link_google_account.py"
  output_path = "${path.module}/.terraform/link_google_account.zip"
}

resource "aws_iam_role" "link_google_account" {
  name = "google-drive-clone-link-google-account"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "link_google_account" {
  role = aws_iam_role.link_google_account.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["cognito-idp:ListUsers", "cognito-idp:AdminLinkProviderForUser"]
      Resource = aws_cognito_user_pool.main.arn
    }]
  })
}

resource "aws_cloudwatch_log_group" "link_google_account" {
  name              = "/aws/lambda/google-drive-clone-link-google-account"
  retention_in_days = 14
}

resource "aws_iam_role_policy" "link_google_account_logs" {
  role = aws_iam_role.link_google_account.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.link_google_account.arn}:*"
    }]
  })
}

resource "aws_lambda_function" "link_google_account" {
  function_name    = "google-drive-clone-link-google-account"
  role             = aws_iam_role.link_google_account.arn
  runtime          = "python3.12"
  handler          = "link_google_account.handler"
  filename         = data.archive_file.link_google_account.output_path
  source_code_hash = data.archive_file.link_google_account.output_base64sha256
  timeout          = 5

  depends_on = [aws_iam_role_policy.link_google_account_logs]
}

resource "aws_lambda_permission" "link_google_account" {
  statement_id   = "AllowCognitoPreSignUp"
  action         = "lambda:InvokeFunction"
  function_name  = aws_lambda_function.link_google_account.function_name
  principal      = "cognito-idp.amazonaws.com"
  source_arn     = aws_cognito_user_pool.main.arn
  source_account = data.aws_caller_identity.current.account_id
}
