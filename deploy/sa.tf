locals {
  service_account_name_prefix = "parks-api-sa"
}

resource "yandex_iam_service_account" "parks_api_sa" {
  name        = "${local.service_account_name_prefix}-${local.folder_id}"
  description = "Service account to call parks-api-container and parks-database"
}

resource "yandex_iam_service_account_static_access_key" "parks_api_sa_static_key" {
  service_account_id = yandex_iam_service_account.parks_api_sa.id
}

output "parks_api_sa_id" {
  value = yandex_iam_service_account.parks_api_sa.id
}
