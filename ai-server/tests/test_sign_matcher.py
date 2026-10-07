import sys
import unittest
from pathlib import Path

import numpy as np


AI_SERVER_DIRECTORY = Path(__file__).resolve().parents[1]
if str(AI_SERVER_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(AI_SERVER_DIRECTORY))

from comparison.sign_matcher import SignMatcher


class SignMatcherTest(unittest.TestCase):
    def setUp(self):
        self.sick = np.linspace(0, 1, 18)[:, None]
        self.help = np.linspace(3, 4, 18)[:, None]
        self.matcher = SignMatcher("unused", neighbors=1, max_distance=0.4)
        self.matcher.references = [
            {"wordId": "sick", "wordLabel": "아프다", "features": self.sick},
            {"wordId": "help", "wordLabel": "도와주세요", "features": self.help},
        ]

    def test_recognizes_two_signs_without_pause(self):
        features = np.vstack((self.sick, self.help))
        timestamps = list(range(0, 3600, 100))

        words = self.matcher.match_feature_sequence(features, timestamps)

        self.assertEqual([word["wordId"] for word in words], ["sick", "help"])
        self.assertLess(words[0]["endMs"], words[1]["startMs"])

    def test_recognizes_five_signs_through_the_same_path(self):
        references = []
        parts = []
        for index in range(5):
            part = np.linspace(index * 3, index * 3 + 1, 18)[:, None]
            parts.append(part)
            references.append({
                "wordId": f"word_{index}",
                "wordLabel": f"단어 {index}",
                "features": part,
            })
        self.matcher.references = references
        features = np.vstack(parts)
        timestamps = list(range(0, len(features) * 100, 100))

        words = self.matcher.match_feature_sequence(features, timestamps)

        self.assertEqual(
            [word["wordId"] for word in words],
            [f"word_{index}" for index in range(5)],
        )

    def test_does_not_split_a_single_sign_without_evidence(self):
        timestamps = list(range(0, 1800, 100))

        words = self.matcher.match_feature_sequence(self.sick, timestamps)

        self.assertEqual([word["wordId"] for word in words], ["sick"])

    def test_rejects_unrelated_motion(self):
        features = np.full((18, 1), 10.0)
        timestamps = list(range(0, 1800, 100))

        words = self.matcher.match_feature_sequence(features, timestamps)

        self.assertEqual([word["wordId"] for word in words], [None])

    def test_requires_reference_samples(self):
        self.matcher.references = []
        timestamps = list(range(0, 1800, 100))

        with self.assertRaisesRegex(ValueError, "기준 샘플을 먼저 수집"):
            self.matcher.match_feature_sequence(self.sick, timestamps)


if __name__ == "__main__":
    unittest.main()
