const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const statusDiv = document.getElementById("status");
const earSpan = document.getElementById("ear");

const ctx = canvas.getContext("2d");

// Open the user's webcam
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
        statusDiv.style.color = "#ff5555";

    }

}

// Send one frame to Flask
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

            earSpan.innerText = data.ear.toFixed(3);

            if (data.is_drowsy) {

                statusDiv.innerHTML = "⚠️ DROWSINESS DETECTED";
                statusDiv.style.color = "#ff3333";

            }

            else {

                statusDiv.innerHTML = "✅ Alert";
                statusDiv.style.color = "#00ff88";

            }

        }

        catch (err) {

            console.error(err);

        }

    }, "image/jpeg", 0.8);

}

// Detection loop
function detectLoop() {

    sendFrame();

    setTimeout(detectLoop, 100);

}

startCamera();