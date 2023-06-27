require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "action_controller/railtie"
require "action_view/railtie"
require "action_cable/engine"
require "sprockets/railtie"

Bundler.require(*Rails.groups)

module GradleRepositoryInterceptor
  class Application < Rails::Application
    config.load_defaults 7.0

    config.time_zone = "UTC"
  end
end
