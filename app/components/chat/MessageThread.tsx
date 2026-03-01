'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase, withRetry } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import MessageInput from './MessageInput'

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

function getThreadMeta(threadId: string, currentUserName: string) {
  if (threadId === 'family') {
    return {
      name: 'Hudson Family',
      avatar: { text: 'FH', gradient: 'linear-gradient(135deg, #6C8EFF, #A78BFA)', image: '/icons/apple-touch-icon.png' },
      isFamily: true,
    }
  }
  const parts = threadId.split('-')
  const otherLower = parts.find(p => p !== currentUserName.toLowerCase()) ?? parts[0]
  const otherName = otherLower.charAt(0).toUpperCase() + otherLower.slice(1)
  const person = PEOPLE[otherName] ?? {
    initial: otherName[0],
    gradient: 'linear-gradient(135deg, #6C8EFF, #A78BFA)',
    color: '#6C8EFF',
  }
  return {
    name: otherName,
    avatar: { text: person.initial, gradient: person.gradient },
    isFamily: false,
  }
}

function formatMessageTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-NZ', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDateSeparator(ts: string): string {
  const date = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function MessageThread({ threadId }: { threadId: string }) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const readMarkedRef = useRef<Set<string>>(new Set())
  // Tracks confirmed IDs so the real-time handler doesn't double-add our own sends
  const sentIdsRef = useRef<Set<string>>(new Set())
  const hasLoaded = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) setCurrentUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Fetch initial messages
  useEffect(() => {
    if (!threadId) return
    if (!hasLoaded.current) setLoading(true)
    supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data as Message[]) ?? [])
        hasLoaded.current = true
        setLoading(false)
      })
  }, [threadId])

  // Silent refetch when tab regains focus (handles Supabase cold start)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        supabase
          .from('messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true })
          .then(({ data }) => {
            if (data) setMessages(data as Message[])
          })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [threadId])

  // Mark messages as read
  useEffect(() => {
    if (!currentUser || messages.length === 0) return
    const unread = messages.filter(
      m => m.sender !== currentUser.name &&
        !m.read_by.includes(currentUser.name) &&
        !readMarkedRef.current.has(m.id)
    )
    if (unread.length === 0) return
    unread.forEach(m => readMarkedRef.current.add(m.id))
    Promise.all(
      unread.map(m =>
        supabase.from('messages')
          .update({ read_by: [...m.read_by, currentUser.name] })
          .eq('id', m.id)
      )
    )
  }, [messages, currentUser])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        payload => {
          const newMsg = payload.new as Message
          // Skip if we already placed this via our own insert → select() path
          if (sentIdsRef.current.has(newMsg.id)) return
          setMessages(prev => {
            // Skip exact duplicate
            if (prev.some(m => m.id === newMsg.id)) return prev
            // Replace our optimistic temp message (race: real-time beat the select() response)
            const tempIdx = prev.findIndex(
              m => m.id.startsWith('temp-') && m.sender === newMsg.sender
            )
            if (tempIdx !== -1) {
              sentIdsRef.current.add(newMsg.id)
              const updated = [...prev]
              updated[tempIdx] = newMsg
              return updated
            }
            return [...prev, newMsg]
          })
          setTimeout(scrollToBottom, 50)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [threadId, scrollToBottom])

  // Scroll to bottom when messages first load
  useEffect(() => {
    if (!loading) setTimeout(scrollToBottom, 100)
  }, [loading, scrollToBottom])

  const handleSend = async (content: string, type: 'text' | 'gif') => {
    if (!currentUser) return

    // Optimistic message
    const optimisticId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: optimisticId,
      thread_id: threadId,
      sender: currentUser.name,
      content,
      message_type: type,
      created_at: new Date().toISOString(),
      read_by: [currentUser.name],
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(scrollToBottom, 50)

    // Persist to Supabase — retry automatically on cold-start failures
    const { data, error } = await withRetry(() =>
      supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          sender: currentUser.name,
          content,
          message_type: type,
          read_by: [currentUser.name],
        })
        .select()
        .single()
    )

    if (data) {
      const realMsg = data as Message
      // Register the real ID so the real-time handler skips it
      sentIdsRef.current.add(realMsg.id)
      setMessages(prev => prev.map(m => m.id === optimisticId ? realMsg : m))

      // Fire push notifications to other family members (fire-and-forget)
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUser.name,
          threadId,
          title: currentUser.name,
          body: type === 'gif'
            ? '📷 Sent a GIF'
            : content.length > 60
              ? content.slice(0, 60) + '…'
              : content,
        }),
      }).catch(() => {})
    } else if (error) {
      // All retries failed — remove the optimistic message so it's clear the send failed
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
    }
  }

  if (!currentUser) return <div style={{ background: '#0D0F14', height: '100dvh' }} />

  const meta = getThreadMeta(threadId, currentUser.name)

  return (
    <>
      <style>{`
        .mobile-bottom-bar { display: none !important; }

        @keyframes slideUpMsg {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-in { animation: slideUpMsg 0.18s ease-out; }

        .dot-pulse { display: flex; gap: 5px; align-items: center; }
        .dot-pulse span {
          width: 7px; height: 7px; border-radius: 50%;
          background: rgba(240,242,248,0.35);
          animation: dotBounce 1.3s infinite ease-in-out;
        }
        .dot-pulse span:nth-child(2) { animation-delay: 0.18s; }
        .dot-pulse span:nth-child(3) { animation-delay: 0.36s; }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.4; }
          40%            { transform: scale(1);    opacity: 1;   }
        }

        .msg-area::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Full-screen container */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0D0F14',
        zIndex: 50,
      }}>

        {/* ── HEADER ── */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          background: '#13151C',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={() => router.push('/chat')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6C8EFF',
              fontSize: 28,
              display: 'flex',
              alignItems: 'center',
              padding: '2px 6px 2px 0',
              lineHeight: 1,
              fontWeight: 300,
            }}
          >
            ‹
          </button>

          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: meta.avatar.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: meta.avatar.text.length > 1 ? 12 : 17,
            fontWeight: 800, color: 'white',
            fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
            overflow: 'hidden',
          }}>
            {meta.avatar.image
              ? <img src={meta.avatar.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              : meta.avatar.text}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700,
              fontSize: 16, color: '#F0F2F8',
            }}>
              {meta.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#34D399', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: 'rgba(240,242,248,0.45)' }}>Online</span>
            </div>
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div
          className="msg-area"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '12px 14px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          } as React.CSSProperties}
        >
          {loading && messages.length === 0 ? (
            <div style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              flex: 1,
            }}>
              <div className="dot-pulse">
                <span /><span /><span />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              flex: 1, gap: 12,
            }}>
              <div style={{ fontSize: 56 }}>👋</div>
              <div style={{
                color: 'rgba(240,242,248,0.45)', fontSize: 16, fontWeight: 500,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Say hi!
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMe = msg.sender === currentUser.name
                const prevMsg = messages[i - 1]
                const showDateSep = !prevMsg || !isSameDay(msg.created_at, prevMsg.created_at)
                const sameCluster = !showDateSep && prevMsg?.sender === msg.sender
                const showSenderAvatar = !isMe && meta.isFamily && !sameCluster
                const isGif = msg.message_type === 'gif'
                const person = PEOPLE[msg.sender] ?? {
                  initial: msg.sender[0],
                  gradient: 'linear-gradient(135deg,#6C8EFF,#A78BFA)',
                  color: '#6C8EFF',
                }

                return (
                  <div key={msg.id} className="msg-in">
                    {/* Date separator */}
                    {showDateSep && (
                      <div style={{
                        textAlign: 'center',
                        padding: '14px 0 10px',
                        color: 'rgba(240,242,248,0.3)',
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '0.3px',
                      }}>
                        {formatDateSeparator(msg.created_at)}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      flexDirection: isMe ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                      marginTop: showSenderAvatar ? 10 : sameCluster ? 2 : 6,
                    }}>
                      {/* Their avatar in group chat */}
                      {!isMe && meta.isFamily && (
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: showSenderAvatar ? person.gradient : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color: 'white',
                          fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
                        }}>
                          {showSenderAvatar ? person.initial : ''}
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: isGif ? 220 : '72%',
                      }}>
                        {/* Sender name label in group */}
                        {!isMe && meta.isFamily && showSenderAvatar && (
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            color: person.color,
                            marginBottom: 4,
                            paddingLeft: 12,
                          }}>
                            {msg.sender}
                          </div>
                        )}

                        {/* Bubble or GIF */}
                        {isGif ? (
                          <img
                            src={msg.content}
                            alt="GIF"
                            style={{
                              maxWidth: 220,
                              borderRadius: 18,
                              display: 'block',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }}
                          />
                        ) : (
                          <div style={{
                            background: isMe ? '#6C8EFF' : '#1E2130',
                            color: '#F0F2F8',
                            padding: '10px 14px',
                            borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            fontSize: 15,
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                          }}>
                            {msg.content}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div style={{
                          fontSize: 10,
                          color: 'rgba(240,242,248,0.28)',
                          marginTop: 3,
                          paddingLeft: isMe ? 0 : 4,
                          paddingRight: isMe ? 4 : 0,
                        }}>
                          {formatMessageTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} style={{ height: 4 }} />
            </>
          )}
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{ flexShrink: 0 }}>
          <MessageInput onSend={handleSend} />
        </div>
      </div>
    </>
  )
}
