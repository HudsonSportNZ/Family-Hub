'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const MEMBERS = [
  {
    name: 'Mum',
    role: 'parent' as const,
    letter: 'M',
    gradient: 'linear-gradient(135deg,#6C8EFF,#A78BFA)',
    badge: 'Parent',
    badgeColor: '#6C8EFF',
    badgeBg: 'rgba(108,142,255,0.15)',
    pin: '7124',
  },
  {
    name: 'Dad',
    role: 'parent' as const,
    letter: 'D',
    gradient: 'linear-gradient(135deg,#34D399,#22D3EE)',
    badge: 'Parent',
    badgeColor: '#34D399',
    badgeBg: 'rgba(52,211,153,0.15)',
    pin: '9325',
  },
  {
    name: 'Isabel',
    role: 'kid' as const,
    letter: 'I',
    gradient: 'linear-gradient(135deg,#FBBF24,#F97316)',
    badge: 'Kid',
    badgeColor: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    pin: '8945',
  },
  {
    name: 'James',
    role: 'kid' as const,
    letter: 'J',
    gradient: 'linear-gradient(135deg,#F472B6,#A78BFA)',
    badge: 'Kid',
    badgeColor: '#F472B6',
    badgeBg: 'rgba(244,114,182,0.15)',
    pin: '0321',
  },
]

type Member = typeof MEMBERS[0]

const NUM_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<'select' | 'pin'>('select')
  const [selected, setSelected] = useState<Member | null>(null)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tapped, setTapped] = useState<string | null>(null)
  const [shakeKey, setShakeKey] = useState(0)

  // Redirect if already logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) router.replace('/')
    } catch { /* ignore */ }
  }, [router])

  const selectMember = (m: Member) => {
    setTapped(m.name)
    setTimeout(() => {
      setTapped(null)
      setSelected(m)
      setPin('')
      setShake(false)
      setSuccess(false)
      setStep('pin')
    }, 180)
  }

  const pressDigit = (d: string) => {
    if (shake || success) return
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) {
      if (next === selected!.pin) {
        setSuccess(true)
        localStorage.setItem('familyUser', JSON.stringify({ name: selected!.name, role: selected!.role }))
        setTimeout(() => router.replace('/'), 700)
      } else {
        setShake(true)
        setShakeKey(k => k + 1)
        setTimeout(() => {
          setShake(false)
          setPin('')
        }, 650)
      }
    }
  }

  const pressDelete = () => {
    if (shake || success) return
    setPin(prev => prev.slice(0, -1))
  }

  const goBack = () => {
    setStep('select')
    setSelected(null)
    setPin('')
    setShake(false)
    setSuccess(false)
  }

  const dotColor = (filled: boolean) => {
    if (success) return '#34D399'
    if (shake) return '#F87171'
    return filled ? selected!.badgeColor : 'transparent'
  }

  const dotBorder = (filled: boolean) => {
    if (success) return '#34D399'
    if (shake) return '#F87171'
    return filled ? selected!.badgeColor : 'rgba(240,242,248,0.2)'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0F14', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes loginShake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-9px); }
          30%     { transform: translateX(9px); }
          45%     { transform: translateX(-6px); }
          60%     { transform: translateX(6px); }
          75%     { transform: translateX(-3px); }
          90%     { transform: translateX(3px); }
        }
        @keyframes loginSuccess {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .login-screen {
          width: 100%;
          max-width: 390px;
          padding: 52px 24px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: loginFadeIn 0.3s ease;
        }
        .login-logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 6px;
        }
        .login-logo-text {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          color: #F0F2F8;
        }
        .login-subtitle {
          font-size: 14px;
          color: rgba(240,242,248,0.35);
          margin-bottom: 44px;
          margin-top: 2px;
          font-family: 'Inter', sans-serif;
        }
        .avatar-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          width: 100%;
        }
        .avatar-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 16px 22px;
          background: #13151C;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          animation: loginScaleIn 0.35s ease;
          gap: 10px;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .avatar-card:hover {
          background: #181B24;
          border-color: rgba(255,255,255,0.12);
        }
        .avatar-card:active {
          transform: scale(0.96);
        }
        .avatar-circle {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 30px;
          color: white;
          margin-bottom: 2px;
        }
        .avatar-name {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: #F0F2F8;
        }
        .avatar-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Inter', sans-serif;
        }

        /* PIN screen */
        .pin-screen {
          width: 100%;
          max-width: 390px;
          padding: 44px 28px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: loginFadeIn 0.25s ease;
        }
        .pin-back-btn {
          align-self: flex-start;
          background: none;
          border: none;
          color: rgba(240,242,248,0.4);
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          margin-bottom: 36px;
          transition: color 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .pin-back-btn:hover { color: rgba(240,242,248,0.7); }
        .pin-avatar {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          color: white;
          margin-bottom: 14px;
          width: 68px;
          height: 68px;
          font-size: 26px;
        }
        .pin-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: #F0F2F8;
          margin-bottom: 4px;
        }
        .pin-hint {
          font-size: 13px;
          color: rgba(240,242,248,0.35);
          margin-bottom: 44px;
          font-family: 'Inter', sans-serif;
        }
        .pin-dots {
          display: flex;
          gap: 18px;
          margin-bottom: 52px;
        }
        .pin-dot {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          border: 2px solid rgba(240,242,248,0.2);
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        .pin-dot.filled {
          transform: scale(1.1);
        }
        .pin-numpad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 300px;
        }
        .num-btn {
          height: 72px;
          background: #13151C;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 24px;
          color: #F0F2F8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .num-btn:hover { background: #181B24; }
        .num-btn:active { transform: scale(0.93); background: #1E2130; }
        .del-btn {
          height: 72px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          font-size: 22px;
          color: rgba(240,242,248,0.45);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.12s, transform 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .del-btn:active { transform: scale(0.93); }
        .num-placeholder { height: 72px; }
      `}</style>

      {step === 'select' ? (
        <div className="login-screen">
          <div className="login-logo-row">
            <img src="/icons/apple-touch-icon.png" style={{ width: 46, height: 46, borderRadius: 13, display: 'block' }} alt="" />
            <div className="login-logo-text">Hudson Family</div>
          </div>
          <div className="login-subtitle">Who the heck are you?</div>

          <div className="avatar-grid">
            {MEMBERS.map(m => (
              <div
                key={m.name}
                className="avatar-card"
                onClick={() => selectMember(m)}
                style={{
                  transform: tapped === m.name ? 'scale(0.95)' : 'scale(1)',
                  opacity: tapped === m.name ? 0.75 : 1,
                }}
              >
                <div className="avatar-circle" style={{ background: m.gradient }}>
                  {m.letter}
                </div>
                <div className="avatar-name">{m.name}</div>
                <div
                  className="avatar-badge"
                  style={{ background: m.badgeBg, color: m.badgeColor }}
                >
                  {m.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pin-screen">
          <button className="pin-back-btn" onClick={goBack}>
            ← Back
          </button>

          <div
            className="pin-avatar"
            style={{
              background: selected!.gradient,
              animation: success ? 'loginSuccess 0.5s ease' : undefined,
            }}
          >
            {selected!.letter}
          </div>

          <div className="pin-title">{selected!.name}</div>
          <div className="pin-hint">Enter your PIN</div>

          {/* PIN dots */}
          <div
            className="pin-dots"
            key={shakeKey}
            style={{ animation: shake ? 'loginShake 0.6s ease' : undefined }}
          >
            {[0, 1, 2, 3].map(i => {
              const filled = i < pin.length
              return (
                <div
                  key={i}
                  className={`pin-dot${filled ? ' filled' : ''}`}
                  style={{
                    background: dotColor(filled),
                    borderColor: dotBorder(filled),
                  }}
                />
              )
            })}
          </div>

          {/* Numpad */}
          <div className="pin-numpad">
            {NUM_KEYS.map(d => (
              <button key={d} className="num-btn" onClick={() => pressDigit(d)}>
                {d}
              </button>
            ))}
            <div className="num-placeholder" />
            <button className="num-btn" onClick={() => pressDigit('0')}>
              0
            </button>
            <button className="del-btn" onClick={pressDelete}>
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
