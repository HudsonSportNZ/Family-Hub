'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import MobileNav from './MobileNav'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(true)
      return
    }
    try {
      const stored = localStorage.getItem('familyUser')
      if (!stored) {
        router.replace('/login')
      } else {
        setAuthorized(true)
      }
    } catch {
      router.replace('/login')
    }
  }, [isLoginPage, router])

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0F14' }} />
    )
  }

  return (
    <>
      {children}
      {!isLoginPage && <MobileNav />}
    </>
  )
}
