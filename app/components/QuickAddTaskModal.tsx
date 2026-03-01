'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Member = 'M' | 'D' | 'I' | 'J'
type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly'
type Priority = 'low' | 'normal' | 'high'

const MEMBERS = [
  { id: 'M' as Member, name: 'Mum',    color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
  { id: 'D' as Member, name: 'Dad',    color: '#34D399', bg: 'rgba(52,211,153,0.15)'  },
  { id: 'I' as Member, name: 'Isabel', color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  { id: 'J' as Member, name: 'James',  color: '#FBBF24', bg: 'rgba(251,191,36,0.15)'  },
]

const CATEGORIES = [
  { value: 'general',     label: 'General',     icon: '📋' },
  { value: 'maintenance', label: 'Maintenance',  icon: '🔧' },
  { value: 'chores',      label: 'Chores',       icon: '🧹' },
  { value: 'food',        label: 'Food',         icon: '🍽️' },
  { value: 'school',      label: 'School',       icon: '🎒' },
]

const ICONS = ['✓', '🧹', '🎒', '🛒', '💡', '🍽️', '🐱', '❤️', '📚', '🚗', '💊', '🏃', '🌱', '📞', '🔧']
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
}

function priorityColor(p: Priority) {
  return p === 'high' ? '#F87171' : p === 'low' ? '#6B7280' : '#6C8EFF'
}

interface Props {
  onClose: () => void
  onSave: () => void
}

export default function QuickAddTaskModal({ onClose, onSave }: Props) {
  const [title,                setTitle]                = useState('')
  const [icon,                 setIcon]                 = useState('✓')
  const [description,          setDescription]          = useState('')
  const [assignedTo,           setAssignedTo]           = useState<Member[]>([])
  const [category,             setCategory]             = useState('general')
  const [priority,             setPriority]             = useState<Priority>('normal')
  const [recurrence,           setRecurrence]           = useState<Recurrence>('once')
  const [dueDate,              setDueDate]              = useState(getToday())
  const [recurrenceDays,       setRecurrenceDays]       = useState<number[]>([])
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | undefined>(undefined)
  const [saving,               setSaving]               = useState(false)
  const [error,                setError]                = useState('')

  const toggleMember = (m: Member) =>
    setAssignedTo(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])

  const toggleDay = (d: number) =>
    setRecurrenceDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('tasks').insert({
      title:                    title.trim(),
      description:              description.trim() || null,
      assigned_to:              assignedTo,
      recurrence,
      recurrence_days:          recurrence === 'weekly'  ? recurrenceDays       : null,
      recurrence_day_of_month:  recurrence === 'monthly' ? (recurrenceDayOfMonth ?? null) : null,
      due_date:                 recurrence === 'once'    ? dueDate              : null,
      due_time:                 null,
      start_date:               getToday(),
      is_active:                true,
      priority,
      category,
      icon,
    })
    setSaving(false)
    if (err) { setError(`Save failed: ${err.message}`); return }
    onSave()
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
        background: '#0F172A', borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column', height: '88vh',
      }}>

        {/* Scrollable content */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'scroll', overflowX: 'hidden',
          padding: '20px 20px 0', boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>

          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#F0F2F8', fontFamily: "'DM Sans', sans-serif" }}>
              New Task
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 20, padding: 4 }}>
              ✕
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#F87171', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          <label style={s.label}>Task title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Take bins out"
            style={s.input}
            autoFocus
          />

          <label style={s.label}>Icon</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                border: `2px solid ${icon === ic ? '#6C8EFF' : 'rgba(255,255,255,0.1)'}`,
                background: icon === ic ? 'rgba(108,142,255,0.15)' : 'transparent',
                cursor: 'pointer',
              }}>
                {ic}
              </button>
            ))}
          </div>

          <label style={s.label}>Notes (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Any extra notes…"
            rows={3}
            style={{ ...s.input, resize: 'none', lineHeight: '1.5' }}
          />

          <label style={s.label}>Assign to</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {MEMBERS.map(m => {
              const selected = assignedTo.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleMember(m.id)} style={{
                  flex: 1, padding: '10px 4px', borderRadius: 10,
                  border: `2px solid ${selected ? m.color : 'rgba(255,255,255,0.1)'}`,
                  background: selected ? m.bg : 'transparent',
                  color: selected ? m.color : '#64748B',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                }}>
                  {selected ? '✓ ' : ''}{m.name}
                </button>
              )
            })}
          </div>

          <label style={s.label}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)} style={{
                ...s.chip, ...(category === c.value ? s.chipActive : {}),
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <label style={s.label}>Priority</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['low', 'normal', 'high'] as Priority[]).map(p => (
              <button key={p} onClick={() => setPriority(p)} style={{
                flex: 1, padding: '8px', borderRadius: 10,
                border: `2px solid ${priority === p ? priorityColor(p) : 'rgba(255,255,255,0.1)'}`,
                background: priority === p ? `${priorityColor(p)}20` : 'transparent',
                color: priority === p ? priorityColor(p) : '#64748B',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'capitalize',
              }}>
                {p}
              </button>
            ))}
          </div>

          <label style={s.label}>Repeats</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['once', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => (
              <button key={r} onClick={() => setRecurrence(r)} style={{
                ...s.chip, ...(recurrence === r ? s.chipActive : {}),
              }}>
                {r === 'once' ? '1️⃣ Once' : r === 'daily' ? '☀️ Daily' : r === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}
              </button>
            ))}
          </div>

          {recurrence === 'once' && (
            <>
              <label style={s.label}>Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={s.input} />
            </>
          )}

          {recurrence === 'weekly' && (
            <>
              <label style={s.label}>Which days?</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {DAYS_SHORT.map((day, i) => (
                  <button key={i} onClick={() => toggleDay(i)} style={{
                    flex: 1, padding: '8px 2px', borderRadius: 8,
                    border: `2px solid ${recurrenceDays.includes(i) ? '#6C8EFF' : 'rgba(255,255,255,0.1)'}`,
                    background: recurrenceDays.includes(i) ? 'rgba(108,142,255,0.15)' : 'transparent',
                    color: recurrenceDays.includes(i) ? '#6C8EFF' : '#64748B',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}

          {recurrence === 'monthly' && (
            <>
              <label style={s.label}>Day of month</label>
              <input
                type="number" min={1} max={31}
                value={recurrenceDayOfMonth ?? ''}
                onChange={e => setRecurrenceDayOfMonth(parseInt(e.target.value) || undefined)}
                placeholder="e.g. 15"
                style={s.input}
              />
            </>
          )}

        </div>

        {/* Sticky footer */}
        <div style={{
          padding: '14px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0F172A',
          display: 'flex', gap: 10, flexShrink: 0,
          width: '100%', boxSizing: 'border-box',
        }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '14px', borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#94A3B8',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              flex: 1, padding: '14px', borderRadius: 12, border: 'none',
              background: saving || !title.trim()
                ? 'rgba(108,142,255,0.3)'
                : 'linear-gradient(135deg, #6C8EFF, #818CF8)',
              color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Add\u00A0Task'}
          </button>
        </div>

      </div>
    </>
  )
}

const s = {
  label: {
    display: 'block' as const,
    fontSize: 12, fontWeight: 700, color: '#64748B',
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 8,
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#F1F5F9', fontSize: 14, marginBottom: 16,
    boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit',
    WebkitAppearance: 'none' as const, colorScheme: 'dark' as const,
  },
  chip: {
    padding: '6px 12px', borderRadius: 99,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#64748B',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  chipActive: {
    border: '1.5px solid #6C8EFF',
    background: 'rgba(108,142,255,0.12)',
    color: '#6C8EFF',
  },
}
