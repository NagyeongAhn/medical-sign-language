import { ActionButton } from '@seed-design/react'
import './LandingPage.css'

export default function LandingPage({ onStart, onSignup }) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <span className="landing-brand">손끝진료</span>
        <button className="landing-signup" type="button" onClick={onSignup}>가입하기</button>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <h1 id="landing-title">수어를 문장으로,<br />진료실에서 바로 전하세요.</h1>
        <p>수어를 촬영하고 단어를 확인한 뒤, 완성된 문장을 의사에게 보여주세요.</p>
        <ActionButton className="landing-start" variant="brandSolid" size="large" onClick={onStart}>
          수어 번역 시작하기
        </ActionButton>
        <p className="landing-access-note">가입 없이 바로 사용할 수 있어요.</p>
      </section>

      <ol className="landing-flow" aria-label="번역 순서">
        <li><span>01</span>수어 촬영</li>
        <li><span>02</span>단어 확인</li>
        <li><span>03</span>문장 보여주기</li>
      </ol>
    </main>
  )
}
