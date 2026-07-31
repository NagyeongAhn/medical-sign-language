import json
from copy import deepcopy
from pathlib import Path

from services.word_catalog import load_word_definitions


WORD_DEFINITIONS = load_word_definitions()


class RecordingService:
    def __init__(self, recordings_directory):
        self.recordings_directory = Path(recordings_directory)
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

        sample_number = self._next_sample_number(word_directory)
        sample_id = f"{word_id}_{sample_number:03d}"
        output_path = word_directory / f"sample_{sample_number:03d}.json"
        recording_data = {
            "wordId": word_id,
            "wordLabel": self.active_word["wordLabel"],
            "sampleId": sample_id,
            "durationMs": self.frames[-1]["timestampMs"],
            "frameCount": len(self.frames),
            "frames": self.frames,
        }

        with output_path.open("w", encoding="utf-8") as file:
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

    @staticmethod
    def _next_sample_number(word_directory):
        numbers = []
        for path in word_directory.glob("sample_*.json"):
            try:
                numbers.append(int(path.stem.split("_")[-1]))
            except ValueError:
                continue
        return max(numbers, default=0) + 1

    def _reset(self):
        self.active_word = None
        self.test_mode = False
        self.frames = []
        self.started_at_ms = None
