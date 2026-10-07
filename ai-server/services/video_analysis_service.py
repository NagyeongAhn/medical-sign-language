from pathlib import Path

import cv2

from models.frame_data import build_frame_data
from trackers.face_tracker import FaceTracker
from trackers.hand_tracker import HandTracker
from trackers.pose_tracker import PoseTracker


class VideoAnalysisService:
    def __init__(self, sign_matcher):
        self.sign_matcher = sign_matcher

    def analyze(self, video_path):
        frames = self.extract_frames(video_path)
        self._validate_frames(frames)
        words = self.sign_matcher.match_frames(frames)

        return {
            "words": words,
            "segmentCount": len(words),
            "frameCount": len(frames),
        }

    def extract_frames(self, video_path):
        video_path = Path(video_path)
        capture = cv2.VideoCapture(str(video_path))
        if not capture.isOpened():
            raise ValueError("영상 파일을 열 수 없습니다.")

        hand_tracker = None
        pose_tracker = None
        face_tracker = None

        try:
            hand_tracker = HandTracker()
            pose_tracker = PoseTracker()
            face_tracker = FaceTracker()

            source_fps = capture.get(cv2.CAP_PROP_FPS)
            if source_fps <= 0:
                source_fps = 30.0

            frames = []
            source_frame_index = 0
            decoded_frame_count = 0

            while True:
                success, image = capture.read()
                if not success:
                    break
                decoded_frame_count += 1

                # 웹캠 기준 데이터와 동일하게 셀피 방향으로 반전합니다.
                image = cv2.flip(image, 1)
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                detected_hands = hand_tracker.process(image_rgb)
                hands = hand_tracker.coordinates(detected_hands)
                upper_body = pose_tracker.process(image_rgb)
                face = face_tracker.process(image_rgb)

                timestamp_ms = capture.get(cv2.CAP_PROP_POS_MSEC)
                if timestamp_ms <= 0:
                    timestamp_ms = source_frame_index / source_fps * 1000

                frames.append(
                    build_frame_data(
                        frame_index=len(frames),
                        timestamp_ms=round(timestamp_ms),
                        hands=hands,
                        upper_body=upper_body,
                        face=face,
                    )
                )
                source_frame_index += 1

            if len(frames) < 2:
                raise ValueError(
                    "분석할 수 있는 영상 프레임이 부족합니다. "
                    f"(영상 프레임: {decoded_frame_count}, 분석 프레임: {len(frames)})"
                )
            return frames
        finally:
            capture.release()
            if hand_tracker:
                hand_tracker.close()
            if pose_tracker:
                pose_tracker.close()
            if face_tracker:
                face_tracker.close()

    @staticmethod
    def _validate_frames(frames):
        hand_frame_count = sum(bool(frame["hands"]) for frame in frames)
        body_frame_count = sum(bool(frame["upperBody"]) for frame in frames)
        if hand_frame_count < 2 or body_frame_count < 2:
            raise ValueError(
                "손 또는 상체가 충분히 감지되지 않았습니다. "
                f"(분석 프레임: {len(frames)}, 손 감지: {hand_frame_count}, "
                f"상체 감지: {body_frame_count})"
            )
