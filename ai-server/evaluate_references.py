from pathlib import Path

import numpy as np

from comparison.sign_matcher import SignMatcher
from comparison.preprocessor import load_recording


def main():
    recordings_directory = Path(__file__).parent / "recordings"
    matcher = SignMatcher(recordings_directory)
    reference_count = matcher.load_references()
    correct = 0
    correct_distances = []

    print(f"기준 샘플 {reference_count}개 교차 검증")
    for reference in matcher.references:
        expected = reference["wordId"]
        recording = load_recording(reference["path"])
        result = matcher.match_recording(recording, exclude_path=reference["path"])
        is_correct = result["wordId"] == expected
        correct += int(is_correct)
        if is_correct:
            correct_distances.append(result["distance"])

        mark = "O" if is_correct else "X"
        print(
            f'[{mark}] {reference["path"].parent.name}/{reference["path"].name} '
            f'expected={expected} predicted={result["wordId"]} '
            f'distance={result["distance"]:.4f}'
        )

    accuracy = correct / reference_count if reference_count else 0.0
    print(f"\n정확도: {correct}/{reference_count} ({accuracy:.1%})")

    if correct_distances:
        suggested_threshold = float(np.percentile(correct_distances, 95) * 1.15)
        print(f"임시 거부 임계값 제안: {suggested_threshold:.4f}")
        print("새 사용자 촬영 데이터로 검증한 뒤 최종 확정해야 합니다.")


if __name__ == "__main__":
    main()
