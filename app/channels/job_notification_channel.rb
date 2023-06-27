class JobNotificationChannel < ApplicationCable::Channel
  def subscribed
    stream_from "job_notification"
  end
end