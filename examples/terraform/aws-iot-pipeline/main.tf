resource "aws_iot_topic_rule" "telemetry_ingest" {
  name           = "telemetry-ingest"
  kinesis_stream = aws_kinesis_stream.telemetry_events.arn
}

resource "aws_kinesis_stream" "telemetry_events" {
  name        = "telemetry-events"
  shard_count = 1
}

resource "aws_lambda_event_source_mapping" "kinesis_trigger" {
  event_source_arn  = aws_kinesis_stream.telemetry_events.arn
  function_name     = aws_lambda_function.normalizer.arn
  starting_position = "LATEST"
}

resource "aws_lambda_function" "normalizer" {
  function_name = "telemetry-normalizer"
  output_bucket = aws_s3_bucket.data_lake.bucket
  glue_database = aws_glue_catalog_database.telemetry_catalog.name
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "iac-board-telemetry-lake"
}

resource "aws_glue_catalog_database" "telemetry_catalog" {
  name = "telemetry_catalog"
}

resource "aws_athena_workgroup" "analytics" {
  name                  = "telemetry-analytics"
  glue_catalog_database = aws_glue_catalog_database.telemetry_catalog.name
}
