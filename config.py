import os

# Base directory of the project
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Detector settings
EAR_THRESHOLD = float(os.getenv("EAR_THRESHOLD", 0.25))
CONSECUTIVE_FRAMES = int(os.getenv("CONSECUTIVE_FRAMES", 20))

# MediaPipe model
MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "face_landmarker.task"
)

# Flask server
HOST = "0.0.0.0"
PORT = int(os.environ.get("PORT", 5000))
DEBUG = os.getenv("FLASK_DEBUG", "False").lower() == "true"