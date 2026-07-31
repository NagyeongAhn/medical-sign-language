import cv2
import mediapipe as mp


class PoseTracker:
    LANDMARKS = {
        "LEFT_SHOULDER": mp.solutions.pose.PoseLandmark.LEFT_SHOULDER,
        "RIGHT_SHOULDER": mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER,
        "LEFT_ELBOW": mp.solutions.pose.PoseLandmark.LEFT_ELBOW,
        "RIGHT_ELBOW": mp.solutions.pose.PoseLandmark.RIGHT_ELBOW,
        "LEFT_WRIST": mp.solutions.pose.PoseLandmark.LEFT_WRIST,
        "RIGHT_WRIST": mp.solutions.pose.PoseLandmark.RIGHT_WRIST,
    }
    CONNECTIONS = (
        ("LEFT_SHOULDER", "RIGHT_SHOULDER"),
        ("LEFT_SHOULDER", "LEFT_ELBOW"),
        ("LEFT_ELBOW", "LEFT_WRIST"),
        ("RIGHT_SHOULDER", "RIGHT_ELBOW"),
        ("RIGHT_ELBOW", "RIGHT_WRIST"),
    )

    def __init__(self):
        self.model = mp.solutions.pose.Pose(
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process(self, image_rgb):
        results = self.model.process(image_rgb)
        coordinates = {}

        if not results.pose_landmarks:
            return coordinates

        for name, landmark_id in self.LANDMARKS.items():
            landmark = results.pose_landmarks.landmark[landmark_id.value]
            coordinates[name] = {
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility,
            }

        return coordinates

    def draw(self, image, coordinates):
        image_height, image_width, _ = image.shape

        for coordinate in coordinates.values():
            point = (
                int(coordinate["x"] * image_width),
                int(coordinate["y"] * image_height),
            )
            cv2.circle(image, point, 6, (255, 0, 255), -1)

        for start_name, end_name in self.CONNECTIONS:
            if start_name not in coordinates or end_name not in coordinates:
                continue

            start = coordinates[start_name]
            end = coordinates[end_name]
            start_point = (
                int(start["x"] * image_width),
                int(start["y"] * image_height),
            )
            end_point = (
                int(end["x"] * image_width),
                int(end["y"] * image_height),
            )
            cv2.line(image, start_point, end_point, (255, 0, 255), 3)

    def close(self):
        self.model.close()
