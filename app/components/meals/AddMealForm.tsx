'use client'

import { useState, useEffect, useRef } from 'react'

const FOOD_EMOJIS = [
  '🍝','🌮','🍗','🍕','🥗','🍜','🥘','🍔','🐟','🥩',
  '🍛','🫕','🥙','🍱','🍲','🫔','🌯','🥪','🍣','🦐',
  '🥦','🧆','🥞','🍳','🥚','🧀','🫙','🍖','🥫','🫚',
]

const TAGS = ['🏆 Family fave','⏱ Quick','❄️ Freezes well','🌱 Veggie','🌶️ Spicy','🍕 Takeaway']
const COOKERS = ['Mum','Dad','Takeaway','Easy']

interface MealData {
  emoji: string
  meal_name: string
  cook_time: string
  serves: string
  cooked_by: string
  same_for_all: boolean
  adults_meal: string
  kids_meal: string
  tags: string[]
}

interface AddMealFormProps {
  initialData?: Partial<MealData>
  onSave: (data: MealData) => void
  onCancel: () => void
  saving?: boolean
}

export default function AddMealForm({ initialData, onSave, onCancel, saving }: AddMealFormProps) {
  const [emoji, setEmoji] = useState(initialData?.emoji ?? '🍽')
  const [mealName, setMealName] = useState(initialData?.meal_name ?? '')
  const [cookTime, setCookTime] = useState(initialData?.cook_time ?? '')
  const [serves, setServes] = useState(initialData?.serves ?? '4')
  const [cookedBy, setCookedBy] = useState(initialData?.cooked_by ?? 'Mum')
  const [sameForAll, setSameForAll] = useState(initialData?.same_for_all ?? true)
  const [adultsMeal, setAdultsMeal] = useState(initialData?.adults_meal ?? '')
  const [kidsMeal, setKidsMeal] = useState(initialData?.kids_meal ?? '')
  const [tags, setTags] = useState<string[]>(initialData?.tags?.filter(Boolean) ?? [])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showEmojiPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmojiPicker])

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const handleSave = () => {
    if (!mealName.trim()) return
    onSave({ emoji, meal_name: mealName.trim(), cook_time: cookTime, serves, cooked_by: cookedBy, same_for_all: sameForAll, adults_meal: adultsMeal, kids_meal: kidsMeal, tags })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--card2)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '8px 12px', color: 'var(--text)', fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, color: 'var(--muted)', marginBottom: 5,
    textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Emoji + meal name */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div ref={pickerRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowEmojiPicker(v => !v)}
            style={{
              fontSize: 30, background: 'var(--card2)', border: '1px solid var(--border2)',
              borderRadius: 12, padding: '7px 10px', cursor: 'pointer', lineHeight: 1, display: 'block',
            }}
          >
            {emoji}
          </button>
          {showEmojiPicker && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
              background: 'var(--card)', border: '1px solid var(--border2)',
              borderRadius: 14, padding: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, width: 224,
            }}>
              {FOOD_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                  style={{
                    fontSize: 22, background: emoji === e ? 'rgba(108,142,255,0.2)' : 'transparent',
                    border: 'none', borderRadius: 8, padding: '4px 2px', cursor: 'pointer', lineHeight: 1,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <input
            placeholder="Meal name"
            value={mealName}
            onChange={e => setMealName(e.target.value)}
            style={{
              ...inputStyle, fontSize: 15,
              fontFamily: 'DM Sans, sans-serif', fontWeight: 700, padding: '9px 12px',
            }}
          />
        </div>
      </div>

      {/* Cook time + serves */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={labelStyle}>Cook time</div>
          <input placeholder="e.g. 30 mins" value={cookTime} onChange={e => setCookTime(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={labelStyle}>Serves</div>
          <input placeholder="e.g. 4" value={serves} onChange={e => setServes(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Who's cooking */}
      <div>
        <div style={labelStyle}>Who&apos;s cooking</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COOKERS.map(c => (
            <button
              key={c}
              onClick={() => setCookedBy(c)}
              style={{
                padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: cookedBy === c ? 'var(--accent)' : 'var(--border)',
                background: cookedBy === c ? 'rgba(108,142,255,0.15)' : 'var(--card2)',
                color: cookedBy === c ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Same for all toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--card2)', borderRadius: 12, padding: '10px 14px',
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Same meal for everyone</span>
        <button
          onClick={() => setSameForAll(v => !v)}
          style={{
            width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: sameForAll ? 'var(--accent)' : 'rgba(255,255,255,0.12)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 3,
            left: sameForAll ? 21 : 3, transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Adults / kids split */}
      {!sameForAll && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <div style={labelStyle}>Adults meal</div>
            <input placeholder="e.g. Chilli" value={adultsMeal} onChange={e => setAdultsMeal(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={labelStyle}>Kids meal</div>
            <input placeholder="e.g. Plain pasta" value={kidsMeal} onChange={e => setKidsMeal(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <div style={labelStyle}>Tags</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: tags.includes(tag) ? 'rgba(108,142,255,0.4)' : 'var(--border)',
                background: tags.includes(tag) ? 'rgba(108,142,255,0.12)' : 'var(--card2)',
                color: tags.includes(tag) ? 'var(--text)' : 'var(--muted)',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: 'var(--card2)', border: '1px solid var(--border)',
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!mealName.trim() || saving}
          style={{
            flex: 2, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            background: mealName.trim() && !saving ? 'var(--accent)' : 'rgba(108,142,255,0.3)',
            border: 'none', color: 'white',
            cursor: mealName.trim() && !saving ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Saving…' : 'Save Meal'}
        </button>
      </div>
    </div>
  )
}
