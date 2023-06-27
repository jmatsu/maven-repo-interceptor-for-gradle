class DownloadArtifactsJob < ApplicationJob
  class Skip < StandardError; end

  queue_as :default

  def perform(token:, segment:, output_root_dir:, maven_url:, request_paths:)
    uri = URI.parse(maven_url)
    uri.path += "/" unless maven_url.end_with?("/")

    unsupported_request_paths = []

    request_paths.each do |request_path|
      _repos, _empty, *paths, module_name, version, _pom = request_path.split("/")

      base_path = [*paths, module_name, version].join("/")

      output_dir = File.join(output_root_dir, base_path)

      FileUtils.mkdir_p(output_dir)

      filenames = %w[.pom .jar -javadoc.jar -sources.jar].map { |suffix|
        "#{module_name}-#{version}" + suffix
      }

      filenames.each_with_index do |filename, idx|
        download_file(url: maven_url + "/" + base_path + "/" + filename) do |f|
          FileUtils.mv(f.path, File.join(output_dir, filename))
        end
      rescue => e
        if e.is_a?(OpenURI::HTTPError) && e.message.include?("404")
          raise Skip, "missing required files" if idx <= 1
        else
          Rails.logger.error((e.message || "") + ":" + (e.backtrace || []).join("\n"))
        end
      end
    rescue Skip
      unsupported_request_paths.push(request_path)
    end

    ActionCable.server.broadcast(
      "job_notification",
      {
        name: "DownloadArtifactsJob",
        data: {
          token: token,
          segment: segment,
          unsupported_request_paths: unsupported_request_paths,
          downloaded_request_paths: request_paths - unsupported_request_paths
        }
      }
    )
  end

  def download_file(url:)
    temp_file = Tempfile.new
    URI.open(url, read_timeout: 20) do |file|
      temp_file.binmode
      temp_file.write(file.read)
    end
    temp_file.rewind
    yield(temp_file)
  ensure
    temp_file.close!
  end
end