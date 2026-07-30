import cv2
import mediapipe as mp
import time

# MediaPipe의 손 인식 모듈 초기화
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# 손 인식 모델 설정 (최대 1개의 손만 인식, 최소 신뢰도 70%)
hands = mp_hands.Hands(
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

# 맥북 내장 웹캠 켜기 (0번 또는 맥북 전면 카메라 매칭)
cap = cv2.VideoCapture(0)

# 좌표 및 단어를 분석할 시간 간격 (단위: 초)
# 0.5초에 한 번씩 손모양을 분석해 단어를 매칭합니다.
INTERVAL = 0.5
last_recorded_time = time.time()

# 변환된 수어 텍스트를 저장할 변수 (화면 및 로그 표시용)
current_sign_text = "카메라에 손을 보여주세요"

print("의료 수어-텍스트 변환 시연을 시작합니다.")
print("1. 검지만 펴기 = '병원' | 2. 주먹 쥐기 = '아프다' | 3. 손바닥 다 펴기 = '정상'")
print("종료하려면 웹캠 창을 클릭한 후 'q'를 누르세요.")

while cap.isOpened():
    success, image = cap.read()
    if not success:
        print("웹캠 입력을 가져올 수 없습니다. (맥북 카메라 권한을 확인하세요)")
        break

    # 이미지 거울 반전 및 BGR에서 RGB로 변환 (MediaPipe는 RGB를 사용함)
    image = cv2.flip(image, 1)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # AI 모델에 이미지를 넣어 손가락 좌표 결과 처리
    results = hands.process(image_rgb)

    # 루프가 돌 때마다 현재 시간을 계산
    current_time = time.time()

    # 손이 인식되었을 때 실행
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # 1. 화면에는 프레임 드랍 없이 손가락 마디와 선을 실시간으로 부드럽게 그려주기
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # 2. 설정한 초 간격(INTERVAL)이 지났는지 타이밍 확인하기
            if current_time - last_recorded_time >= INTERVAL:
                
                # [알고리즘] 주요 손가락 끝(Tip)과 바로 아래 마디(PIP) 위치 추출
                # MediaPipe의 Y좌표는 위로 갈수록 0에 가깝고(작고), 아래로 갈수록 1에 가깝습니다(큼).
                thumb_tip = hand_landmarks.landmark[mp_hands.HandLandmark.THUMB_TIP]
                
                index_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                index_pip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_PIP]
                
                middle_tip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]
                middle_pip = hand_landmarks.landmark[mp_hands.HandLandmark.MIDDLE_FINGER_PIP]
                
                ring_tip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_TIP]
                ring_pip = hand_landmarks.landmark[mp_hands.HandLandmark.RING_FINGER_PIP]
                
                pinky_tip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_TIP]
                pinky_pip = hand_landmarks.landmark[mp_hands.HandLandmark.PINKY_PIP]

                # 손가락이 펴졌는지 여부 체크 (끝마디 Y가 아래마디 Y보다 작으면 위로 펴진 상태)
                index_open = index_tip.y < index_pip.y
                middle_open = middle_tip.y < middle_pip.y
                ring_open = ring_tip.y < ring_pip.y
                pinky_open = pinky_tip.y < pinky_pip.y

                # 규칙 매핑 조건문 (가짜 백엔드 로직)
                if index_open and not middle_open and not ring_open and not pinky_open:
                    current_sign_text = "병원 (Hospital)"
                elif not index_open and not middle_open and not ring_open and not pinky_open:
                    current_sign_text = "아프다 (Sick)"
                elif index_open and middle_open and ring_open and pinky_open:
                    current_sign_text = "정상 (Normal)"
                else:
                    current_sign_text = "분석 중..."

                # 콘솔창에 정해진 시간 간격마다 변환 단어 출력
                print(f"[수어 변환 결과] -> {current_sign_text}")
                
                # 기준이 되는 마지막 기록 시간을 현재 시간으로 리셋
                last_recorded_time = current_time
    else:
        current_sign_text = "손을 인식하지 못했습니다."

    # 웹캠 화면 왼쪽 위에 결과 텍스트 띄우기 (가독성을 위한 배경 상자 포함)
    cv2.rectangle(image, (20, 20), (420, 80), (0, 0, 0), -1)
    cv2.putText(image, current_sign_text, (30, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)

    # 화면에 카메라 영상 띄우기
    cv2.imshow('MediaPipe Hand Test', image)

    # 'q' 키를 누르면 프로그램 종료
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

# 메모리 해제 및 창 닫기
cap.release()
cv2.destroyAllWindows()
