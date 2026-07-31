from comparison.preprocessor import (
    normalize_coordinate,
    shoulder_origin_and_scale,
)


MOTION_THRESHOLD = 0.28
PAUSE_DURATION_MS = 800
MIN_SIGN_DURATION_MS = 450
PADDING_MS = 220
MAX_SEGMENTS = 5


def segment_by_motion(frames):
    """긴 정지 구간을 기준으로 연속 좌표를 최대 5개의 단어 구간으로 나눕니다."""
    if len(frames) < 3:
        return []

    motion_scores = [0.0]
    for previous, current in zip(frames, frames[1:]):
        motion_scores.append(_motion_speed(previous, current))

    smoothed_scores = _moving_average(motion_scores, radius=2)
    active_indices = [
        index
        for index, score in enumerate(smoothed_scores)
        if score >= MOTION_THRESHOLD
    ]
    if not active_indices:
        return []

    active_groups = []
    group_start = active_indices[0]
    previous_active = active_indices[0]

    for active_index in active_indices[1:]:
        gap_ms = (
            frames[active_index]["timestampMs"]
            - frames[previous_active]["timestampMs"]
        )
        if gap_ms >= PAUSE_DURATION_MS:
            active_groups.append((group_start, previous_active))
            group_start = active_index
        previous_active = active_index
    active_groups.append((group_start, previous_active))

    segments = []
    for start_index, end_index in active_groups:
        start_time = frames[start_index]["timestampMs"] - PADDING_MS
        end_time = frames[end_index]["timestampMs"] + PADDING_MS
        padded_start = _first_index_at_or_after(frames, start_time)
        padded_end = _last_index_at_or_before(frames, end_time)

        duration_ms = (
            frames[padded_end]["timestampMs"]
            - frames[padded_start]["timestampMs"]
        )
        if duration_ms < MIN_SIGN_DURATION_MS:
            continue

        segment = frames[padded_start:padded_end + 1]
        hand_frame_count = sum(bool(frame.get("hands")) for frame in segment)
        if hand_frame_count < 2:
            continue

        segments.append(segment)
        if len(segments) >= MAX_SEGMENTS:
            break

    return segments


def _motion_speed(previous, current):
    previous_points = _normalized_wrists(previous)
    current_points = _normalized_wrists(current)
    common_labels = previous_points.keys() & current_points.keys()
    if not common_labels:
        return 0.0

    time_delta_ms = current["timestampMs"] - previous["timestampMs"]
    if time_delta_ms <= 0:
        return 0.0

    distances = []
    for label in common_labels:
        previous_point = previous_points[label]
        current_point = current_points[label]
        distances.append(
            (
                (current_point[0] - previous_point[0]) ** 2
                + (current_point[1] - previous_point[1]) ** 2
            ) ** 0.5
        )

    return sum(distances) / len(distances) / (time_delta_ms / 1000)


def _normalized_wrists(frame):
    normalization = shoulder_origin_and_scale(frame)
    if normalization is None:
        return {}

    origin, scale = normalization
    wrists = {}
    for label, hand in frame.get("hands", {}).items():
        wrist = next(
            (
                landmark
                for landmark in hand.get("landmarks", [])
                if landmark.get("id") == 0
            ),
            None,
        )
        if wrist:
            normalized = normalize_coordinate(wrist, origin, scale)
            wrists[label] = normalized[:2]
    return wrists


def _moving_average(values, radius):
    smoothed = []
    for index in range(len(values)):
        start = max(0, index - radius)
        end = min(len(values), index + radius + 1)
        smoothed.append(sum(values[start:end]) / (end - start))
    return smoothed


def _first_index_at_or_after(frames, timestamp_ms):
    for index, frame in enumerate(frames):
        if frame["timestampMs"] >= timestamp_ms:
            return index
    return len(frames) - 1


def _last_index_at_or_before(frames, timestamp_ms):
    for index in range(len(frames) - 1, -1, -1):
        if frames[index]["timestampMs"] <= timestamp_ms:
            return index
    return 0
