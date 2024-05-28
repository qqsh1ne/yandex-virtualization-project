locals {
  api_gateway_name = "parks-api-gateway"
}

resource "yandex_api_gateway" "parks_api_gateway" {
  name      = local.api_gateway_name
  folder_id = local.folder_id
  spec      = file("../openapi/api.yaml")
}

output "parks_api_gateway_domain" {
  value = "https://${yandex_api_gateway.parks_api_gateway.domain}"
}
