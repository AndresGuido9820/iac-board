resource "aws_iot_topic_rule" "telemetry_ingest" {
  name = "telemetry-ingest"
}

resource "aws_kinesis_stream" "telemetry_events" {
  name = "telemetry-events"
}

resource "aws_lambda_function" "normalizer" {
  function_name = "telemetry-normalizer"
}

resource "aws_s3_bucket" "data_lake" {
  bucket = "iac-board-telemetry-lake"
}

resource "aws_glue_catalog_database" "telemetry_catalog" {
  name = "telemetry_catalog"
}

resource "aws_athena_workgroup" "analytics" {
  name = "telemetry-analytics"
}
