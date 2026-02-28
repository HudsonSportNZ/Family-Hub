import CalendarModule from '@/app/components/CalendarModule'
import Link from 'next/link'

export default function CalendarPage() {
  return (
    <div style={{ background: '#0D0F14', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#13151C',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#F0F2F8',
          textDecoration: 'none',
          fontSize: 16,
          flexShrink: 0,
        }}>
          ←
        </Link>
        <div style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #6C8EFF, #A78BFA)',
          borderRadius: 9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 12,
          color: 'white',
          fontFamily: "'Syne', sans-serif",
          flexShrink: 0,
        }}>
          FH
        </div>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: '#F0F2F8',
        }}>
          Calendar
        </span>
      </div>

      <CalendarModule />
    </div>
  )
}
