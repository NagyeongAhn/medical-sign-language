import os
import time
from pathlib import Path

import cv2

from comparison.sign_matcher import SignMatcher
from models.frame_data import build_frame_data
from services.recording_service import (
    RecordingService,
    SIGNER_ID_PATTERN,
    WORD_DEFINITIONS,
)
from trackers.face_tracker import FaceTracker
from trackers.hand_tracker import HandTracker
from trackers.pose_tracker import PoseTracker


def prompt_signer_id():
    default_id = os.getenv("SIGNER_ID", "")
    suffix = f" [기본값: {default_id}]" if default_id else ""
    print("촬영자 코드는 영문, 숫자, 밑줄, 하이픈 1~32자입니다. (예: p01)")
    print("이름, 학번 등 개인 식별 정보는 사용하지 마세요.")
    while True:
        signer_id = input(f"촬영자 코드를 입력하세요{suffix}: ").strip() or default_id
        if SIGNER_ID_PATTERN.fullmatch(signer_id):
            return signer_id
        print("[안내] 올바른 촬영자 코드를 입력하세요.")


def count_saved_samples(recordings_directory, signer_id):
    counts = {}
    for word in WORD_DEFINITIONS.values():
        word_directory = recordings_directory / word["wordId"]
        counts[word["wordId"]] = len(
            list(word_directory.glob(f"sample_{signer_id}_*.json"))
        )
    return counts


def main():
    recordings_directory = Path(__file__).parent / "recordings"
    signer_id = prompt_signer_id()
    hand_tracker = HandTracker()
    pose_tracker = PoseTracker()
    face_tracker = FaceTracker()
    recording_service = RecordingService(recordings_directory, signer_id)
    sign_matcher = SignMatcher(recordings_directory)
    reference_count = sign_matcher.load_references()
    cap = cv2.VideoCapture(0)

    recording_started_at = time.time()
    frame_index = 0
    current_sign_text = "SHOW YOUR HANDS"
    analysis_result_text = ""

    print("의료 수어-텍스트 변환 시연을 시작합니다.")
    print(f"기준 수어 샘플 {reference_count}개를 불러왔습니다.")
    print(f"촬영자 코드: {recording_service.signer_id}")
    for skipped in sign_matcher.skipped_references:
        print(
            f'[기준 샘플 제외] {skipped["path"].name}: '
            f'{skipped["reason"]}'
        )
    print("양손과 상체, 얼굴 핵심 좌표를 인식합니다.")
    word_menu = [
        f'{key}: {word["wordLabel"]}'
        for key, word in WORD_DEFINITIONS.items()
    ]
    for start in range(0, len(word_menu), 4):
        print(" | ".join(word_menu[start:start + 4]))
    print("표시된 키: 촬영 시작 | Space: 촬영 종료 및 JSON 저장")
    print("0: 테스트 촬영 시작 | Space: 촬영 종료 및 즉시 분석")
    print("종료하려면 웹캠 창을 클릭한 후 Esc를 누르세요.")

    try:
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                print("웹캠 입력을 가져올 수 없습니다. (카메라 권한을 확인하세요)")
                break

            image = cv2.flip(image, 1)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            current_time = time.time()

            detected_hands = hand_tracker.process(image_rgb)
            hand_coordinates = hand_tracker.coordinates(detected_hands)
            upper_body_coordinates = pose_tracker.process(image_rgb)
            face_coordinates = face_tracker.process(image_rgb)

            frame_data = build_frame_data(
                frame_index=frame_index,
                timestamp_ms=round((current_time - recording_started_at) * 1000),
                hands=hand_coordinates,
                upper_body=upper_body_coordinates,
                face=face_coordinates,
            )
            frame_index += 1
            recording_service.add_frame(frame_data)

            hand_tracker.draw(image, detected_hands)
            pose_tracker.draw(image, upper_body_coordinates)
            face_tracker.draw(image, face_coordinates)

            if detected_hands:
                detected_labels = ", ".join(
                    hand["label"]
                    for hand in detected_hands
                )
                current_sign_text = f"HANDS: {detected_labels}"
            else:
                current_sign_text = "NO HANDS DETECTED"

            cv2.rectangle(image, (20, 20), (760, 80), (0, 0, 0), -1)
            cv2.putText(
                image,
                current_sign_text,
                (30, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 255, 255),
                2,
                cv2.LINE_AA,
            )

            cv2.putText(
                image,
                f"SIGNER: {recording_service.signer_id}",
                (30, 140),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

            if recording_service.is_recording:
                if recording_service.is_test_recording:
                    recording_label = "TEST"
                else:
                    recording_label = recording_service.active_word["wordId"].upper()
                cv2.putText(
                    image,
                    f"REC: {recording_label} | SPACE TO FINISH",
                    (30, 110),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                    cv2.LINE_AA,
                )
            elif analysis_result_text:
                cv2.putText(
                    image,
                    analysis_result_text,
                    (30, 110),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 165, 255),
                    2,
                    cv2.LINE_AA,
                )

            cv2.imshow("MediaPipe Sign Tracker", image)

            key = cv2.waitKey(5) & 0xFF
            key_character = chr(key) if key != 255 else ""

            if key_character in WORD_DEFINITIONS:
                if recording_service.start(key_character):
                    word = WORD_DEFINITIONS[key_character]
                    analysis_result_text = ""
                    print(f'[촬영 시작] {word["wordLabel"]} ({word["wordId"]})')
                else:
                    print("[안내] 진행 중인 촬영을 Space로 먼저 저장하세요.")
            elif key_character == "0":
                if recording_service.start_test():
                    analysis_result_text = ""
                    print("[테스트 촬영 시작] 수어를 한 뒤 Space를 누르세요.")
                else:
                    print("[안내] 진행 중인 촬영을 Space로 먼저 종료하세요.")
            elif key == 32:
                if recording_service.is_test_recording:
                    test_recording = recording_service.stop_test()
                    if test_recording:
                        try:
                            result = sign_matcher.match_recording(test_recording)
                            result_id = result["wordId"] or "unknown"
                            analysis_result_text = (
                                f'RESULT: {result_id.upper()} | '
                                f'{result["confidence"]:.1%}'
                            )
                            print(
                                f'[분석 결과] {result["wordLabel"]} | '
                                f'거리: {result["distance"]:.4f} | '
                                f'유사도: {result["confidence"]:.1%}'
                            )
                        except ValueError as error:
                            analysis_result_text = "RESULT: ANALYSIS FAILED"
                            print(f"[분석 실패] {error}")
                    else:
                        print("[안내] 분석할 테스트 프레임이 없습니다.")
                else:
                    saved_path = recording_service.stop_and_save()
                    if saved_path:
                        print(f"[저장 완료] {saved_path}")
                        saved_counts = count_saved_samples(
                            recordings_directory,
                            recording_service.signer_id,
                        )
                        print(
                            f"[{recording_service.signer_id} 누적] "
                            + " | ".join(
                                f'{word["wordLabel"]} {saved_counts[word["wordId"]]}개'
                                for word in WORD_DEFINITIONS.values()
                            )
                        )
                    else:
                        print("[안내] 저장할 촬영 데이터가 없습니다.")
            elif key == 27:
                break
    finally:
        cap.release()
        hand_tracker.close()
        pose_tracker.close()
        face_tracker.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
