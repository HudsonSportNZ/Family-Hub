import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Postgres/PostgREST error codes that are permanent — never worth retrying
const PERMANENT_CODES = new Set([
  '42501', // insufficient_privilege (RLS)
  '23505', // unique_violation
  '23503', // foreign_key_violation
  '42P01', // undefined_table
  '42703', // undefined_column
  'PGRST116', // row not found (.single() with no match)
])

/**
 * Wraps any Supabase query in automatic retry with exponential back-off.
 * Handles Supabase free-tier cold starts where the DB may be paused/resuming.
 *
 * Usage:
 *   const { data, error } = await withRetry(() =>
 *     supabase.from('tasks').insert(payload).select().single()
 *   )
 */
export async function withRetry<T extends { error: { code?: string } | null }>(
  fn: () => PromiseLike<T>,
  maxAttempts = 4
): Promise<T> {
  // Back-off delays between attempts (ms): 800 → 1600 → 3200
  const delays = [800, 1600, 3200]
  let last!: T

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      last = await fn()

      // Success
      if (!last.error) return last

      // Permanent failure — don't retry, return immediately
      const code = last.error?.code
      if (code && PERMANENT_CODES.has(code)) return last
    } catch {
      // Network / fetch error — will retry
    }

    if (attempt < maxAttempts - 1) {
      await new Promise(r => setTimeout(r, delays[attempt] ?? 3200))
    }
  }

  return last
}

/**
 * Fire-and-forget DB warm-up call.
 * On Supabase free tier the DB pauses after ~7 days of inactivity.
 * Calling this on app mount triggers the resume process early, so that
 * by the time the user interacts the DB is already warm.
 *
 * Retries persistently for up to ~60 s in the background.
 */
export async function warmupDb(): Promise<void> {
  const retryDelays = [1500, 3000, 6000, 12000, 20000]
  for (let i = 0; i <= retryDelays.length; i++) {
    try {
      const { error } = await supabase.from('tasks').select('id').limit(1)
      if (!error) return // connected!
    } catch { /* network error — keep trying */ }

    if (i < retryDelays.length) {
      await new Promise(r => setTimeout(r, retryDelays[i]))
    }
  }
}
