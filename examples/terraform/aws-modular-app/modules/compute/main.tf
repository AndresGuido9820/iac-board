resource "aws_iam_role" "lambda_exec" {
  name               = "lambda-exec"
  assume_role_policy = "{}"
}

resource "aws_lambda_function" "api" {
  function_name     = "api-handler"
  role              = aws_iam_role.lambda_exec.arn
  subnet_id         = aws_subnet.private.id
  security_group_id = aws_security_group.lambda.id
  table_name        = aws_dynamodb_table.sessions.name
  queue_url         = aws_sqs_queue.jobs.url
}

resource "aws_lambda_function" "worker" {
  function_name = "job-worker"
  role          = aws_iam_role.lambda_exec.arn
  bucket        = aws_s3_bucket.uploads.bucket
}

resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name    = aws_lambda_function.worker.arn
}

resource "aws_api_gateway_rest_api" "gateway" {
  name            = "app-gateway"
  integration_uri = aws_lambda_function.api.invoke_arn
}
