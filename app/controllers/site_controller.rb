class SiteController < ApplicationController
  protect_from_forgery with: :null_session

  def index
    
  end

  def download_all
    params = self.params.permit(:maven_url, :token, request_paths: []) do |p|
      p.require([:maven_url, :token, :request_paths])
    end

    maven_url = params.fetch(:maven_url)
    token = params.fetch(:token)
    request_paths = params.fetch(:request_paths)

    output_dir = Rails.root.join("tmp", "bundles", SecureRandom.uuid).to_s

    FileUtils.mkdir_p(output_dir)

    segments = request_paths.each_slice(5)

    segments.each_with_index do |paths, idx|
      DownloadArtifactsJob.perform_later(token: token, segment: idx, output_root_dir: output_dir, maven_url: maven_url, request_paths: paths)
    end

    render(status: :ok, json: { segment_size: segments.size, output_dir: output_dir })
  end
end