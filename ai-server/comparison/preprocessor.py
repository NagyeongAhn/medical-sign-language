import json
from pathlib import Path


def load_recording(path):
    path = Path(path)
    with path.open(encoding="utf-8") as file:
        recording = json.load(file)

    if not isinstance(recording.get("frames"), list):
        raise ValueError(f"frames 배열이 없습니다: {path}")
    return recording


def trim_inactive_frames(frames):
    """손이 처음 나타난 프레임부터 마지막으로 나타난 프레임까지만 남깁니다."""
    active_indices = [
        index
        for index, frame in enumerate(frames)
        if frame.get("hands")
    ]
    if not active_indices:
        return []

    return frames[active_indices[0]:active_indices[-1] + 1]


def shoulder_origin_and_scale(frame):
    """어깨 중심과 어깨 너비를 반환합니다."""
    upper_body = frame.get("upperBody", {})
    left = upper_body.get("LEFT_SHOULDER")
    right = upper_body.get("RIGHT_SHOULDER")
    if not left or not right:
        return None

    width = (
        (left["x"] - right["x"]) ** 2
        + (left["y"] - right["y"]) ** 2
    ) ** 0.5
    if width < 1e-6:
        return None

    origin = {
        "x": (left["x"] + right["x"]) / 2,
        "y": (left["y"] + right["y"]) / 2,
        "z": (left.get("z", 0.0) + right.get("z", 0.0)) / 2,
    }
    return origin, width


def normalize_coordinate(coordinate, origin, scale):
    return (
        (coordinate["x"] - origin["x"]) / scale,
        (coordinate["y"] - origin["y"]) / scale,
        (coordinate.get("z", 0.0) - origin["z"]) / scale,
    )
