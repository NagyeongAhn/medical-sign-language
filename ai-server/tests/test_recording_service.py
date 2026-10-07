import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


AI_SERVER_DIRECTORY = Path(__file__).resolve().parents[1]
if str(AI_SERVER_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(AI_SERVER_DIRECTORY))

from services.recording_service import RecordingService


class RecordingServiceTest(unittest.TestCase):
    def test_different_collectors_do_not_overwrite_same_word(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = []
            with patch(
                "services.recording_service.WORD_DEFINITIONS",
                {"2": {"wordId": "sick", "wordLabel": "아프다"}},
            ):
                for signer_id in ("participant_01", "participant_02"):
                    service = RecordingService(directory, signer_id=signer_id)
                    self.assertTrue(service.start("2"))
                    service.add_frame({"timestampMs": 1000, "hands": {}})
                    service.add_frame({"timestampMs": 1100, "hands": {}})
                    paths.append(service.stop_and_save())

            self.assertNotEqual(paths[0], paths[1])
            for path, signer_id in zip(paths, ("participant_01", "participant_02")):
                recording = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(recording["signerId"], signer_id)
                self.assertEqual(recording["wordId"], "sick")

    def test_rejects_unsafe_signer_id(self):
        with self.assertRaises(ValueError):
            RecordingService("unused", signer_id="../person")


if __name__ == "__main__":
    unittest.main()
