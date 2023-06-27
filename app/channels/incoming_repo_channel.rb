class IncomingRepoChannel < ApplicationCable::Channel
  def subscribed
    stream_from "incoming_repos"
  end
end