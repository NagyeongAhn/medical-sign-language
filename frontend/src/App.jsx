import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_AI_API_URL ?? 'http://localhost:8000'
const BACKEND_API_BASE_URL =
  import.meta.env.VITE_BACKEND_API_URL ?? 'http://localhost:8080'
const MAX_WORDS = 5

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

const getSupportedMimeType = () => {
  const candidates = [
    'video/webm;codecs=vp8',
    'video/webm',
    'video/webm;codecs=vp9',
    'video/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function App() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const requestControllerRef = useRef(null)

  const [cameraState, setCameraState] = useState('loading')
  const [apiConnected, setApiConnected] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [captureMode, setCaptureMode] = useState('single')
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [activeStep, setActiveStep] = useState('capture')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const [words, setWords] = useState([])
  const [translationResult, setTranslationResult] = useState(null)
  const [translationError, setTranslationError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastRecording, setLastRecording] = useState(null)

  const connectCamera = useCallback(async () => {
    setCameraState('loading')
    setErrorMessage('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraState('ready')
    } catch {
      setCameraState('error')
      setErrorMessage(
        '카메라를 사용할 수 없습니다. 브라우저의 카메라 권한을 확인해주세요.',
      )
    }
  }, [])

  useEffect(() => {
    if (hasStarted) connectCamera()

    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false))

    return () => {
      clearInterval(timerRef.current)
      requestControllerRef.current?.abort()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [connectCamera, hasStarted])

  const analyzeVideo = async (videoBlob, mimeType, mode) => {
    setIsAnalyzing(true)
    setErrorMessage('')
    setActiveStep('review')
    requestControllerRef.current = new AbortController()

    const formData = new FormData()
    const extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    formData.append('video', videoBlob, `sign.${extension}`)

    try {
      const endpoint =
        mode === 'sequence'
          ? '/api/sign/analyze-sequence'
          : '/api/sign/analyze'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: requestControllerRef.current.signal,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail ?? '영상을 분석하지 못했습니다.')
      }

      setApiConnected(true)
      setTranslationResult(null)
      setTranslationError('')
      if (mode === 'sequence') {
        const recognizedWords = data.words.filter((word) => word.wordId)

        if (data.segmentCount === 1) {
          setErrorMessage(
            '영상에서 동작 구간을 하나만 찾았습니다. 단어 사이에 손을 완전히 멈춘 뒤 다시 촬영해주세요.',
          )
        } else if (recognizedWords.length < data.segmentCount) {
          setErrorMessage(
            `동작 구간 ${data.segmentCount}개 중 ${recognizedWords.length}개만 인식했습니다. 각 수어를 한 단어씩 다시 확인해주세요.`,
          )
        }

        setResult({
          wordId: recognizedWords.length > 0 ? 'sequence' : null,
          wordLabel:
            data.words.map((word) => word.wordLabel).join(' · ') ||
            '인식할 수 없음',
          isSequence: true,
        })
        setWords((currentWords) => {
          const remainingCount = MAX_WORDS - currentWords.length
          const newWords = recognizedWords
            .slice(0, remainingCount)
            .map((word, index) => ({
              id: `${word.wordId}-${Date.now()}-${index}`,
              wordId: word.wordId,
              label: word.wordLabel,
              confidence: word.confidence,
            }))
          return [...currentWords, ...newWords]
        })
      } else {
        setResult(data)
      }

      if (mode === 'single' && data.wordId) {
        setWords((currentWords) => {
          if (currentWords.length >= MAX_WORDS) return currentWords
          return [
            ...currentWords,
            {
              id: `${data.wordId}-${Date.now()}`,
              wordId: data.wordId,
              label: data.wordLabel,
              confidence: data.confidence,
            },
          ]
        })
      }
    } catch (error) {
      if (error.name === 'AbortError') return
      if (error.message === 'Failed to fetch') {
        setApiConnected(false)
        setErrorMessage(
          '분석 서버에 연결할 수 없습니다. Python API 실행 상태를 확인해주세요.',
        )
      } else {
        setApiConnected(true)
        setErrorMessage(error.message)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const startRecording = () => {
    if (!streamRef.current || cameraState !== 'ready' || isAnalyzing) return

    if (words.length >= MAX_WORDS) {
      setErrorMessage('단어는 최대 5개까지 추가할 수 있습니다.')
      return
    }

    const mimeType = getSupportedMimeType()
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : undefined,
    )
    chunksRef.current = []
    recorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, {
        type: mimeType || 'video/webm',
      })
      setLastRecording({
        blob: videoBlob,
        extension: videoBlob.type.startsWith('video/mp4') ? 'mp4' : 'webm',
      })
      analyzeVideo(videoBlob, mimeType || videoBlob.type, captureMode)
    }

    setResult(null)
    setErrorMessage('')
    setLastRecording(null)
    setElapsedSeconds(0)
    setIsRecording(true)
    recorder.start(200)

    const startedAt = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 250)
  }

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state !== 'recording') return
    recorderRef.current.stop()
    clearInterval(timerRef.current)
    setIsRecording(false)
  }

  const removeWord = (wordId) => {
    setTranslationResult(null)
    setTranslationError('')
    setWords((currentWords) =>
      currentWords.filter((word) => word.id !== wordId),
    )
  }

  const clearWords = () => {
    setWords([])
    setTranslationResult(null)
    setTranslationError('')
  }

  const translateWords = async () => {
    if (words.length === 0 || isTranslating) return

    setIsTranslating(true)
    setTranslationResult(null)
    setTranslationError('')
    setActiveStep('sentence')

    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/translations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            words: words.map((word) => ({
              wordId: word.wordId,
              wordLabel: word.label,
              confidence: word.confidence,
            })),
          }),
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ?? '자연스러운 문장으로 변환하지 못했습니다.',
        )
      }
      if (data.status !== 'COMPLETED' || !data.generatedSentence) {
        throw new Error(
          'Gemini 문장 생성에 실패했습니다. 백엔드 실행 로그를 확인해주세요.',
        )
      }

      setTranslationResult(data)
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        setTranslationError(
          '백엔드 서버에 연결할 수 없습니다. Spring Boot 실행 상태를 확인해주세요.',
        )
      } else {
        setTranslationError(error.message)
      }
    } finally {
      setIsTranslating(false)
    }
  }

  const resetResult = () => {
    setResult(null)
    setErrorMessage('')
  }

  const downloadLastRecording = () => {
    if (!lastRecording) return

    const url = URL.createObjectURL(lastRecording.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sign-diagnostic.${lastRecording.extension}`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className={`app-shell ${hasStarted ? 'is-workspace' : 'is-landing'}`}>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="손끝진료 홈"
          onClick={(event) => {
            event.preventDefault()
            setHasStarted(false)
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>손끝진료</span>
        </a>
        <nav className="topnav" aria-label="주요 메뉴">
          <a href="#studio" onClick={() => setHasStarted(true)}>
            수어 번역
          </a>
          <a href="#guide">이용 안내</a>
        </nav>
        <div
          className={`server-status ${apiConnected ? 'is-online' : ''}`}
          aria-live="polite"
        >
          <span className="status-dot" />
          {apiConnected ? '분석 서버 연결됨' : '분석 서버 확인 중'}
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="landing-copy">
            <p className="eyebrow">SIGN TO CARE</p>
            <h1>
              수어로 전하는
              <br />
              <span>나의 진료 이야기</span>
            </h1>
            <p className="intro-copy">
              의료 수어를 보여주면 단어를 인식하고 자연스러운 문장으로
              연결해드려요.
            </p>
            <div className="landing-actions">
              <button
                className="intro-cta"
                type="button"
                onClick={() => setHasStarted(true)}
              >
                번역 시작하기
                <span aria-hidden="true">→</span>
              </button>
              <p>서버의 분석용 영상은 처리 후 바로 삭제돼요.</p>
            </div>
          </div>
        </section>

        <section className="studio-shell" id="studio" aria-labelledby="studio-title">
          <div className="studio-window">
            <div className="studio-header">
              <div>
                <p>AI SIGN TRANSLATOR</p>
                <h2 id="studio-title">수어 번역 스튜디오</h2>
              </div>
              <span className="privacy-badge">서버에 영상 저장 안 함</span>
            </div>

            <div className="workflow-tabs" aria-label="번역 진행 단계">
              <button
                type="button"
                className={activeStep === 'capture' ? 'is-active' : ''}
                onClick={() => setActiveStep('capture')}
              >
                <span>1</span>
                수어 촬영
              </button>
              <button
                type="button"
                className={activeStep === 'review' ? 'is-active' : ''}
                onClick={() => setActiveStep('review')}
              >
                <span>2</span>
                단어 확인
              </button>
              <button
                type="button"
                className={activeStep === 'sentence' ? 'is-active' : ''}
                onClick={() => setActiveStep('sentence')}
                disabled={!translationResult && !translationError}
              >
                <span>3</span>
                문장 완성
              </button>
            </div>

            <div className={`studio-grid active-${activeStep}`}>
              <section className="camera-panel" aria-labelledby="camera-title">
                <div className="panel-heading">
                  <span className="step-number">01</span>
                  <div>
                    <h3 id="camera-title">카메라에 수어를 보여주세요</h3>
                    <p>얼굴, 상체와 양손이 화면 안에 보이면 좋아요.</p>
                  </div>
                </div>

                <div className="mode-switch" aria-label="촬영 모드">
                  <button
                    type="button"
                    className={captureMode === 'single' ? 'is-active' : ''}
                    onClick={() => setCaptureMode('single')}
                    disabled={isRecording || isAnalyzing}
                  >
                    한 단어
                    <span>정확하게 한 개씩</span>
                  </button>
                  <button
                    type="button"
                    className={captureMode === 'sequence' ? 'is-active' : ''}
                    onClick={() => setCaptureMode('sequence')}
                    disabled={isRecording || isAnalyzing}
                  >
                    연속 단어
                    <span>사이에 1.5초 정지</span>
                  </button>
                </div>

                <div className={`camera-frame ${isRecording ? 'is-recording' : ''}`}>
                  <video ref={videoRef} autoPlay muted playsInline />

                  {cameraState !== 'ready' && (
                    <div className="camera-placeholder">
                      <span className="camera-symbol" aria-hidden="true" />
                      <strong>
                        {cameraState === 'loading'
                          ? '카메라를 준비하고 있어요'
                          : '카메라 권한이 필요해요'}
                      </strong>
                      <p>
                        {cameraState === 'loading'
                          ? '잠시만 기다려주세요.'
                          : '권한을 허용한 뒤 다시 시도해주세요.'}
                      </p>
                      {cameraState === 'error' && (
                        <button type="button" onClick={connectCamera}>
                          다시 연결
                        </button>
                      )}
                    </div>
                  )}

                  <div className="camera-guide" aria-hidden="true">
                    <span className="corner top-left" />
                    <span className="corner top-right" />
                    <span className="corner bottom-left" />
                    <span className="corner bottom-right" />
                    <div className="body-guide">
                      <span className="guide-head" />
                      <span className="guide-shoulders" />
                    </div>
                  </div>

                  <div className="camera-status">
                    {isRecording ? (
                      <span className="recording-label">
                        <span className="recording-dot" />
                        REC {formatTime(elapsedSeconds)}
                      </span>
                    ) : (
                      <span>LIVE</span>
                    )}
                  </div>
                </div>

                <div className="capture-controls">
                  {!isRecording ? (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={startRecording}
                      disabled={cameraState !== 'ready' || isAnalyzing}
                    >
                      <span className="button-record-icon" />
                      {isAnalyzing
                        ? '분석 중...'
                        : captureMode === 'sequence'
                          ? '연속 촬영 시작'
                          : '촬영 시작'}
                    </button>
                  ) : (
                    <button
                      className="stop-button"
                      type="button"
                      onClick={stopRecording}
                    >
                      <span className="button-stop-icon" />
                      촬영 종료 및 분석
                    </button>
                  )}
                  <p>
                    {captureMode === 'sequence'
                      ? '단어 사이에 손을 약 1.5초 멈춰주세요.'
                      : '한 단어를 천천히 표현한 뒤 촬영을 종료해주세요.'}
                  </p>
                </div>
              </section>

              <aside className="translation-panel">
                <div className="review-toolbar">
                  <div>
                    <strong>인식 결과를 확인해주세요</strong>
                    <p>단어를 더 추가하거나 문장으로 완성할 수 있어요.</p>
                  </div>
                  <button type="button" onClick={() => setActiveStep('capture')}>
                    + 수어 더 촬영하기
                  </button>
                </div>
                <section className="result-section" aria-live="polite">
                  <div className="panel-heading">
                    <span className="step-number sky">02</span>
                    <div>
                      <h3>방금 인식한 단어</h3>
                      <p>촬영 결과를 바로 확인할 수 있어요.</p>
                    </div>
                  </div>

                  <div
                    className={`result-content ${
                      result?.wordId === null ? 'is-unknown' : ''
                    }`}
                  >
                    {isAnalyzing ? (
                      <div className="analyzing-state">
                        <span className="analysis-spinner" />
                        <strong>수어를 분석하고 있어요</strong>
                        <p>손과 상체의 움직임을 비교 중입니다.</p>
                      </div>
                    ) : result ? (
                      <>
                        <p className="result-kicker">
                          {result.wordId ? '인식된 단어' : '다시 촬영해주세요'}
                        </p>
                        <strong
                          className={`result-word ${
                            result.isSequence ? 'is-sequence' : ''
                          }`}
                        >
                          {result.wordLabel}
                        </strong>
                        <button
                          className="text-button"
                          type="button"
                          onClick={resetResult}
                        >
                          결과 닫기
                        </button>
                        {lastRecording && (
                          <button
                            className="text-button"
                            type="button"
                            onClick={downloadLastRecording}
                          >
                            진단용 영상 저장
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="empty-result">
                        <span aria-hidden="true">가</span>
                        <strong>촬영을 기다리고 있어요</strong>
                        <p>왼쪽 카메라에서 수어를 보여주세요.</p>
                      </div>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="error-message" role="alert">
                      <span>!</span>
                      {errorMessage}
                    </div>
                  )}
                  {!result && errorMessage && lastRecording && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={downloadLastRecording}
                    >
                      진단용 영상 저장
                    </button>
                  )}
                </section>

                <section className="words-section" aria-labelledby="words-title">
                  <div className="panel-heading words-heading">
                    <span className="step-number blue">03</span>
                    <div>
                      <h3 id="words-title">인식된 단어 모음</h3>
                      <p>최대 5개까지 순서대로 담을 수 있어요.</p>
                    </div>
                    <span className="word-count">
                      <strong>{words.length}</strong> / {MAX_WORDS}
                    </span>
                  </div>

                  <div className="word-list">
                    {words.length > 0 ? (
                      words.map((word, index) => (
                        <div className="word-chip" key={word.id}>
                          <span className="word-order">{index + 1}</span>
                          <span>{word.label}</span>
                          <button
                            type="button"
                            onClick={() => removeWord(word.id)}
                            aria-label={`${word.label} 삭제`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <p>인식한 단어가 이곳에 차례대로 담깁니다.</p>
                    )}
                  </div>

                  {words.length > 0 && (
                    <div className="translation-actions">
                      <button
                        className="translate-button"
                        type="button"
                        onClick={translateWords}
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <>
                            <span className="button-spinner" />
                            문장을 만들고 있어요
                          </>
                        ) : (
                          '자연스러운 문장 만들기'
                        )}
                      </button>
                      <button
                        className="clear-button"
                        type="button"
                        onClick={clearWords}
                        disabled={isTranslating}
                      >
                        전체 지우기
                      </button>
                    </div>
                  )}
                </section>
              </aside>
            </div>

            {activeStep === 'sentence' &&
              (translationResult || translationError || isTranslating) && (
              <section
                className={`sentence-card ${
                  translationError ? 'has-error' : ''
                }`}
                aria-live="polite"
              >
                <div className="sentence-heading">
                  <span className="step-number deep-blue">04</span>
                  <div>
                    <p>환자의 문장</p>
                    <h2>자연스러운 한국어 변환</h2>
                  </div>
                  <button
                    className="sentence-back-button"
                    type="button"
                    onClick={() => setActiveStep('review')}
                  >
                    단어 다시 확인
                  </button>
                </div>

                {isTranslating ? (
                  <div className="sentence-loading">
                    <span className="analysis-spinner" />
                    <strong>단어의 의미를 문장으로 연결하고 있어요</strong>
                  </div>
                ) : translationError ? (
                  <div className="sentence-error" role="alert">
                    <strong>문장을 만들지 못했습니다.</strong>
                    <p>{translationError}</p>
                  </div>
                ) : (
                  <>
                    <blockquote>{translationResult.generatedSentence}</blockquote>
                    <div className="sentence-source">
                      <span>인식 단어</span>
                      <p>{words.map((word) => word.label).join(' · ')}</p>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>

          <aside className="floating-guide" id="guide">
            <div>
              <span aria-hidden="true">✦</span>
              <strong>더 잘 인식하려면</strong>
            </div>
            <ul>
              <li>밝은 곳에서 카메라 정면을 바라봐주세요.</li>
              <li>얼굴, 상체와 양손이 모두 보이게 해주세요.</li>
              <li>
                {captureMode === 'sequence'
                  ? '단어 사이마다 손을 약 1.5초 멈춰 구분해주세요.'
                  : '한 번 촬영할 때 한 단어만 표현해주세요.'}
              </li>
            </ul>
          </aside>
        </section>

        <section className="process-section" aria-label="이용 순서">
          <p>HOW IT WORKS</p>
          <div>
            <article>
              <span>01</span>
              <strong>수어 촬영</strong>
              <p>카메라 앞에서 의료 수어를 표현해요.</p>
            </article>
            <article>
              <span>02</span>
              <strong>단어 확인</strong>
              <p>인식된 단어를 순서대로 모아 확인해요.</p>
            </article>
            <article>
              <span>03</span>
              <strong>문장 완성</strong>
              <p>모은 단어를 자연스러운 문장으로 바꿔요.</p>
            </article>
          </div>
        </section>
      </main>

      <footer>
        <p>
          서버의 분석용 영상은 처리 후 삭제됩니다. 진단용 저장 버튼을 누르면
          본인 기기에만 저장됩니다.
        </p>
        <span>의료 수어 소통 프로토타입</span>
      </footer>
    </div>
  )
}

export default App
