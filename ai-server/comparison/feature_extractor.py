import numpy as np

from comparison.preprocessor import (
    normalize_coordinate,
    shoulder_origin_and_scale,
    trim_inactive_frames,
)


HAND_LABELS = ("LEFT", "RIGHT")
POSE_LABELS = (
    "LEFT_SHOULDER",
    "RIGHT_SHOULDER",
    "LEFT_ELBOW",
    "RIGHT_ELBOW",
    "LEFT_WRIST",
    "RIGHT_WRIST",
)
FACE_LABELS = (
    "NOSE",
    "LEFT_EYE_OUTER",
    "RIGHT_EYE_OUTER",
    "LEFT_MOUTH",
    "RIGHT_MOUTH",
    "CHIN",
)


def extract_features(frames):
    """프레임 목록을 DTW에서 사용할 고정 길이 특징 벡터 시퀀스로 변환합니다."""
    frames = trim_inactive_frames(frames)
    vectors = []

    for frame in frames:
        normalization = shoulder_origin_and_scale(frame)
        if normalization is None:
            continue

        origin, scale = normalization
        vector = []

        # 손 검출 여부는 좌표 보간 후에도 실제 검출 상태를 구분하기 위해 남깁니다.
        for hand_label in HAND_LABELS:
            vector.append(0.5 if hand_label in frame.get("hands", {}) else 0.0)

        for hand_label in HAND_LABELS:
            hand = frame.get("hands", {}).get(hand_label)
            landmark_by_id = {
                landmark["id"]: landmark
                for landmark in hand.get("landmarks", [])
            } if hand else {}

            for landmark_id in range(21):
                coordinate = landmark_by_id.get(landmark_id)
                if coordinate:
                    vector.extend(normalize_coordinate(coordinate, origin, scale))
                else:
                    vector.extend((np.nan, np.nan, np.nan))

        for pose_label in POSE_LABELS:
            coordinate = frame.get("upperBody", {}).get(pose_label)
            if coordinate:
                vector.extend(
                    value * 0.5
                    for value in normalize_coordinate(coordinate, origin, scale)
                )
            else:
                vector.extend((np.nan, np.nan, np.nan))

        for face_label in FACE_LABELS:
            coordinate = frame.get("face", {}).get(face_label)
            if coordinate:
                vector.extend(
                    value * 0.25
                    for value in normalize_coordinate(coordinate, origin, scale)
                )
            else:
                vector.extend((np.nan, np.nan, np.nan))

        vectors.append(vector)

    if len(vectors) < 2:
        raise ValueError("비교에 필요한 유효 프레임이 2개 미만입니다.")

    features = np.asarray(vectors, dtype=np.float64)
    return _interpolate_missing_values(features)


def _interpolate_missing_values(features):
    frame_indices = np.arange(len(features))

    for column_index in range(features.shape[1]):
        column = features[:, column_index]
        valid = ~np.isnan(column)

        if not valid.any():
            features[:, column_index] = 0.0
        elif not valid.all():
            features[:, column_index] = np.interp(
                frame_indices,
                frame_indices[valid],
                column[valid],
            )

    # 순간적인 오검출 좌표가 전체 거리를 과도하게 키우는 것을 막습니다.
    return np.clip(features, -5.0, 5.0)
