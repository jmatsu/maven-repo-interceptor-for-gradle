class ReposController < ApplicationController
  def index
    head(:ok)
  end

  def show
    _repos, _empty, *paths, module_name, version, _pom = request.path.split("/")
    group_name = paths.join(".")

    payload = {
      request_path: request.path,
      group_name: group_name,
      module_name: module_name,
      version: version
    }

    ActionCable.server.broadcast("incoming_repos", payload)

    head(:not_found)
  end
end