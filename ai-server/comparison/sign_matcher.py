from collections import defaultdict
from pathlib import Path

import numpy as np

from comparison.dtw import dtw_distance
from comparison.feature_extractor import extract_features
from comparison.preprocessor import load_recording


DEFAULT_MAX_DISTANCE = 0.40


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
        distances_by_word = defaultdict(list)
        labels = {}

        for reference in self.references:
            if excluded and reference["path"] == excluded:
                continue

            distance = dtw_distance(query_features, reference["features"])
            distances_by_word[reference["wordId"]].append(distance)
            labels[reference["wordId"]] = reference["wordLabel"]

        ranked = []
        for word_id, distances in distances_by_word.items():
            nearest = sorted(distances)[:self.neighbors]
            distance = float(np.mean(nearest))
            ranked.append(
                {
                    "wordId": word_id,
                    "wordLabel": labels[word_id],
                    "distance": distance,
                    "confidence": 1.0 / (1.0 + distance),
                }
            )

        ranked.sort(key=lambda result: result["distance"])
        if not ranked:
            raise ValueError("비교할 기준 수어가 없습니다.")

        best = dict(ranked[0])
        best["candidates"] = ranked
        if self.max_distance is not None and best["distance"] > self.max_distance:
            best["wordId"] = None
            best["wordLabel"] = "인식할 수 없음"
        return best

    def match_file(self, path, exclude_self=False):
        path = Path(path)
        recording = load_recording(path)
        return self.match_recording(
            recording,
            exclude_path=path if exclude_self else None,
        )
