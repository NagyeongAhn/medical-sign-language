import json
import os
from pathlib import Path

import httpx


DEFAULT_SIGN_WORD_API_URL = "http://localhost:8080/api/sign-words"
CACHE_PATH = Path(__file__).resolve().parents[1] / ".cache" / "sign_words.json"
DEFAULT_WORDS_PATH = Path(__file__).resolve().parents[1] / "sign_words.default.json"


def load_word_definitions():
    api_url = os.getenv("SIGN_WORD_API_URL", DEFAULT_SIGN_WORD_API_URL)

    try:
        response = httpx.get(api_url, timeout=3.0)
        response.raise_for_status()
        definitions = _to_definitions(response.json())
        try:
            _save_cache(definitions)
        except OSError as error:
            print(f"[단어 사전] 동기화 캐시를 저장하지 못했습니다. ({error})")
        print(f"[단어 사전] Spring Boot에서 {len(definitions)}개를 불러왔습니다.")
        return definitions
    except (httpx.HTTPError, ValueError, TypeError) as error:
        cached_definitions = _load_cache()
        if cached_definitions:
            print(
                "[단어 사전] Spring Boot에 연결하지 못해 "
                f"마지막 동기화 목록 {len(cached_definitions)}개를 사용합니다. "
                f"({error})"
            )
            return cached_definitions

        default_definitions = _load_default_words()
        print(
            "[단어 사전] Spring Boot에 연결하지 못해 "
            f"기본 목록 {len(default_definitions)}개를 사용합니다. "
            f"({error})"
        )
        return default_definitions


def _load_default_words():
    try:
        with DEFAULT_WORDS_PATH.open(encoding="utf-8") as file:
            return _to_definitions(json.load(file))
    except (OSError, ValueError) as error:
        raise RuntimeError(
            f"기본 단어 목록({DEFAULT_WORDS_PATH.name})을 읽을 수 없습니다: {error}"
        ) from error


def _to_definitions(words):
    if not isinstance(words, list):
        raise ValueError("단어 사전 응답은 배열이어야 합니다.")

    definitions = {}
    for word in words:
        recording_key = str(word.get("recordingKey", "")).strip()
        word_id = str(word.get("wordId", "")).strip()
        word_label = str(word.get("wordLabel", "")).strip()

        if len(recording_key) != 1 or not word_id or not word_label:
            continue
        if recording_key in definitions:
            raise ValueError(f"중복 촬영 키입니다: {recording_key}")

        definitions[recording_key] = {
            "wordId": word_id,
            "wordLabel": word_label,
        }

    if not definitions:
        raise ValueError("사용 가능한 수어 단어가 없습니다.")

    return definitions


def _save_cache(definitions):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CACHE_PATH.open("w", encoding="utf-8") as file:
        json.dump(definitions, file, ensure_ascii=False, indent=2)


def _load_cache():
    if not CACHE_PATH.exists():
        return None

    try:
        with CACHE_PATH.open(encoding="utf-8") as file:
            cached = json.load(file)
        return _to_definitions(
            [
                {
                    "recordingKey": key,
                    "wordId": word["wordId"],
                    "wordLabel": word["wordLabel"],
                }
                for key, word in cached.items()
            ]
        )
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
        return None
