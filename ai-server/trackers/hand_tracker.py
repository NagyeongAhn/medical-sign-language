import cv2
import mediapipe as mp


class HandTracker:
    def __init__(self):
        self.mp_hands = mp.solutions.hands
        self.drawing = mp.solutions.drawing_utils
        self.model = self.mp_hands.Hands(
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.7,
        )

    def process(self, image_rgb):
        results = self.model.process(image_rgb)
        detected_hands = []

        if not results.multi_hand_landmarks:
            return detected_hands

        for landmarks, handedness in zip(
            results.multi_hand_landmarks,
            results.multi_handedness,
        ):
            classification = handedness.classification[0]
            detected_hands.append(
                {
                    "label": classification.label.upper(),
                    "score": classification.score,
                    "landmarks": landmarks,
                }
            )

        return sorted(
            detected_hands,
            key=lambda hand: 0 if hand["label"] == "LEFT" else 1,
        )

    def coordinates(self, detected_hands):
        coordinates = {}

        for hand in detected_hands:
            landmarks = []
            for landmark_id, landmark in enumerate(hand["landmarks"].landmark):
                landmarks.append(
                    {
                        "id": landmark_id,
                        "name": self.mp_hands.HandLandmark(landmark_id).name,
                        "x": landmark.x,
                        "y": landmark.y,
                        "z": landmark.z,
                    }
                )

            coordinates[hand["label"]] = {
                "score": hand["score"],
                "landmarks": landmarks,
            }

        return coordinates

    def draw(self, image, detected_hands):
        image_height, image_width, _ = image.shape

        for hand in detected_hands:
            landmarks = hand["landmarks"]
            self.drawing.draw_landmarks(
                image,
                landmarks,
                self.mp_hands.HAND_CONNECTIONS,
            )

            wrist = landmarks.landmark[self.mp_hands.HandLandmark.WRIST]
            label_x = max(0, int(wrist.x * image_width) - 35)
            label_y = max(30, int(wrist.y * image_height) + 30)
            cv2.putText(
                image,
                f'{hand["label"]} {hand["score"]:.2f}',
                (label_x, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

    def close(self):
        self.model.close()
