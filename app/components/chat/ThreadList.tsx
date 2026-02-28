'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Message {
  id: string
  thread_id: string
  sender: string
  content: string
  message_type: 'text' | 'gif' | 'emoji'
  created_at: string
  read_by: string[]
}

interface User {
  name: string
  role: string
}

const PEOPLE: Record<string, { initial: string; gradient: string; color: string }> = {
  Mum:    { initial: 'M', gradient: 'linear-gradient(135deg, #6C8EFF, #A78BFA)', color: '#6C8EFF' },
  Dad:    { initial: 'D', gradient: 'linear-gradient(135deg, #34D399, #22D3EE)', color: '#34D399' },
  Isabel: { initial: 'I', gradient: 'linear-gradient(135deg, #FBBF24, #F97316)', color: '#FBBF24' },
  James:  { initial: 'J', gradient: 'linear-gradient(135deg, #F472B6, #A78BFA)', color: '#F472B6' },
}

function getDMThreadId(name1: string, name2: string): string {
  return [name1, name2].map(n => n.toLowerCase()).sort().join('-')
}

function formatRelativeTime(ts: string): string {
  const now = new Date()
  const date = new Date(ts)
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

const ALL_NAMES = ['Mum', 'Dad', 'Isabel', 'James']

export default function ThreadList() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) setCurrentUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    const others = ALL_NAMES.filter(n => n !== currentUser.name)
    const threadIds = ['family', ...others.map(n => getDMThreadId(currentUser.name, n))]

    const fetchMessages = () => {
      supabase
        .from('messages')
        .select('*')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })
        .then(({ data }) => setMessages((data as Message[]) ?? []))
    }

    fetchMessages()

    const channel = supabase
      .channel('thread-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser])

  if (!currentUser) return <div style={{ background: '#0D0F14', height: '100dvh' }} />

  const others = ALL_NAMES.filter(n => n !== currentUser.name)
  const person = PEOPLE[currentUser.name]

  const threadDefs = [
    {
      id: 'family',
      name: 'Hudson Family',
      subtitle: 'Everyone',
      avatarText: 'FH',
      avatarImage: '/icons/apple-touch-icon.png',
      gradient: 'linear-gradient(135deg, #6C8EFF, #A78BFA)',
    },
    ...others.map(name => ({
      id: getDMThreadId(currentUser.name, name),
      name,
      subtitle: undefined as string | undefined,
      avatarText: PEOPLE[name].initial,
      gradient: PEOPLE[name].gradient,
    })),
  ]

  const threads = threadDefs.map(def => {
    const threadMessages = messages.filter(m => m.thread_id === def.id)
    const lastMessage = threadMessages[0]
    const unreadCount = threadMessages.filter(
      m => m.sender !== currentUser.name && !m.read_by.includes(currentUser.name)
    ).length
    return { ...def, lastMessage, unreadCount }
  })

  return (
    <>
      <style>{`
        html, body { background: #0D0F14; }
        .thread-row:active { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0D0F14',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          flexShrink: 0,
          padding: '16px 20px 14px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          background: '#13151C',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* Home button */}
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F2F8', textDecoration: 'none',
            fontSize: 16, flexShrink: 0,
          }}>
            ←
          </Link>
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 22,
            color: '#F0F2F8',
            flex: 1,
          }}>
            Messages
          </div>
          {person && (
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: person.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 800, color: 'white',
              fontFamily: 'Syne, sans-serif',
            }}>
              {person.initial}
            </div>
          )}
        </div>

        {/* ── THREAD LIST ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        } as React.CSSProperties}>
          {threads.map((thread, idx) => {
            const isLast = idx === threads.length - 1
            return (
              <div
                key={thread.id}
                className="thread-row"
                onClick={() => router.push(`/chat/${thread.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '13px 20px',
                  cursor: 'pointer',
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                  background: 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: thread.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: thread.avatarText.length > 1 ? 14 : 21,
                    fontWeight: 800, color: 'white',
                    fontFamily: 'Syne, sans-serif',
                    overflow: 'hidden',
                  }}>
                    {thread.avatarImage
                      ? <img src={thread.avatarImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : thread.avatarText}
                  </div>
                  {/* Online dot */}
                  <div style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 13, height: 13, borderRadius: '50%',
                    background: '#34D399',
                    border: '2.5px solid #0D0F14',
                  }} />
                </div>

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 3,
                  }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: 15,
                      color: '#F0F2F8',
                    }}>
                      {thread.name}
                    </div>
                    {thread.lastMessage && (
                      <div style={{
                        fontSize: 11,
                        color: 'rgba(240,242,248,0.38)',
                        flexShrink: 0,
                        marginLeft: 8,
                      }}>
                        {formatRelativeTime(thread.lastMessage.created_at)}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <div style={{
                      fontSize: 13,
                      color: thread.unreadCount > 0
                        ? 'rgba(240,242,248,0.75)'
                        : 'rgba(240,242,248,0.42)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                      fontWeight: thread.unreadCount > 0 ? 500 : 400,
                    }}>
                      {thread.lastMessage
                        ? thread.lastMessage.message_type === 'gif'
                          ? '🎞 GIF'
                          : thread.lastMessage.sender === currentUser.name
                            ? `You: ${thread.lastMessage.content}`
                            : thread.lastMessage.content
                        : thread.subtitle ?? 'No messages yet'}
                    </div>

                    {thread.unreadCount > 0 && (
                      <div style={{
                        minWidth: 20, height: 20, borderRadius: 10,
                        background: '#6C8EFF', color: 'white',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 6px', flexShrink: 0,
                      }}>
                        {thread.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
