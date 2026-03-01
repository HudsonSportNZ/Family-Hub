'use client'

import { useState, useEffect } from 'react'
import { usePushSubscription } from '@/app/hooks/usePushSubscription'

export default function NotificationBanner() {
  const [visible, setVisible] = useState(false)
  const [userName, setUserName] = useState('')
  const { permission, isSubscribed, subscribe } = usePushSubscription()

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Don't show if push isn't supported
    if (!('PushManager' in window)) return
    // Don't show if already handled
    if (isSubscribed || permission === 'granted' || permission === 'denied') return
    // Don't show if user already dismissed it
    if (localStorage.getItem('notifDismissed') === '1') return

    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) {
        const user = JSON.parse(stored)
        setUserName(user.name)
        setVisible(true)
      }
    } catch {
      /* ignore */
    }
  }, [permission, isSubscribed])

  const handleEnable = async () => {
    setVisible(false)
    await subscribe(userName)
  }

  const handleDismiss = () => {
    localStorage.setItem('notifDismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      margin: '12px 16px 4px',
      padding: '12px 14px',
      background: 'rgba(108,142,255,0.1)',
      border: '1px solid rgba(108,142,255,0.22)',
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔔</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#F0F2F8',
          fontFamily: 'Syne, sans-serif',
        }}>
          Enable notifications
        </div>
        <div style={{
          fontSize: 11.5, color: 'rgba(240,242,248,0.48)', marginTop: 2,
          fontFamily: 'Inter, sans-serif',
        }}>
          Get notified when someone messages you
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(240,242,248,0.38)', fontSize: 12,
            padding: '4px 8px', fontFamily: 'Inter, sans-serif',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          style={{
            background: '#6C8EFF', border: 'none', borderRadius: 9,
            padding: '7px 14px', color: 'white',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Enable
        </button>
      </div>
    </div>
  )
}
