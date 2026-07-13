const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusDiv = document.getElementById("status");
const earSpan = document.getElementById("ear");
const stateSpan = document.getElementById("state");

const alarm = document.getElementById("alarm");

let alarmPlaying = false;
let cameraReady = false;

// ------------------------------
// Start Camera
// ------------------------------

async function startCamera() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({

            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user"
            },

            audio: false

        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            cameraReady = true;

            statusDiv.innerHTML = "📷 Camera Ready";
            statusDiv.style.color = "#00bfff";

            detectLoop();

        };

    }

    catch (err) {

        console.error(err);

        statusDiv.innerHTML = "❌ Unable to access camera";
        statusDiv.style.color = "#ff4444";

    }

}

// ------------------------------
// Play Alarm
// ------------------------------

function playAlarm() {

    if (alarmPlaying)
        return;

    alarm.loop = true;

    alarm.play().then(() => {

        alarmPlaying = true;

    }).catch(err => {

        console.log(err);

    });

}

// ------------------------------
// Stop Alarm
// ------------------------------

function stopAlarm() {

    if (!alarmPlaying)
        return;

    alarm.pause();

    alarm.currentTime = 0;

    alarmPlaying = false;

}

// ------------------------------
// Send Frame
// ------------------------------

async function sendFrame() {

    if (!cameraReady)
        return;

    ctx.drawImage(

        video,

        0,
        0,

        canvas.width,
        canvas.height

    );

    canvas.toBlob(async (blob) => {

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

            if (!response.ok)
                throw new Error("Server Error");

            const data = await response.json();

            //---------------------------------

            earSpan.textContent = data.ear.toFixed(3);

            //---------------------------------

            if (data.ear === 0) {

                statusDiv.innerHTML = "👤 No Face Detected";
                statusDiv.style.color = "#ffae42";

                stateSpan.textContent = "No Face";

                stopAlarm();

                return;

            }

            //---------------------------------

            if (data.is_drowsy) {

                statusDiv.innerHTML = "⚠️ DROWSINESS DETECTED";
                statusDiv.style.color = "#ff2222";

                stateSpan.textContent = "Drowsy";

                playAlarm();

            }

            else {

                statusDiv.innerHTML = "✅ Alert";
                statusDiv.style.color = "#00ff88";

                stateSpan.textContent = "Alert";

                stopAlarm();

            }

        }

        catch (err) {

            console.error(err);

            statusDiv.innerHTML = "❌ Server Disconnected";
            statusDiv.style.color = "#ff4444";

            stateSpan.textContent = "Offline";

            stopAlarm();

        }

    }, "image/jpeg", 0.75);

}

// ------------------------------
// Detection Loop
// ------------------------------

function detectLoop() {

    sendFrame();

    setTimeout(detectLoop, 120);

}

// ------------------------------

window.onload = () => {

    startCamera();

};
