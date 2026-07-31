import sys
import unittest
from pathlib import Path


AI_SERVER_DIRECTORY = Path(__file__).resolve().parents[1]
if str(AI_SERVER_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(AI_SERVER_DIRECTORY))

from services.word_catalog import _to_definitions


class WordCatalogTest(unittest.TestCase):
    def test_converts_spring_word_response_to_recording_keys(self):
        definitions = _to_definitions(
            [
                {
                    "wordId": "hospital",
                    "wordLabel": "병원",
                    "category": "PLACE",
                    "recordingKey": "1",
                    "displayOrder": 1,
                },
                {
                    "wordId": "doctor",
                    "wordLabel": "의사",
                    "category": "PERSON",
                    "recordingKey": "4",
                    "displayOrder": 4,
                },
            ]
        )

        self.assertEqual(
            definitions,
            {
                "1": {"wordId": "hospital", "wordLabel": "병원"},
                "4": {"wordId": "doctor", "wordLabel": "의사"},
            },
        )

    def test_rejects_duplicate_recording_key(self):
        with self.assertRaisesRegex(ValueError, "중복 촬영 키"):
            _to_definitions(
                [
                    {
                        "wordId": "hospital",
                        "wordLabel": "병원",
                        "recordingKey": "1",
                    },
                    {
                        "wordId": "doctor",
                        "wordLabel": "의사",
                        "recordingKey": "1",
                    },
                ]
            )


if __name__ == "__main__":
    unittest.main()
