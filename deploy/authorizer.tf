locals {
  authorizer_function_name = "authorizer"
}

resource yandex_function authorizer {
  name               = local.authorizer_function_name
  user_hash          = uuid()
  folder_id          = local.folder_id
  description        = "Авторизация"
  runtime            = "nodejs16-preview"
  entrypoint         = "authorizer.handler"
  memory             = 256
  execution_timeout  = 300
  content {
    zip_filename = "../dist/authorizer.zip"
  }
  service_account_id = yandex_iam_service_account.parks_api_sa.id
  environment        = {
    JWKS_URI     = "https://dev-tashwggb.us.auth0.com/.well-known/jwks.json"
    AUDIENCE     = "https://parks-api"
    TOKEN_ISSUER = "https://dev-tashwggb.us.auth0.com/"
  }
}

output authorizer_function_id {
  value = yandex_function.authorizer.id
}
