resource "aws_iam_role" "lambda_exec" {
  name               = "lambda-exec-role"
  assume_role_policy = "{}"
}

resource "aws_dynamodb_table" "sessions" {
  name         = "sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}

resource "aws_lambda_function" "handler" {
  function_name = "api-handler"
  role          = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.sessions.name
    }
  }
}

resource "aws_api_gateway_rest_api" "public_api" {
  name            = "public-api"
  integration_uri = aws_lambda_function.handler.invoke_arn
}
