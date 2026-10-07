"""Inspect a local sign video without saving extracted landmarks."""

import argparse
from pathlib import Path

from comparison.motion_segmenter import segment_by_motion
from comparison.sign_matcher import SignMatcher
from services.video_analysis_service import VideoAnalysisService


def main():
    parser = argparse.ArgumentParser(description="수어 영상 인식 진단")
    parser.add_argument("video", type=Path, help="분석할 영상 파일")
    parser.add_argument("--mode", choices=("single", "sequence"), default="single")
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
    segments = segment_by_motion(frames) if args.mode == "sequence" else [frames]
    print(f"분리된 단어 구간: {len(segments)}개")

    for index, segment in enumerate(segments, start=1):
        recording = {"frames": segment}
        try:
            result = matcher.match_recording(recording)
        except ValueError as error:
            print(f"구간 {index}: 분석 실패 ({error})")
            continue

        start_ms = segment[0]["timestampMs"]
        end_ms = segment[-1]["timestampMs"]
        print(
            f"구간 {index}: {start_ms}-{end_ms}ms, "
            f"{len(segment)}프레임, 결과={result['wordLabel']}, "
            f"거리={result['distance']:.4f}"
        )
        for candidate in result["candidates"][:5]:
            print(
                f"  {candidate['wordLabel']} ({candidate['wordId']}): "
                f"거리={candidate['distance']:.4f}"
            )


if __name__ == "__main__":
    main()
