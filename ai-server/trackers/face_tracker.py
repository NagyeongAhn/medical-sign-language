import cv2
import mediapipe as mp


class FaceTracker:
    LANDMARKS = {
        "NOSE": 1,
        "LEFT_EYE_OUTER": 33,
        "RIGHT_EYE_OUTER": 263,
        "LEFT_MOUTH": 61,
        "RIGHT_MOUTH": 291,
        "CHIN": 152,
    }

    def __init__(self):
        self.model = mp.solutions.face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def process(self, image_rgb):
        results = self.model.process(image_rgb)
        coordinates = {}

        if not results.multi_face_landmarks:
            return coordinates

        face_landmarks = results.multi_face_landmarks[0]
        for name, landmark_id in self.LANDMARKS.items():
            landmark = face_landmarks.landmark[landmark_id]
            coordinates[name] = {
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
            }

        return coordinates

    def draw(self, image, coordinates):
        image_height, image_width, _ = image.shape

        for coordinate in coordinates.values():
            point = (
                int(coordinate["x"] * image_width),
                int(coordinate["y"] * image_height),
            )
            cv2.circle(image, point, 4, (255, 255, 0), -1)

    def close(self):
        self.model.close()
