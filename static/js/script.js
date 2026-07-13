const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const statusDiv = document.getElementById("status");
const earSpan = document.getElementById("ear");
const closedTimeSpan = document.getElementById("closed-time");

const ctx = canvas.getContext("2d");

// Alarm Sound
const alarm = new Audio("/static/alarm.wav");
alarm.loop = true;

let alarmPlaying = false;

function playAlarm() {

    if (!alarmPlaying) {

        alarm.play().then(() => {

            alarmPlaying = true;

        }).catch(err => {

            console.log("Audio blocked:", err);

        });

    }

}

function stopAlarm() {

    if (alarmPlaying) {

        alarm.pause();
        alarm.currentTime = 0;
        alarmPlaying = false;

    }

}

// Open webcam
async function startCamera() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({

            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            },

            audio: false

        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            detectLoop();

        };

    }

    catch (err) {

        console.error(err);

        statusDiv.innerHTML = "❌ Unable to access webcam";
        statusDiv.style.background = "#8b0000";
        statusDiv.style.color = "#ffffff";

    }

}

// Send frame to Flask
async function sendFrame() {

    if (video.readyState !== 4)
        return;

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(async function(blob) {

        const formData = new FormData();

        formData.append(
            "frame",
            blob,
            "frame.jpg"
        );

        try {

            const response = await fetch("/detect", {

                method: "POST",
                body: formData

            });

            const data = await response.json();

            // Update EAR
            earSpan.innerText = Number(data.ear).toFixed(3);

            // Update timer
            if (closedTimeSpan) {

                closedTimeSpan.innerText =
                    Number(data.closed_seconds).toFixed(1);

            }

            switch (data.status) {

                case "ALERT":

                    stopAlarm();

                    statusDiv.innerHTML = "🟢 DRIVER ALERT";
                    statusDiv.style.background = "#00b050";
                    statusDiv.style.color = "#ffffff";

                    break;

                case "SLEEPY":

                    stopAlarm();

                    statusDiv.innerHTML = "🟡 Eyes Closing...";
                    statusDiv.style.background = "#ffd966";
                    statusDiv.style.color = "#000000";

                    break;

                case "EYES CLOSED":

                    playAlarm();

                    statusDiv.innerHTML =
                        `🔴 Eyes Closed (${Number(data.closed_seconds).toFixed(1)} s)`;

                    statusDiv.style.background = "#ff3333";
                    statusDiv.style.color = "#ffffff";

                    break;

                case "DROWSY":

                    playAlarm();

                    statusDiv.innerHTML =
                        "🚨 DROWSINESS DETECTED 🚨";

                    statusDiv.style.background = "#8b0000";
                    statusDiv.style.color = "#ffffff";

                    break;

                case "NO FACE":

                    stopAlarm();

                    statusDiv.innerHTML =
                        "⚪ NO FACE DETECTED";

                    statusDiv.style.background = "#666666";
                    statusDiv.style.color = "#ffffff";

                    break;

                default:

                    stopAlarm();

                    statusDiv.innerHTML = "Waiting...";
                    statusDiv.style.background = "#444";
                    statusDiv.style.color = "#fff";

                    break;

            }

        }

        catch (err) {

            console.error(err);

            stopAlarm();

            statusDiv.innerHTML = "❌ Server Disconnected";
            statusDiv.style.background = "#8b0000";
            statusDiv.style.color = "#ffffff";

        }

    }, "image/jpeg", 0.8);

}

// Detection loop
function detectLoop() {

    sendFrame();

    setTimeout(
        detectLoop,
        100
    );

}

startCamera();
