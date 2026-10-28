import { useEffect, useRef, useState } from 'react'
import { ActionButton } from '@seed-design/react'
import './OnboardingPage.css'

const stages = [
  { key: 'method', title: '가입 방법', hint: '카카오 또는 전화번호 선택' },
  { key: 'name', title: '이름', hint: '이름 적기' },
  { key: 'birth', title: '생년월일', hint: '생년월일 적기' },
  { key: 'note', title: '추가로 알릴 사항', hint: '필요한 내용 적기' },
  { key: 'confirm', title: '확인', hint: '입력한 내용 살펴보기' },
]
const phonePattern = /^01[016789]-?\d{3,4}-?\d{4}$/
const now = new Date()
const maxBirthDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')

export default function OnboardingPage({ Icon, onClose, onStartTranslation }) {
  const [step, setStep] = useState('method')
  const [method, setMethod] = useState('')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const activePacketRef = useRef(null)

  const currentIndex = step === 'phone' ? 0 : stages.findIndex((stage) => stage.key === step)
  const preview = import.meta.env.DEV

  useEffect(() => {
    if (step === 'method') return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    activePacketRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
  }, [step])

  const next = () => {
    setMessage('')
    if (step === 'name') {
      if (!name.trim()) { setMessage('이름을 입력해 주세요.'); return }
      setStep('birth')
    } else if (step === 'birth') {
      if (!birth) { setMessage('생년월일을 선택해 주세요.'); return }
      if (birth > maxBirthDate) { setMessage('오늘 이후 날짜는 선택할 수 없어요.'); return }
      setStep('note')
    } else if (step === 'note') {
      setStep('confirm')
    }
  }

  const back = () => {
    setMessage('')
    if (step === 'method') onClose()
    else if (step === 'phone') setStep('method')
    else if (step === 'name') setStep(method === 'phone' ? 'phone' : 'method')
    else if (step === 'birth') setStep('name')
    else if (step === 'note') setStep('birth')
    else setStep('note')
  }

  const startPreview = () => {
    setMethod((current) => current || 'preview')
    setMessage('')
    setStep('name')
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <button className="onboarding-brand" type="button" onClick={onClose}>손끝진료</button>
        <div className="onboarding-header-actions">
          <button className="onboarding-quick-link" type="button" onClick={onStartTranslation}>가입 없이 수어 번역하기 <Icon name="arrow" size={16} /></button>
          <button className="onboarding-close" type="button" onClick={onClose}>닫기 <Icon name="close" size={17} /></button>
        </div>
      </header>

      <div className="onboarding-layout">
        <div className="onboarding-strip" aria-label="가입 순서">
          {stages.map((stage, index) => {
            const isActive = index === currentIndex
            const isDone = index < currentIndex
            return (
              <section
                className={'onboarding-packet' + (isActive ? ' active' : isDone ? ' done' : ' upcoming')}
                key={stage.key}
                ref={isActive ? activePacketRef : null}
                aria-current={isActive ? 'step' : undefined}
                aria-labelledby={'packet-title-' + stage.key}
              >
                <div className="onboarding-packet-film" aria-hidden="true">
                  <span className="onboarding-packet-seam top" />
                  <span className="onboarding-packet-seam bottom" />
                </div>
                <div className="onboarding-packet-head">
                  <span className="onboarding-packet-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="onboarding-packet-count">{String(index + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}</span>
                </div>
                <h2 className="onboarding-packet-title" id={'packet-title-' + stage.key}>{stage.title}</h2>

                {isActive ? (
                  <div className="onboarding-packet-body">
                    {preview && <p className="preview-note">화면 미리보기 · 입력 정보는 저장되지 않습니다.</p>}
                    {step === 'method' && (
                      <>
                        <p className="onboarding-description">편한 로그인 방법을 선택해 주세요.</p>
                        <div className="login-options">
                          <button className="login-kakao" type="button" onClick={() => { setMethod('kakao'); setMessage('카카오 인증 서버가 연결되지 않았어요. 현재는 가입 화면을 미리 볼 수 있습니다.') }}><span aria-hidden="true">●</span> 카카오로 로그인</button>
                          <ActionButton className="login-phone" variant="neutralOutline" size="large" type="button" onClick={() => { setMethod('phone'); setStep('phone'); setMessage('') }}><Icon name="card" size={19} /> 전화번호로 로그인</ActionButton>
                        </div>
                        {message && <p className="onboarding-message" role="status">{message}</p>}
                        {preview && <button className="onboarding-preview" type="button" onClick={startPreview}>가입 화면 미리보기 <Icon name="arrow" size={16} /></button>}
                      </>
                    )}
                    {step === 'phone' && (
                      <>
                        <p className="onboarding-description">전화번호를 입력하고 인증번호를 받아주세요.</p>
                        <label className="onboarding-field">휴대전화 번호<input type="tel" inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                        <ActionButton className="onboarding-phone-submit" variant="brandSolid" size="large" type="button" onClick={() => setMessage(phonePattern.test(phone) ? '문자 인증 서버가 연결되지 않았어요. 현재는 가입 화면을 미리 볼 수 있습니다.' : '올바른 휴대전화 번호를 입력해 주세요.')}>인증번호 받기</ActionButton>
                        {message && <p className="onboarding-message" role="status">{message}</p>}
                        {preview && <button className="onboarding-preview" type="button" onClick={startPreview}>가입 화면 미리보기 <Icon name="arrow" size={16} /></button>}
                      </>
                    )}
                    {step === 'name' && (
                      <>
                        <p className="onboarding-description">어떻게 불러드리면 될까요?</p>
                        <label className="onboarding-field">이름<input autoComplete="name" maxLength={40} placeholder="이름" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') next() }} /></label>
                        {message && <p className="onboarding-message" role="alert">{message}</p>}
                      </>
                    )}
                    {step === 'birth' && (
                      <>
                        <p className="onboarding-description">생년월일을 알려주세요.</p>
                        <label className="onboarding-field">생년월일<input type="date" autoComplete="bday" max={maxBirthDate} value={birth} onChange={(event) => setBirth(event.target.value)} /></label>
                        {message && <p className="onboarding-message" role="alert">{message}</p>}
                      </>
                    )}
                    {step === 'note' && (
                      <>
                        <p className="onboarding-description">진료 전에 알릴 내용이 있다면 적어주세요. 없어도 괜찮아요.</p>
                        <label className="onboarding-field">추가로 알릴 사항<textarea maxLength={500} rows={4} placeholder="예: 의사에게 미리 알려야 할 내용" value={note} onChange={(event) => setNote(event.target.value)} /></label>
                        <span className="onboarding-character-count">{note.length} / 500</span>
                      </>
                    )}
                    {step === 'confirm' && (
                      <>
                        <p className="onboarding-description">입력한 내용을 확인해 주세요. 현재는 계정에 저장되지 않습니다.</p>
                        <dl className="onboarding-summary"><div><dt>이름</dt><dd>{name}</dd></div><div><dt>생년월일</dt><dd>{birth}</dd></div><div><dt>추가로 알릴 사항</dt><dd>{note || '없음'}</dd></div></dl>
                      </>
                    )}
                    <div className="onboarding-actions">
                      <button className="onboarding-back" type="button" onClick={back}><Icon name="back" size={17} /> {step === 'method' ? '홈으로' : '이전'}</button>
                      {['name', 'birth', 'note'].includes(step) && <ActionButton className="onboarding-next" variant="brandSolid" size="large" type="button" onClick={next}>다음 <Icon name="arrow" size={17} /></ActionButton>}
                      {step === 'confirm' && <ActionButton className="onboarding-next" variant="brandSolid" size="large" type="button" onClick={onClose}>미리보기 마치기 <Icon name="check" size={17} /></ActionButton>}
                    </div>
                  </div>
                ) : (
                  <div className="onboarding-packet-hint">
                    <span className="onboarding-packet-status" aria-hidden="true">{isDone ? '✓' : '+'}</span>
                    <span>{isDone ? '이 단계를 살펴봤어요' : stage.hint}</span>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
