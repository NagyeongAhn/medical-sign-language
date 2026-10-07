from collections import defaultdict
from pathlib import Path

import numpy as np

from comparison.dtw import dtw_distance
from comparison.feature_extractor import extract_features
from comparison.preprocessor import (
    load_recording,
    shoulder_origin_and_scale,
    trim_inactive_frames,
)


DEFAULT_MAX_DISTANCE = 0.40
MAX_SEQUENCE_FRAMES = 48
MAX_SEQUENCE_WORDS = 5
MIN_SEGMENT_MS = 400
MIN_SEGMENT_FRAMES = 5
BOUNDARY_STEP = 6
EXTRA_WORD_PENALTY = 0.04


class SignMatcher:
    def __init__(
        self,
        recordings_directory,
        neighbors=3,
        max_distance=DEFAULT_MAX_DISTANCE,
    ):
        self.recordings_directory = Path(recordings_directory)
        self.neighbors = neighbors
        self.max_distance = max_distance
        self.references = []
        self.skipped_references = []

    def load_references(self):
        self.references = []
        self.skipped_references = []
        for path in sorted(self.recordings_directory.glob("*/*.json")):
            try:
                recording = load_recording(path)
                self.references.append(
                    {
                        "path": path.resolve(),
                        "wordId": recording["wordId"],
                        "wordLabel": recording["wordLabel"],
                        "features": extract_features(recording["frames"]),
                    }
                )
            except (KeyError, TypeError, ValueError, OSError) as error:
                self.skipped_references.append(
                    {
                        "path": path.resolve(),
                        "reason": str(error),
                    }
                )
        return len(self.references)

    def match_recording(self, recording, exclude_path=None):
        if not self.references:
            self.load_references()

        query_features = extract_features(recording["frames"])
        excluded = Path(exclude_path).resolve() if exclude_path else None
        references = [
            (reference, reference["features"])
            for reference in self.references
            if not excluded or reference["path"] != excluded
        ]
        ranked = self._rank_features(query_features, references)
        if not ranked:
            raise ValueError("비교할 기준 수어가 없습니다.")

        best = dict(ranked[0])
        best["candidates"] = ranked
        if self.max_distance is not None and best["distance"] > self.max_distance:
            best["wordId"] = None
            best["wordLabel"] = "인식할 수 없음"
        return best

    def match_frames(self, frames):
        """촬영이 끝난 영상에서 한 단어 또는 여러 단어를 같은 방식으로 찾습니다."""
        if not self.references:
            self.load_references()
        if not self.references:
            raise ValueError("비교할 기준 수어가 없습니다. 기준 샘플을 먼저 수집해주세요.")

        active_frames = trim_inactive_frames(frames)
        valid_frames = [
            frame for frame in active_frames
            if shoulder_origin_and_scale(frame) is not None
        ]
        valid_frames = trim_inactive_frames(valid_frames)
        features = extract_features(valid_frames)
        timestamps = [frame["timestampMs"] for frame in valid_frames]
        return self.match_feature_sequence(features, timestamps)

    def match_feature_sequence(self, features, timestamps):
        """정지 구간 없이 전체 특징 시퀀스의 단어 경계 후보를 비교합니다."""
        if not self.references:
            raise ValueError("비교할 기준 수어가 없습니다. 기준 샘플을 먼저 수집해주세요.")
        if len(features) != len(timestamps):
            raise ValueError("특징과 촬영 시각의 길이가 다릅니다.")
        if len(features) < 2:
            raise ValueError("비교에 필요한 유효 프레임이 2개 미만입니다.")

        references = [
            (reference, self._downsample(reference["features"], MAX_SEQUENCE_FRAMES))
            for reference in self.references
        ]
        sampled_indices = np.unique(
            np.linspace(
                0, len(features) - 1, min(len(features), MAX_SEQUENCE_FRAMES)
            ).astype(int)
        )
        sampled_features = features[sampled_indices]
        timestamps = [timestamps[index] for index in sampled_indices]
        end = len(sampled_features)
        boundaries = sorted(set(range(0, end, BOUNDARY_STEP)) | {end})

        candidates = {}
        for start_position, start in enumerate(boundaries[:-1]):
            for finish in boundaries[start_position + 1:]:
                if finish - start < MIN_SEGMENT_FRAMES:
                    continue
                if timestamps[finish - 1] - timestamps[start] < MIN_SEGMENT_MS:
                    continue
                ranked = self._rank_features(sampled_features[start:finish], references)
                best = dict(ranked[0])
                if self.max_distance is not None and best["distance"] > self.max_distance:
                    best["wordId"] = None
                    best["wordLabel"] = "인식할 수 없음"
                candidates[(start, finish)] = best

        paths = {(0, 0): (0.0, [])}
        for word_count in range(1, MAX_SEQUENCE_WORDS + 1):
            for finish in boundaries[1:]:
                best = None
                for start in boundaries:
                    previous = paths.get((word_count - 1, start))
                    candidate = candidates.get((start, finish))
                    if previous is None or candidate is None:
                        continue
                    if word_count > 1 and candidate["wordId"] is None:
                        continue
                    if word_count > 1 and previous[1][-1][2]["wordId"] is None:
                        continue
                    cost = (
                        previous[0]
                        + candidate["distance"] * (finish - start) / end
                        + (EXTRA_WORD_PENALTY if word_count > 1 else 0.0)
                    )
                    if best is None or cost < best[0]:
                        best = (cost, previous[1] + [(start, finish, candidate)])
                if best is not None:
                    paths[(word_count, finish)] = best

        complete = [
            paths[(count, end)] for count in range(1, MAX_SEQUENCE_WORDS + 1)
            if (count, end) in paths
        ]
        if not complete:
            raise ValueError("인식 가능한 수어 구간을 찾지 못했습니다.")

        _, best_path = min(complete, key=lambda item: item[0])
        return [
            {
                **candidate,
                "segmentIndex": index,
                "startMs": timestamps[start],
                "endMs": timestamps[finish - 1],
                "frameCount": finish - start,
            }
            for index, (start, finish, candidate) in enumerate(best_path)
        ]

    def _rank_features(self, query_features, references):
        distances_by_word = defaultdict(list)
        labels = {}
        for reference, reference_features in references:
            distance = dtw_distance(query_features, reference_features)
            distances_by_word[reference["wordId"]].append(distance)
            labels[reference["wordId"]] = reference["wordLabel"]

        ranked = []
        for word_id, distances in distances_by_word.items():
            nearest = sorted(distances)[:self.neighbors]
            distance = float(np.mean(nearest))
            ranked.append({
                "wordId": word_id,
                "wordLabel": labels[word_id],
                "distance": distance,
                "confidence": 1.0 / (1.0 + distance),
            })
        return sorted(ranked, key=lambda result: result["distance"])

    @staticmethod
    def _downsample(features, limit):
        if len(features) <= limit:
            return features
        return features[np.linspace(0, len(features) - 1, limit).astype(int)]

    def match_file(self, path, exclude_self=False):
        path = Path(path)
        recording = load_recording(path)
        return self.match_recording(
            recording,
            exclude_path=path if exclude_self else None,
        )
