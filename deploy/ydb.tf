locals {
  database_name = "parks-database"
}

resource "yandex_ydb_database_serverless" "parks_database" {
  name      = local.database_name
  folder_id = local.folder_id
}

output "parks_database_document_api_endpoint" {
  value = yandex_ydb_database_serverless.parks_database.document_api_endpoint
}

output "parks_database_path" {
  value = yandex_ydb_database_serverless.parks_database.database_path
}
