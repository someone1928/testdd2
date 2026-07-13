import cv2
import numpy as np

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

import config
from core.detector import DrowsinessDetector

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

CORS(app)

detector = DrowsinessDetector(
    ear_threshold=config.EAR_THRESHOLD,
    consecutive_frames=config.CONSECUTIVE_FRAMES,
    model_path=config.MODEL_PATH
)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/detect", methods=["POST"])
def detect():

    if "frame" not in request.files:
        return jsonify({
            "error": "No frame received"
        }), 400

    file = request.files["frame"]

    data = np.frombuffer(
        file.read(),
        np.uint8
    )

    frame = cv2.imdecode(
        data,
        cv2.IMREAD_COLOR
    )

    if frame is None:
        return jsonify({
            "error": "Invalid frame"
        }), 400

    detector.process_frame(frame)

    return jsonify({

        "ear": round(detector.average_ear, 3),
        "is_drowsy": detector.is_drowsy,
        "status": detector.status,
        "closed_seconds": round(
            detector.eye_closed_seconds,
            1
        )

    })


@app.route("/status")
def status():

    return jsonify({

        "ear": round(detector.average_ear, 3),
        "is_drowsy": detector.is_drowsy,
        "status": detector.status,
        "closed_seconds": round(
            detector.eye_closed_seconds,
            1
        )

    })


@app.route("/settings", methods=["GET", "POST"])
def settings():

    if request.method == "POST":

        data = request.get_json()

        if "ear_threshold" in data:
            detector.EAR_THRESHOLD = float(
                data["ear_threshold"]
            )

        if "consecutive_frames" in data:
            detector.CONSECUTIVE_FRAMES = int(
                data["consecutive_frames"]
            )

    return jsonify({

        "ear_threshold": detector.EAR_THRESHOLD,
        "consecutive_frames": detector.CONSECUTIVE_FRAMES

    })


if __name__ == "__main__":

    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG
    )
