def build_frame_data(
    frame_index,
    timestamp_ms,
    hands,
    upper_body,
    face,
):
    """한 프레임에서 추출한 좌표를 JSON 변환 가능한 구조로 묶습니다."""
    return {
        "frameIndex": frame_index,
        "timestampMs": timestamp_ms,
        "hands": hands,
        "upperBody": upper_body,
        "face": face,
    }
