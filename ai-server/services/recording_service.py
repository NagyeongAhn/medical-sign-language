import json
import os
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from services.word_catalog import load_word_definitions


WORD_DEFINITIONS = load_word_definitions()
SIGNER_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{1,32}")


class RecordingService:
    def __init__(self, recordings_directory, signer_id=None):
        self.recordings_directory = Path(recordings_directory)
        self.signer_id = signer_id or os.getenv("SIGNER_ID") or f"anon_{uuid4().hex[:8]}"
        if not SIGNER_ID_PATTERN.fullmatch(self.signer_id):
            raise ValueError("SIGNER_ID는 영문, 숫자, 밑줄, 하이픈으로 된 1~32자여야 합니다.")
        self.active_word = None
        self.test_mode = False
        self.frames = []
        self.started_at_ms = None

    @property
    def is_recording(self):
        return self.active_word is not None or self.test_mode

    @property
    def is_test_recording(self):
        return self.test_mode

    def start(self, key):
        if self.is_recording or key not in WORD_DEFINITIONS:
            return False

        self.active_word = WORD_DEFINITIONS[key]
        self.frames = []
        self.started_at_ms = None
        return True

    def start_test(self):
        if self.is_recording:
            return False

        self.test_mode = True
        self.frames = []
        self.started_at_ms = None
        return True

    def add_frame(self, frame_data):
        if not self.is_recording:
            return

        frame = deepcopy(frame_data)
        if self.started_at_ms is None:
            self.started_at_ms = frame["timestampMs"]

        frame["frameIndex"] = len(self.frames)
        frame["timestampMs"] -= self.started_at_ms
        self.frames.append(frame)

    def stop_and_save(self):
        if not self.is_recording or self.is_test_recording:
            return None

        if not self.frames:
            self._reset()
            return None

        word_id = self.active_word["wordId"]
        word_directory = self.recordings_directory / word_id
        word_directory.mkdir(parents=True, exist_ok=True)

        unique_id = uuid4().hex
        sample_id = f"{word_id}_{self.signer_id}_{unique_id}"
        output_path = word_directory / f"sample_{self.signer_id}_{unique_id}.json"
        recording_data = {
            "wordId": word_id,
            "wordLabel": self.active_word["wordLabel"],
            "sampleId": sample_id,
            "signerId": self.signer_id,
            "capturedAtUtc": datetime.now(timezone.utc).isoformat(),
            "durationMs": self.frames[-1]["timestampMs"],
            "frameCount": len(self.frames),
            "frames": self.frames,
        }

        with output_path.open("x", encoding="utf-8") as file:
            json.dump(recording_data, file, ensure_ascii=False, indent=2)

        self._reset()
        return output_path

    def stop_test(self):
        if not self.is_test_recording:
            return None

        if not self.frames:
            self._reset()
            return None

        recording_data = {
            "wordId": None,
            "wordLabel": None,
            "sampleId": "test",
            "durationMs": self.frames[-1]["timestampMs"],
            "frameCount": len(self.frames),
            "frames": self.frames,
        }
        self._reset()
        return recording_data

    def _reset(self):
        self.active_word = None
        self.test_mode = False
        self.frames = []
        self.started_at_ms = None
