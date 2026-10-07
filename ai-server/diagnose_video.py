"""Inspect a local sign video without saving extracted landmarks."""

import argparse
from pathlib import Path

from comparison.sign_matcher import SignMatcher
from services.video_analysis_service import VideoAnalysisService


def main():
    parser = argparse.ArgumentParser(description="수어 영상 인식 진단")
    parser.add_argument("video", type=Path, help="분석할 영상 파일")
    args = parser.parse_args()

    if not args.video.is_file():
        parser.error(f"영상 파일이 없습니다: {args.video}")

    matcher = SignMatcher(Path(__file__).parent / "recordings")
    reference_count = matcher.load_references()
    service = VideoAnalysisService(matcher)
    frames = service.extract_frames(args.video)
    hand_count = sum(bool(frame["hands"]) for frame in frames)
    body_count = sum(bool(frame["upperBody"]) for frame in frames)
    print(f"기준 샘플: {reference_count}개")
    print(f"영상 프레임: {len(frames)}개")
    print(f"손 검출: {hand_count}/{len(frames)} 프레임")
    print(f"상체 검출: {body_count}/{len(frames)} 프레임")

    service._validate_frames(frames)
    words = matcher.match_frames(frames)
    print(f"인식된 단어 구간: {len(words)}개")

    for index, word in enumerate(words, start=1):
        print(
            f"구간 {index}: {word['startMs']}-{word['endMs']}ms, "
            f"{word['frameCount']}프레임, 결과={word['wordLabel']}, "
            f"거리={word['distance']:.4f}"
        )


if __name__ == "__main__":
    main()
