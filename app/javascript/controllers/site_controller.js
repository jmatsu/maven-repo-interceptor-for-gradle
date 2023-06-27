import { Controller } from "@hotwired/stimulus"
import consumer from "channels/consumer";

export default class extends Controller {
    static targets = ["output", "mavenUrl", "alert", "artifactsCount", "missingArtifactsCount", "downloadedArtifactsCount"];

    _artifacts = [];
    _waitingSegmentCount = {};

    connect() {
        consumer.subscriptions.create({ channel: "IncomingRepoChannel", room: "incoming_repos" }, {
            received: this.onRepoReceived.bind(this)
        })


        consumer.subscriptions.create({ channel: "JobNotificationChannel", room: "job_notification" }, {
            received: this.onJobReceived.bind(this)
        })
    }

    startNewSession() {
        location.reload()
    }

    async downloadAll() {
        this.artifactsCountTarget.classList.add("hidden");

        const url = this.mavenUrlTarget.value;
        const token = this.makeid(6);

        const payload = {
            token: token,
            maven_url: url,
            request_paths: this._artifacts.map((a) => a.request_path)
        }

        this._waitingSegmentCount[token] = [];

        const resp = await fetch("/download_all", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })

        const { segment_size: segmentSize, output_dir: outputDir } = await resp.json()

        this._waitingSegmentCount[token] = new Array(segmentSize);

        this.alertTarget.dataset.segmentSize = segmentSize;
        this.alertTarget.dataset.outputDir = outputDir;

        this.renderAlert(0)
    }

     onRepoReceived(data) {
        this._artifacts.push(data);

        const html = `
                  <tr data-request-path="${data["request_path"]}">
                    <td>${data["group_name"]}</td>
                    <td>${data["module_name"]}</td>
                    <td>${data["version"]}</td>
                  </tr>
                `;

         this.outputTarget.insertAdjacentHTML("beforeend", html);

         this.artifactsCountTarget.textContent = `${this._artifacts.length} artifacts.`;
    }

    onJobReceived(data) {
        if (data.name !== "DownloadArtifactsJob") {
            console.log("unexpected job name", data.name)
            return
        }

        const { token, segment, unsupported_request_paths: unsupportedRequestPaths, downloaded_request_paths: downloadedRequestPaths } = data.data;

        if (!token) {
            console.log("unexpected job token", token)
            return
        }

        const progress = this._waitingSegmentCount[token];

        if (!progress) {
            return
        }

        progress[segment] = 1;

        this.renderAlert(progress.filter((e) => !!e).length)
        this.renderMissingArtifacts(unsupportedRequestPaths)
        this.renderDownloadedArtifacts(downloadedRequestPaths)
    }

    // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    makeid(length) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    renderAlert(currentSegment) {
        const segmentSize = this.alertTarget.dataset.segmentSize;
        const outputDir = this.alertTarget.dataset.outputDir;

        if (currentSegment < segmentSize) {
            this.alertTarget.textContent = `Running ${currentSegment}/${segmentSize} jobs to download files into ${outputDir}`
        } else {
            this.alertTarget.textContent = `Completed to download. Files are available under ${outputDir}`
        }

        this.alertTarget.classList.remove("hidden");
    }

    renderMissingArtifacts(requestPaths) {
        const current = this.missingArtifactsCountTarget.dataset.count || 0
        this.missingArtifactsCountTarget.dataset.count = current + requestPaths.length;

        if (this.missingArtifactsCountTarget.dataset.count > 0) {
            this.missingArtifactsCountTarget.textContent = `But ${this.missingArtifactsCountTarget.dataset.count} artifacts are not found in the maven repo.`;
        }

        requestPaths.forEach((p) => {
            const e = document.querySelector(`tr[data-request-path="${p}"]`);

            if (e) {
                e.classList.add("table-danger")
            }
        })
    }

    renderDownloadedArtifacts(requestPaths) {
        const current = this.downloadedArtifactsCountTarget.dataset.count || 0
        this.downloadedArtifactsCountTarget.dataset.count = current + requestPaths.length;

        this.downloadedArtifactsCountTarget.textContent = `${this.downloadedArtifactsCountTarget.dataset.count} artifacts have been downloaded.`;

        requestPaths.forEach((p) => {
            const e = document.querySelector(`tr[data-request-path="${p}"]`);

            if (e) {
                e.classList.add("table-success")
            }
        })
    }
}
