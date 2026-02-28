'use client'

const EMOJIS = [
  '😀','😂','😍','🥰','😎','😭','😡','🤔',
  '👍','👎','❤️','🔥','✨','🎉','😊','🙌',
  '👏','🤣','😴','😤','🥳','🤩','😢','😅',
  '😇','🤗','😏','🙄','😱','🤯','💪','🙏',
  '🫂','💀','🫠','👀','💯','🎯','🚀','⚡',
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  return (
    <div style={{
      background: '#1E2130',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: '12px 8px 8px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2,
      }}>
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onMouseDown={e => { e.preventDefault(); onSelect(emoji) }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 26,
              padding: '7px 4px',
              borderRadius: 10,
              lineHeight: 1,
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
