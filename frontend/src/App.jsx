import { useCallback, useEffect, useRef, useState } from 'react'
import { ActionButton } from '@seed-design/react'
import './App.css'
import LandingPage from './LandingPage'
import OnboardingPage from './OnboardingPage'

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
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'video/webm;codecs=vp8',
    'video/webm',
    'video/webm;codecs=vp9',
    'video/mp4',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function Icon({ name, size = 22 }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  const shapes = {
    camera: <><path d="M4 7h4l1.5-2h5L16 7h4v12H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    words: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    message: <><path d="M20 16a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" /><path d="M8 9h8M8 13h5" /></>,
    arrow: <><path d="M4 12h15M13 6l6 6-6 6" /></>,
    back: <><path d="M15 18l-6-6 6-6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="M6 6l12 12M18 6L6 18" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    check: <><path d="M5 12l4 4L19 6" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><circle cx="12" cy="12" r="9" /><path d="M5.5 18.5c1-2.4 3.1-3.8 6.5-3.8s5.5 1.4 6.5 3.8" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    scan: <><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" /><path d="M8 10v4m3-5v6m3-6v6m3-5v4" /></>,
    card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h5" /></>,
    heart: <><path d="M20.8 8.5c0 4.1-8.8 9.7-8.8 9.7S3.2 12.6 3.2 8.5a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18m-9 3v5m-2.5-2.5h5" /></>,
    file: <><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6m-6 4h6" /></>,
    chevron: <><path d="m9 5 7 7-7 7" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.4 9a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 3.8M12 17.5h.01" /></>,
  }

  return <svg {...props}>{shapes[name]}</svg>
}

function App() {
  const videoRef = useRef(null)
  const cameraStageRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const requestControllerRef = useRef(null)
  const helpDialogRef = useRef(null)

  const [cameraState, setCameraState] = useState('loading')
  const [cameraAspectRatio, setCameraAspectRatio] = useState(16 / 9)
  const [cameraStageSize, setCameraStageSize] = useState({ width: 0, height: 0 })
  const [hasStarted, setHasStarted] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
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

    return () => {
      clearInterval(timerRef.current)
      requestControllerRef.current?.abort()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [connectCamera, hasStarted])

  useEffect(() => {
    if (hasStarted && activeStep === 'capture' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [hasStarted, activeStep, cameraState])

  useEffect(() => {
    if (!hasStarted || activeStep !== 'capture' || !cameraStageRef.current) return
    const stage = cameraStageRef.current
    const updateSize = () => {
      const { width, height } = stage.getBoundingClientRect()
      setCameraStageSize((current) => current.width === width && current.height === height ? current : { width, height })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [hasStarted, activeStep])

  const cameraFrameWidth = Math.min(cameraStageSize.width, cameraStageSize.height * cameraAspectRatio)
  const cameraFrameStyle = cameraFrameWidth > 0
    ? { width: cameraFrameWidth, height: cameraFrameWidth / cameraAspectRatio }
    : undefined

  const analyzeVideo = async (videoBlob, mimeType) => {
    setIsAnalyzing(true)
    setErrorMessage('')
    setActiveStep('review')
    requestControllerRef.current = new AbortController()

    const formData = new FormData()
    const extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    formData.append('video', videoBlob, `sign.${extension}`)

    try {
      const response = await fetch(`${API_BASE_URL}/api/sign/analyze`, {
        method: 'POST',
        body: formData,
        signal: requestControllerRef.current.signal,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail ?? '영상을 분석하지 못했습니다.')
      }

      setTranslationResult(null)
      setTranslationError('')
      const recognizedWords = data.words.filter((word) => word.wordId)
      if (recognizedWords.length === 0) {
        setErrorMessage('인식된 수어가 없습니다. 기준 샘플과 촬영 상태를 확인해주세요.')
      } else if (recognizedWords.length < data.segmentCount) {
        setErrorMessage(
          `분석한 구간 ${data.segmentCount}개 중 ${recognizedWords.length}개만 인식했습니다. 결과를 확인해주세요.`,
        )
      }
      setResult({
        isUnknown: recognizedWords.length === 0,
        wordLabel: data.words.map((word) => word.wordLabel).join(' · ') || '인식할 수 없음',
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
    } catch (error) {
      if (error.name === 'AbortError') return
      if (error.message === 'Failed to fetch') {
        setErrorMessage(
          '분석 서버에 연결할 수 없습니다. Python API 실행 상태를 확인해주세요.',
        )
      } else {
        setErrorMessage(error.message)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const startRecording = () => {
    if (!streamRef.current || cameraState !== 'ready' || isAnalyzing) return
    helpDialogRef.current?.close()

    if (typeof MediaRecorder === 'undefined') {
      setErrorMessage('이 브라우저는 영상 촬영을 지원하지 않습니다. 다른 브라우저에서 다시 시도해주세요.')
      return
    }

    if (words.length >= MAX_WORDS) {
      setErrorMessage('단어는 최대 5개까지 추가할 수 있습니다.')
      return
    }

    const mimeType = getSupportedMimeType()
    let recorder
    try {
      recorder = new MediaRecorder(
        streamRef.current,
        mimeType ? { mimeType } : undefined,
      )
    } catch {
      setErrorMessage('영상 촬영을 시작하지 못했습니다. 카메라 상태를 확인해주세요.')
      return
    }
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
      analyzeVideo(videoBlob, mimeType || videoBlob.type)
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

  const startSession = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setWords([])
    setResult(null)
    setTranslationResult(null)
    setTranslationError('')
    setErrorMessage('')
    setLastRecording(null)
    setActiveStep('capture')
    setHasStarted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goHome = () => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.onstop = null
      recorderRef.current.stop()
    }
    clearInterval(timerRef.current)
    requestControllerRef.current?.abort()
    setIsRecording(false)
    setHasStarted(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const newSession = () => {
    setWords([])
    setResult(null)
    setTranslationResult(null)
    setTranslationError('')
    setErrorMessage('')
    setLastRecording(null)
    setActiveStep('capture')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <div className={'app-shell' + (hasStarted ? ' is-workspace is-' + activeStep : '')}>
      {hasStarted ? (
        <>
          <header className="site-header">
            <div className="site-header-inner">
              <button className="brand" type="button" onClick={goHome} aria-label="손끝진료 홈">
                <span>손끝진료</span>
              </button>
              <span className="session-label">진료실 수어 번역</span>
              <button className="header-back" type="button" onClick={goHome}>홈으로</button>
            </div>
          </header>
          <main className="workspace-page" id="studio">
            <div className="workspace-intro">
              <div>
                <p className="eyebrow">SIGN TO SENTENCE</p>
                <div className="workspace-title-row">
                  <h1>{activeStep === 'capture' ? '수어로 이야기해 주세요.' : activeStep === 'review' ? '이 단어들이 맞나요?' : '이 문장을 의사에게 보여주세요.'}</h1>
                  <ol className="step-progress" aria-label="번역 진행 단계">
                    {[
                      ['capture', '수어 촬영'],
                      ['review', '단어 확인'],
                      ['sentence', '문장 완성'],
                    ].map(([step, label], index) => (
                      <li key={step} className={activeStep === step ? 'active' : ['capture', 'review', 'sentence'].indexOf(activeStep) > index ? 'done' : ''} aria-current={activeStep === step ? 'step' : undefined}>
                        <span className="step-number">{index + 1}</span><span>{label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="intro-description">{activeStep === 'capture'
                  ? '촬영을 마치면 인식된 단어를 함께 확인할게요.'
                  : activeStep === 'review'
                    ? '전하고 싶은 말이 맞는지 확인한 뒤 문장으로 만들어 주세요.'
                    : '전하고 싶은 뜻과 다르면 단어 확인으로 돌아갈 수 있어요.'}</p>
              </div>
              {activeStep === 'capture' && (
                <button className="help-trigger" type="button" onClick={() => helpDialogRef.current?.showModal()}>
                  <Icon name="help" size={18} /> 촬영 도움말
                </button>
              )}
            </div>

            {activeStep === 'capture' && (
              <div className="capture-layout">
                <section className="camera-panel" aria-labelledby="camera-title">
                  <div className="camera-panel-heading">
                    <h2 id="camera-title">카메라 화면</h2>
                    <span className={'live-badge' + (isRecording ? ' recording' : '')}>
                      <span className="live-dot" /> {isRecording ? '촬영 중 ' + formatTime(elapsedSeconds) : cameraState === 'ready' ? '준비 완료' : '연결 중'}
                    </span>
                  </div>
                  <div className="camera-stage" ref={cameraStageRef}>
                    <div className={'camera-frame' + (isRecording ? ' is-recording' : '')} style={cameraFrameStyle}>
                      <video className="camera-video-preview" ref={videoRef} autoPlay muted playsInline onLoadedMetadata={(event) => {
                        const { videoWidth, videoHeight } = event.currentTarget
                        if (videoWidth && videoHeight) setCameraAspectRatio(videoWidth / videoHeight)
                      }} />
                    {cameraState !== 'ready' && (
                      <div className="camera-placeholder">
                        <span className="placeholder-icon"><Icon name="camera" size={31} /></span>
                        <strong>{cameraState === 'loading' ? '카메라를 준비하고 있어요' : '카메라 연결이 필요해요'}</strong>
                        <p>{cameraState === 'loading' ? '잠시만 기다려 주세요.' : '브라우저의 카메라 권한을 확인해 주세요.'}</p>
                        {cameraState === 'error' && <button type="button" onClick={connectCamera}>다시 연결하기</button>}
                      </div>
                    )}
                    <div className="camera-guide" aria-hidden="true"><span /><span /><span /><span /></div>
                    </div>
                  </div>
                </section>
                <aside className="capture-controls">
                  <div className="capture-controls-copy">
                    <span className="soft-icon"><Icon name="message" size={25} /></span>
                    <h2>손끝으로 전할 말을<br />보여주세요.</h2>
                    <p>얼굴과 양손이 화면에 보이도록 해주세요. 촬영이 끝나면 단어 확인 화면으로 이동합니다.</p>
                  </div>
                  <div className="capture-controls-bottom">
                    <div className="collected-status"><span>모은 단어</span><strong>{words.length} / {MAX_WORDS}</strong></div>
                    {!isRecording ? (
                      <ActionButton className="button button-primary" variant="brandSolid" size="large" type="button" onClick={startRecording} disabled={cameraState !== 'ready' || isAnalyzing || words.length >= MAX_WORDS}>
                        <span className="record-icon" /> 촬영 시작
                      </ActionButton>
                    ) : (
                      <ActionButton className="button button-stop" variant="criticalSolid" size="large" type="button" onClick={stopRecording}>
                        <span className="stop-icon" /> 촬영 종료하고 분석하기
                      </ActionButton>
                    )}
                    {words.length > 0 && !isRecording && <button className="subtle-link" type="button" onClick={() => setActiveStep('review')}>모은 단어 확인하기 <Icon name="arrow" size={16} /></button>}
                    {errorMessage && <div className="inline-error" role="alert">{errorMessage}</div>}
                  </div>
                </aside>
              </div>
            )}

            {activeStep === 'review' && (
              <div className="review-page">
                <section className="latest-panel" aria-labelledby="latest-title" aria-live="polite">
                  <div className="latest-panel-label"><span className="soft-icon small"><Icon name="scan" size={19} /></span><div><p className="eyebrow">방금 촬영한 수어</p><h2 id="latest-title">분석 결과</h2></div></div>
                  {isAnalyzing ? (
                    <div className="latest-panel-content"><span className="spinner" /><strong>수어를 분석하고 있어요</strong></div>
                  ) : result ? (
                    <div className="latest-panel-content"><strong>{result.wordLabel}</strong><span>{result.isUnknown ? '인식된 단어가 없어요' : '아래 단어 목록에 담았어요'}</span></div>
                  ) : (
                    <div className="latest-panel-content"><strong>아직 촬영 결과가 없어요</strong><span>수어를 촬영하면 이곳에 나타나요.</span></div>
                  )}
                  {errorMessage && <div className="inline-error" role="alert">{errorMessage}</div>}
                  {lastRecording && !isAnalyzing && <button className="download-link" type="button" onClick={downloadLastRecording}><Icon name="download" size={16} /> 진단용 영상 저장</button>}
                </section>
                <div className="review-grid">
                  <section className="words-panel" aria-labelledby="words-title">
                    <div className="panel-title-row"><div><p className="eyebrow">WORDS IN ORDER</p><h2 id="words-title">문장에 담을 단어</h2></div><span className="word-count">{words.length} / {MAX_WORDS}</span></div>
                    <div className="word-list">
                      {words.length ? words.map((word, index) => (
                        <div className="word-row" key={word.id}>
                          <span className="word-order">{String(index + 1).padStart(2, '0')}</span>
                          <strong>{word.label}</strong>
                          <button type="button" aria-label={word.label + ' 삭제'} onClick={() => removeWord(word.id)} disabled={isTranslating}><Icon name="close" size={18} /></button>
                        </div>
                      )) : <div className="words-empty"><Icon name="words" size={29} /><strong>담긴 단어가 없어요.</strong><span>다시 촬영해 전하고 싶은 말을 담아주세요.</span></div>}
                    </div>
                    {words.length > 0 && <button className="clear-link" type="button" onClick={clearWords}>단어 모두 지우기</button>}
                  </section>
                  <aside className="review-next">
                    <span className="soft-icon"><Icon name="file" size={25} /></span>
                    <h2>단어를 확인하셨나요?</h2>
                    <p>맞지 않는 단어는 지우고 다시 촬영할 수 있어요. 준비되면 자연스러운 문장으로 정리해 드릴게요.</p>
                    <div className="review-actions">
                      <ActionButton className="button button-outline" variant="neutralOutline" size="large" type="button" onClick={() => setActiveStep('capture')} disabled={isAnalyzing || words.length >= MAX_WORDS}><Icon name="plus" size={18} /> 수어 더 촬영하기</ActionButton>
                      <ActionButton className="button button-primary" variant="brandSolid" size="large" type="button" onClick={translateWords} disabled={isAnalyzing || isTranslating || words.length === 0}>문장 만들기 <Icon name="arrow" size={18} /></ActionButton>
                    </div>
                  </aside>
                </div>
              </div>
            )}

            {activeStep === 'sentence' && (
              <div className="sentence-layout">
                <section className="sentence-result" aria-labelledby="sentence-title" aria-live="polite">
                  <div className="panel-title-row"><div><p className="eyebrow">FOR YOUR DOCTOR</p><h2 id="sentence-title">완성된 문장</h2></div>{translationResult && <span className="complete-badge"><Icon name="check" size={16} /> 완성</span>}</div>
                  {isTranslating ? (
                    <div className="sentence-state"><span className="spinner" /><strong>문장을 만들고 있어요</strong><p>단어의 의미를 자연스럽게 연결하고 있습니다.</p></div>
                  ) : translationError ? (
                    <div className="sentence-state error" role="alert"><strong>문장을 만들지 못했어요.</strong><p>{translationError}</p><ActionButton className="button button-primary" variant="brandSolid" size="large" type="button" onClick={translateWords}>다시 시도하기</ActionButton></div>
                  ) : translationResult ? (
                    <blockquote>{translationResult.generatedSentence}</blockquote>
                  ) : (
                    <div className="sentence-state"><strong>아직 완성된 문장이 없어요.</strong></div>
                  )}
                  {translationResult && <p className="patient-check">의사에게 보여주기 전에 전하려던 뜻이 맞는지 확인해 주세요.</p>}
                </section>
                <aside className="sentence-side">
                  <p className="eyebrow">SOURCE WORDS</p>
                  <h2>사용된 단어</h2>
                  <div className="source-words">{words.map((word) => <span key={word.id}>{word.label}</span>)}</div>
                  <div className="sentence-actions">
                    <ActionButton className="button button-outline" variant="neutralOutline" size="large" type="button" onClick={() => setActiveStep('review')}>단어 다시 확인</ActionButton>
                    {translationResult && <ActionButton className="button button-primary" variant="brandSolid" size="large" type="button" onClick={newSession}>새로 번역하기 <Icon name="arrow" size={18} /></ActionButton>}
                  </div>
                </aside>
              </div>
            )}
          </main>
          <dialog className="help-dialog" ref={helpDialogRef} aria-labelledby="help-title">
            <div className="help-dialog-header"><div><p className="eyebrow">CAMERA GUIDE</p><h2 id="help-title">수어 촬영 도움말</h2></div><form method="dialog"><button type="submit" aria-label="도움말 닫기"><Icon name="close" size={20} /></button></form></div>
            <ol>
              <li><span>01</span><div><strong>밝은 곳에서 정면을 바라봐 주세요.</strong><p>얼굴과 손에 그림자가 생기지 않도록 해주세요.</p></div></li>
              <li><span>02</span><div><strong>얼굴과 양손이 화면에 들어오게 해주세요.</strong><p>손동작이 화면 밖으로 벗어나지 않도록 거리를 조절해 주세요.</p></div></li>
              <li><span>03</span><div><strong>표현을 마치면 촬영 종료를 눌러주세요.</strong><p>분석이 끝나면 단어 확인 화면으로 이동합니다.</p></div></li>
            </ol>
            <form method="dialog"><ActionButton className="button button-primary" variant="brandSolid" size="large" type="submit">확인했어요</ActionButton></form>
          </dialog>
        </>
      ) : showOnboarding ? (
        <OnboardingPage onClose={() => setShowOnboarding(false)} onStartTranslation={() => { setShowOnboarding(false); startSession() }} Icon={Icon} />
      ) : (
        <LandingPage Icon={Icon} onStart={startSession} onSignup={() => setShowOnboarding(true)} />
      )}
    </div>
  )
}

export default App
