'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function DebugOverlay() {
  const pathname = usePathname()
  const [info, setInfo] = useState('')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      const nav = document.querySelector('.mobile-bottom-bar') as HTMLElement | null
      const navRect = nav?.getBoundingClientRect()
      setInfo([
        `path: ${pathname}`,
        `innerH: ${window.innerHeight}`,
        `vv.h: ${vv ? Math.round(vv.height) : 'n/a'}`,
        `vv.offsetTop: ${vv ? Math.round(vv.offsetTop) : 'n/a'}`,
        `scrollY: ${Math.round(window.scrollY)}`,
        `nav bottom: ${navRect ? Math.round(navRect.bottom) : 'null'}`,
        `nav top: ${navRect ? Math.round(navRect.top) : 'null'}`,
        `nav transform: ${nav?.style.transform || 'none'}`,
      ].join('\n'))
    }

    update()
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    window.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    const id = setInterval(update, 500)

    return () => {
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      clearInterval(id)
    }
  }, [pathname])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed', top: 60, right: 8, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', color: '#0f0', border: 'none',
          borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
        }}
      >dbg</button>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 60, right: 8, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', color: '#0f0',
      fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6,
      padding: '8px 10px', borderRadius: 8, whiteSpace: 'pre',
      border: '1px solid rgba(0,255,0,0.3)', maxWidth: 220,
      pointerEvents: 'all',
    }}>
      {info}
      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            border: 'none', borderRadius: 4, padding: '2px 8px',
            fontSize: 10, cursor: 'pointer',
          }}
        >hide</button>
      </div>
    </div>
  )
}
