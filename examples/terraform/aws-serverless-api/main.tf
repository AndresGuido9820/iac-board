resource "aws_api_gateway_rest_api" "public_api" {
  name = "public-api"
}

resource "aws_lambda_function" "handler" {
  function_name = "handler"
}

resource "aws_dynamodb_table" "sessions" {
  name = "sessions"
}

