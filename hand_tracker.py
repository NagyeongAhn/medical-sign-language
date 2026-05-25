import cv2
import mediapipe as mp
import time

# MediaPipe의 손 인식 모듈 초기화
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# 손 인식 모델 설정 (최대 1개의 손만 인식, 최소 신뢰도 70%)
hands = mp_hands.Hands(
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)

# 맥북 내장 웹캠 켜기 (0번 또는 맥북 전면 카메라 매칭)
cap = cv2.VideoCapture(0)

# 좌표를 콘솔에 기록할 시간 간격 (단위: 초)
INTERVAL = 0.5
last_recorded_time = time.time()

print("시연을 시작합니다. 웹캠 화면에서 손을 움직여 보세요!")
print(f"현재 설정된 데이터 출력 간격: {INTERVAL}초에 한 번")
print("프로그램을 종료하려면 웹캠 창을 클릭한 후 'q'를 누르세요.")

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

    # ⏱️ 루프가 돌 때마다 현재 시간을 측정합니다.
    current_time = time.time()

    # 손이 인식되었을 때 실행
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # 1. 화면에는 프레임 드랍 없이 손가락 마디와 선을 실시간으로 부드럽게 그려주기
            mp_drawing.draw_landmarks(image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            # 2. 설정한 초 간격(INTERVAL)이 지났는지 타이밍 확인하기
            if current_time - last_recorded_time >= INTERVAL:
                # 검지손가락 끝(8번 변수)의 좌표 데이터 추출하기
                index_finger_tip = hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP]
                
                # 콘솔창에 정해진 시간 간격마다 딱 한 번씩만 x, y, z 좌표 출력
                print(f"[기록] 검지 끝 -> X: {index_finger_tip.x:.2f}, Y: {index_finger_tip.y:.2f}, Z: {index_finger_tip.z:.2f}")
                
                # 기록이 완료되었으므로 기준이 되는 마지막 기록 시간을 현재 시간으로 리셋
                last_recorded_time = current_time

    # 화면에 카메라 영상 띄우기
    cv2.imshow('MediaPipe Hand Test', image)

    # 'q' 키를 누르면 프로그램 종료
    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

# 메모리 해제 및 창 닫기
cap.release()
cv2.destroyAllWindows()