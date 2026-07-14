/* ==========================================================
   DRIVER DROWSINESS DETECTOR
   PART 1 - INITIALIZATION & DASHBOARD
========================================================== */

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const statusDiv = document.getElementById("status");
const earSpan = document.getElementById("ear");
const closedTimeSpan = document.getElementById("closed-time");

const statusCard = document.getElementById("status-card");
const clockElement = document.getElementById("clock");

const ctx = canvas.getContext("2d");

/* ==========================================================
   ALARM
========================================================== */

const alarm = new Audio("/static/alarm.wav");
alarm.loop = true;

let alarmPlaying = false;

/* ==========================================================
   CHART
========================================================== */

const chartCanvas = document.getElementById("earChart");

let earHistory = [];
let labelHistory = [];

const earChart = new Chart(chartCanvas, {

    type: "line",

    data: {

        labels: labelHistory,

        datasets: [

            {

                label: "EAR",

                data: earHistory,

                borderColor: "#38bdf8",

                backgroundColor: "rgba(56,189,248,.15)",

                borderWidth: 3,

                fill: true,

                tension: 0.35,

                pointRadius: 2

            }

        ]

    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: {

            duration: 300

        },

        plugins: {

            legend: {

                labels: {

                    color: "#ffffff"

                }

            }

        },

        scales: {

            x: {

                ticks: {

                    color: "#94a3b8"

                },

                grid: {

                    color: "rgba(255,255,255,.05)"

                }

            },

            y: {

                min: 0,

                max: 0.5,

                ticks: {

                    color: "#94a3b8"

                },

                grid: {

                    color: "rgba(255,255,255,.05)"

                }

            }

        }

    }

});

/* ==========================================================
   LIVE CLOCK
========================================================== */

function updateClock() {

    if (!clockElement) return;

    const now = new Date();

    clockElement.innerHTML = now.toLocaleTimeString();

}

setInterval(updateClock, 1000);
updateClock();

/* ==========================================================
   UPDATE EAR CHART
========================================================== */

function updateChart(value) {

    earHistory.push(value);

    labelHistory.push("");

    if (earHistory.length > 30) {

        earHistory.shift();
        labelHistory.shift();

    }

    earChart.update();

}

/* ==========================================================
   UPDATE STATUS CARD
========================================================== */

function updateStatusCard(status) {

    if (!statusCard) return;

    statusCard.innerText = status;

}

/* ==========================================================
   ALARM FUNCTIONS
========================================================== */

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

/* ==========================================================
   CAMERA
========================================================== */

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

/* ==========================================================
   SEND FRAME TO FLASK
========================================================== */

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

            /* -----------------------------
               UPDATE EAR VALUE
            ----------------------------- */

            const earValue = Number(data.ear);

            earSpan.innerText = earValue.toFixed(3);

            updateChart(earValue);

            /* -----------------------------
               UPDATE CLOSED TIMER
            ----------------------------- */

            if (closedTimeSpan) {

                closedTimeSpan.innerText =
                    Number(data.closed_seconds).toFixed(1);

            }

            /* -----------------------------
               UPDATE STATUS
            ----------------------------- */

            switch (data.status) {

                case "ALERT":

                    stopAlarm();

                    updateStatusCard("Alert");

                    statusDiv.innerHTML =
                        "🟢 DRIVER ALERT";

                    statusDiv.style.background =
                        "#00b050";

                    statusDiv.style.color =
                        "#ffffff";

                    break;

                case "SLEEPY":

                    stopAlarm();

                    updateStatusCard("Sleepy");

                    statusDiv.innerHTML =
                        "🟡 Eyes Closing...";

                    statusDiv.style.background =
                        "#ffd966";

                    statusDiv.style.color =
                        "#000000";

                    break;

                case "EYES CLOSED":

                    playAlarm();

                    updateStatusCard("Eyes Closed");

                    statusDiv.innerHTML =
                        `🔴 Eyes Closed (${Number(data.closed_seconds).toFixed(1)} s)`;

                    statusDiv.style.background =
                        "#ff3333";

                    statusDiv.style.color =
                        "#ffffff";

                    break;

                case "DROWSY":

                    playAlarm();

                    updateStatusCard("Drowsy");

                    statusDiv.innerHTML =
                        "🚨 DROWSINESS DETECTED 🚨";

                    statusDiv.style.background =
                        "#8b0000";

                    statusDiv.style.color =
                        "#ffffff";

                    break;

                case "NO FACE":

                    stopAlarm();

                    updateStatusCard("No Face");

                    statusDiv.innerHTML =
                        "⚪ NO FACE DETECTED";

                    statusDiv.style.background =
                        "#666666";

                    statusDiv.style.color =
                        "#ffffff";

                    break;

                default:

                    stopAlarm();

                    updateStatusCard("Waiting");

                    statusDiv.innerHTML =
                        "Waiting...";

                    statusDiv.style.background =
                        "#444";

                    statusDiv.style.color =
                        "#ffffff";

                    break;

            }

        }

        catch (err) {

            console.error(err);

            stopAlarm();

            updateStatusCard("Offline");

            statusDiv.innerHTML =
                "❌ Server Disconnected";

            statusDiv.style.background =
                "#8b0000";

            statusDiv.style.color =
                "#ffffff";

        }

    }, "image/jpeg", 0.8);

}

/* ==========================================================
   DETECTION LOOP
========================================================== */

function detectLoop() {

    sendFrame();

    setTimeout(

        detectLoop,

        100

    );

}

/* ==========================================================
   START APPLICATION
========================================================== */

startCamera();
