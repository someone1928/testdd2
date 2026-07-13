import os
import math
import cv2
import numpy as np
import mediapipe as mp
import pygame

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


class DrowsinessDetector:

    LEFT_EYE = [362, 385, 387, 263, 373, 380]
    RIGHT_EYE = [33, 160, 158, 133, 153, 144]

    def __init__(
        self,
        ear_threshold=0.25,
        consecutive_frames=20,
        model_path=None,
    ):

        self.EAR_THRESHOLD = ear_threshold
        self.CONSECUTIVE_FRAMES = consecutive_frames

        self.frame_counter = 0
        self.average_ear = 0.0
        self.is_drowsy = False

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        alarm_path = os.path.join(base_dir, "alarm.wav")

        try:
            pygame.mixer.init()

            if os.path.exists(alarm_path):
                self.alarm_sound = pygame.mixer.Sound(alarm_path)
            else:
                self.alarm_sound = None

        except Exception:
            self.alarm_sound = None

        if model_path is None:
            model_path = os.path.join(
                base_dir,
                "models",
                "face_landmarker.task",
            )

        base_options = python.BaseOptions(
            model_asset_path=model_path
        )

        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
            running_mode=vision.RunningMode.IMAGE,
        )

        self.detector = vision.FaceLandmarker.create_from_options(
            options
        )

    def calculate_ear(self, landmarks, eye):

        points = np.array(
            [(landmarks[i].x, landmarks[i].y) for i in eye]
        )

        vertical1 = math.dist(points[1], points[5])
        vertical2 = math.dist(points[2], points[4])
        horizontal = math.dist(points[0], points[3])

        if horizontal == 0:
            return 0

        return (vertical1 + vertical2) / (2 * horizontal)

    def process_frame(self, frame):

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb,
        )

        results = self.detector.detect(mp_image)

        self.is_drowsy = False

        if not results.face_landmarks:
            self.frame_counter = 0
            self.average_ear = 0.0
            return frame

        landmarks = results.face_landmarks[0]

        left = self.calculate_ear(
            landmarks,
            self.LEFT_EYE,
        )

        right = self.calculate_ear(
            landmarks,
            self.RIGHT_EYE,
        )

        self.average_ear = (left + right) / 2

        if self.average_ear < self.EAR_THRESHOLD:

            self.frame_counter += 1

            if self.frame_counter >= self.CONSECUTIVE_FRAMES:

                self.is_drowsy = True

                if (
                    self.alarm_sound
                    and not pygame.mixer.get_busy()
                ):
                    self.alarm_sound.play()

        else:

            self.frame_counter = 0

        return frame