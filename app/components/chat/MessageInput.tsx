'use client'

import { useState, useRef, useCallback } from 'react'
import EmojiPicker from './EmojiPicker'
import GifPicker from './GifPicker'

interface MessageInputProps {
  onSend: (content: string, type: 'text' | 'gif') => void
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, 'text')
    setText('')
    setShowEmoji(false)
    setShowGif(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
  }

  const handleEmojiSelect = (emoji: string) => {
    setText(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  const handleGifSelect = (gifUrl: string) => {
    onSend(gifUrl, 'gif')
    setShowGif(false)
  }

  return (
    <div>
      {showEmoji && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}
      {showGif && (
        <GifPicker
          onSelect={handleGifSelect}
          onClose={() => setShowGif(false)}
        />
      )}

      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 14px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        background: '#13151C',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Emoji button */}
        <button
          onMouseDown={e => {
            e.preventDefault()
            setShowGif(false)
            setShowEmoji(v => !v)
          }}
          style={{
            background: showEmoji ? 'rgba(108,142,255,0.15)' : 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 23,
            padding: '6px',
            flexShrink: 0,
            lineHeight: 1,
            borderRadius: 10,
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          😊
        </button>

        {/* GIF button */}
        <button
          onMouseDown={e => {
            e.preventDefault()
            setShowEmoji(false)
            setShowGif(v => !v)
          }}
          style={{
            background: showGif ? 'rgba(108,142,255,0.25)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            padding: '5px 8px',
            flexShrink: 0,
            color: '#F0F2F8',
            borderRadius: 7,
            lineHeight: 1.4,
            fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '0.3px',
            transition: 'background 0.2s',
          }}
        >
          GIF
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowEmoji(false); setShowGif(false) }}
          placeholder="Message..."
          rows={1}
          style={{
            flex: 1,
            background: '#1E2130',
            border: 'none',
            borderRadius: 22,
            padding: '10px 16px',
            color: '#F0F2F8',
            fontSize: 15,
            resize: 'none',
            outline: 'none',
            lineHeight: 1.45,
            overflow: 'hidden',
            fontFamily: 'DM Sans, sans-serif',
            minHeight: 42,
            maxHeight: 96,
            display: 'block',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: text.trim() && !disabled ? '#6C8EFF' : 'rgba(108,142,255,0.2)',
            border: 'none',
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0,
            color: 'white',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
