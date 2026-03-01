'use client'

import { useEffect } from 'react'
import { warmupDb } from '@/lib/supabase'

/**
 * Invisible component — renders nothing, fires a lightweight DB ping on mount.
 * This wakes up the Supabase free-tier DB so it's warm when the user first
 * tries to save something.
 */
export default function SupabaseWarmup() {
  useEffect(() => {
    warmupDb()
  }, [])
  return null
}
