'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SchoolPlanner from '../components/school/SchoolPlanner'

export default function SchoolPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      const user = stored ? JSON.parse(stored) : null
      if (!user || user.role !== 'parent') {
        router.replace('/')
      } else {
        setReady(true)
      }
    } catch {
      router.replace('/')
    }
  }, [router])

  if (!ready) return null
  return <SchoolPlanner />
}
