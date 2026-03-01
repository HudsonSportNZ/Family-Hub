import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export async function POST(req: NextRequest) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const { sender, threadId, title, body } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Start query — never notify the sender
  let query = supabase
    .from('push_subscriptions')
    .select('user_name, subscription, endpoint')
    .neq('user_name', sender)

  // For DMs, only notify the recipient (not the whole family)
  if (threadId !== 'family') {
    const parts = (threadId as string).split('-')
    const recipientLower = parts.find((p) => p !== sender.toLowerCase())
    if (recipientLower) {
      const recipient = recipientLower.charAt(0).toUpperCase() + recipientLower.slice(1)
      query = query.eq('user_name', recipient)
    }
  }

  const { data: subscriptions } = await query
  if (!subscriptions?.length) return NextResponse.json({ ok: true, sent: 0 })

  const url = threadId === 'family' ? '/chat/family' : `/chat/${threadId}`
  const payload = JSON.stringify({ title, body, url })

  await Promise.allSettled(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload)
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        // 410 Gone or 404 = subscription expired, clean it up
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', row.endpoint)
        }
      }
    })
  )

  return NextResponse.json({ ok: true, sent: subscriptions.length })
}
