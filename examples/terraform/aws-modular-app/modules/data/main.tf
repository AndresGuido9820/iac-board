resource "aws_dynamodb_table" "sessions" {
  name         = "sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
}

resource "aws_s3_bucket" "uploads" {
  bucket = "app-uploads"
}

resource "aws_sqs_queue" "jobs" {
  name = "background-jobs"
}
