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
  const [captureMode, setCaptureMode] = useState('single')
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isTranslating, setIsTranslating] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const [words, setWords] = useState([])
  const [translationResult, setTranslationResult] = useState(null)
  const [translationError, setTranslationError] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
    connectCamera()

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
  }, [connectCamera])

  const analyzeVideo = async (videoBlob, mimeType, mode) => {
    setIsAnalyzing(true)
    setErrorMessage('')
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

        setResult({
          wordId: recognizedWords.length > 0 ? 'sequence' : null,
          wordLabel:
            recognizedWords.map((word) => word.wordLabel).join(' · ') ||
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
      analyzeVideo(videoBlob, mimeType || videoBlob.type, captureMode)
    }

    setResult(null)
    setErrorMessage('')
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="손끝진료 홈">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>손끝진료</span>
        </a>
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
          <div>
            <p className="eyebrow">SIGN TO CARE</p>
            <h1>
              수어로 전하는
              <br />
              <span>나의 진료 이야기</span>
            </h1>
          </div>
          <p className="intro-copy">
            카메라를 향해 의료 수어 한 단어를 보여주세요.
            <br />
            촬영이 끝나면 바로 분석해드려요.
          </p>
        </section>

        <div className="workspace-grid">
          <section className="camera-card" aria-labelledby="camera-title">
            <div className="card-heading">
              <div>
                <span className="step-number">01</span>
                <div>
                  <h2 id="camera-title">수어 촬영</h2>
                  <p>상체와 양손이 화면 안에 보이도록 해주세요.</p>
                </div>
              </div>
              <span className="privacy-badge">저장하지 않음</span>
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
                <span>사이에 0.8초 정지</span>
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
                  ? '단어 사이에 손을 약 0.8초 멈춰주세요.'
                  : '한 단어를 천천히 수행한 뒤 촬영을 종료해주세요.'}
              </p>
            </div>
          </section>

          <aside className="side-panel">
            <section className="result-card" aria-live="polite">
              <div className="card-heading compact">
                <div>
                  <span className="step-number">02</span>
                  <div>
                    <h2>분석 결과</h2>
                    <p>촬영한 수어를 확인해보세요.</p>
                  </div>
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
                  </>
                ) : (
                  <div className="empty-result">
                    <span aria-hidden="true">가</span>
                    <strong>아직 인식된 단어가 없어요</strong>
                    <p>왼쪽에서 수어를 촬영하면 결과가 여기에 표시됩니다.</p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="error-message" role="alert">
                  <span>!</span>
                  {errorMessage}
                </div>
              )}
            </section>

            <section className="tips-card">
              <p className="tips-title">
                <span aria-hidden="true">✦</span>
                더 잘 인식하려면
              </p>
              <ul>
                <li>밝은 곳에서 카메라 정면을 바라봐주세요.</li>
                <li>얼굴, 상체와 양손이 모두 보여야 해요.</li>
                <li>한 번 촬영할 때 한 단어만 표현해주세요.</li>
              </ul>
            </section>
          </aside>
        </div>

        <section className="words-card" aria-labelledby="words-title">
          <div className="words-heading">
            <div>
              <span className="step-number">03</span>
              <div>
                <h2 id="words-title">인식된 단어</h2>
                <p>최대 5개의 단어를 차례대로 모을 수 있어요.</p>
              </div>
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
              <p>촬영한 단어가 이곳에 순서대로 추가됩니다.</p>
            )}
          </div>

          {words.length > 0 && (
            <>
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
                <p>인식된 단어를 확인한 뒤 문장으로 변환해보세요.</p>
              </div>
              <button
                className="clear-button"
                type="button"
                onClick={clearWords}
                disabled={isTranslating}
              >
                전체 지우기
              </button>
            </>
          )}
        </section>

        {(translationResult || translationError || isTranslating) && (
          <section
            className={`sentence-card ${
              translationError ? 'has-error' : ''
            }`}
            aria-live="polite"
          >
            <div className="sentence-heading">
              <span className="step-number">04</span>
              <div>
                <p>환자의 문장</p>
                <h2>자연스러운 한국어 변환</h2>
              </div>
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
      </main>

      <footer>
        <p>
          촬영 영상은 분석 후 즉시 삭제되며, 사용자의 동의 없이 저장하지
          않습니다.
        </p>
        <span>의료 수어 소통 프로토타입</span>
      </footer>
    </div>
  )
}

export default App
