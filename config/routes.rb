Rails.application.routes.draw do
  root "site#index"

  post "/download_all" => "site#download_all"

  # Capture all requests under repo/**/*
  resources :repos, only: %i[show index], constraints: { id: /.*/ }
end
