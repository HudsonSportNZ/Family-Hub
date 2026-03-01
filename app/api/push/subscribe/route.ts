import { NextRequest, NextResponse } from 'next/server'
import { supabase, withRetry } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { subscription, userName } = await req.json()

  if (!subscription?.endpoint || !userName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await withRetry(() =>
    supabase
      .from('push_subscriptions')
      .upsert(
        { user_name: userName, subscription, endpoint: subscription.endpoint },
        { onConflict: 'endpoint' }
      )
  )

  if (error) return NextResponse.json({ error: (error as { message?: string }).message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
