'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NZ_TZ = 'Pacific/Auckland'

export const MEMBERS = [
  { id: 'mum',    label: 'Mum',    initial: 'M', color: '#6C8EFF' },
  { id: 'dad',    label: 'Dad',    initial: 'D', color: '#34D399' },
  { id: 'isabel', label: 'Isabel', initial: 'I', color: '#F472B6' },
  { id: 'james',  label: 'James',  initial: 'J', color: '#FBBF24' },
]

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  all_day: boolean
  location?: string
  members: string[]
  colour?: string
}

interface EventModalProps {
  event?: CalendarEvent | null   // null = create new, CalendarEvent = edit
  defaultDate?: Date
  defaultHour?: number
  onClose: () => void
  onSave: (event: CalendarEvent) => void
  onDelete?: (id: string) => void
}

// Get YYYY-MM-DD in NZ timezone
function getNZDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: NZ_TZ })
}

// Get HH:MM in NZ timezone
function getNZTimeStr(d: Date): string {
  return d.toLocaleTimeString('en-NZ', {
    timeZone: NZ_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

// Get the current NZ UTC offset as "+13:00" or "+12:00"
// Falls back to a hardcoded +13:00 if Intl can't determine it
function getNZOffset(): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: NZ_TZ,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date())
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    const m = tzName.match(/GMT([+-])(\d+)(?::(\d+))?/)
    if (m) {
      const h = m[2].padStart(2, '0')
      const min = (m[3] ?? '00').padStart(2, '0')
      return `${m[1]}${h}:${min}`
    }
  } catch (_) { /* ignore */ }
  return '+13:00'
}

export default function EventModal({
  event,
  defaultDate,
  defaultHour = 9,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEdit  = !!event
  const base    = defaultDate ?? new Date()
  const pad     = (n: number) => String(n).padStart(2, '0')

  const initDate  = event ? getNZDateStr(new Date(event.start_time)) : getNZDateStr(base)
  const initStart = event ? getNZTimeStr(new Date(event.start_time)) : `${pad(defaultHour)}:00`
  const initEnd   = event ? getNZTimeStr(new Date(event.end_time))   : `${pad(Math.min(defaultHour + 1, 23))}:00`

  const [title,       setTitle]       = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location,    setLocation]    = useState(event?.location ?? '')
  const [allDay,      setAllDay]      = useState(event?.all_day ?? false)
  const [members,     setMembers]     = useState<string[]>(event?.members ?? [])
  const [date,        setDate]        = useState(initDate)
  const [startTime,   setStartTime]   = useState(initStart)
  const [endTime,     setEndTime]     = useState(initEnd)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [error,       setError]       = useState('')

  const toggleMember = (id: string) =>
    setMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')

    const off      = getNZOffset()
    const startISO = allDay ? `${date}T00:00:00${off}` : `${date}T${startTime}:00${off}`
    const endISO   = allDay ? `${date}T23:59:00${off}` : `${date}T${endTime}:00${off}`

    const payload = {
      title:       title.trim(),
      description: description.trim() || null,
      location:    location.trim() || null,
      all_day:     allDay,
      start_time:  startISO,
      end_time:    endISO,
      members,
      colour:      null,
    }

    let result
    if (isEdit && event) {
      result = await supabase.from('events').update(payload).eq('id', event.id).select().single()
    } else {
      result = await supabase.from('events').insert(payload).select().single()
    }

    setSaving(false)

    if (result.error) {
      setError(`Save failed: ${result.error.message}`)
      return
    }
    if (result.data) onSave(result.data as CalendarEvent)
  }

  const handleDelete = async () => {
    if (!event || !onDelete) return
    setDeleting(true)
    const { error: delErr } = await supabase.from('events').delete().eq('id', event.id)
    setDeleting(false)
    if (delErr) { setError(`Delete failed: ${delErr.message}`); return }
    onDelete(event.id)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Sheet — fixed height column, matching TaskForm iOS pattern */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#0F172A',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        height: '88vh',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none',
      }}>

        {/* Scrollable content area — minHeight:0 is the critical iOS Safari fix */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'scroll', overflowX: 'hidden',
          padding: '20px 20px 0',
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>

          {/* Handle + heading */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#F0F2F8', fontFamily: "'Syne', sans-serif" }}>
              {isEdit ? 'Edit Event' : 'New Event'}
            </h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 20, padding: 4 }}>
              ✕
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#F87171', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Title */}
          <label style={s.label}>Event title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. School pick-up"
            style={s.input}
            autoFocus={!isEdit}
          />

          {/* All day toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <label style={{ ...s.label, margin: 0 }}>All day</label>
            <div
              onClick={() => setAllDay(!allDay)}
              style={{
                width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                background: allDay ? '#6C8EFF' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 3,
                left: allDay ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s',
              }} />
            </div>
          </div>

          {/* Date — full width */}
          <label style={s.label}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s.input} />

          {/* Start + End — side by side, only when not all-day */}
          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
              <div>
                <label style={s.label}>Start time</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={s.input} />
              </div>
              <div>
                <label style={s.label}>End time</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={s.input} />
              </div>
            </div>
          )}

          {/* Location */}
          <label style={s.label}>Location (optional)</label>
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Newlands Park"
            style={s.input}
          />

          {/* Notes */}
          <label style={s.label}>Notes (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Any extra details…"
            rows={3}
            style={{ ...s.input, resize: 'none', lineHeight: '1.5' }}
          />

          {/* Members */}
          <label style={s.label}>Who&apos;s involved</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {MEMBERS.map(m => {
              const active = members.includes(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 10,
                    border: `2px solid ${active ? m.color : 'rgba(255,255,255,0.1)'}`,
                    background: active ? m.color + '22' : 'transparent',
                    color: active ? m.color : '#64748B',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  {active ? '✓ ' : ''}{m.label}
                </button>
              )
            })}
          </div>

        </div>

        {/* Sticky action buttons — same pattern as TaskForm */}
        <div style={{
          padding: '14px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0F172A',
          display: 'flex', gap: 10, flexShrink: 0,
          width: '100%', boxSizing: 'border-box',
        }}>
          {isEdit && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: '1.5px solid rgba(248,113,113,0.3)',
                background: 'rgba(248,113,113,0.1)', color: '#F87171',
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {deleting ? '…' : '🗑️'}
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: 12,
              border: '1.5px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94A3B8',
              fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              flex: 2, padding: '14px', borderRadius: 12, border: 'none',
              background: saving || !title.trim()
                ? 'rgba(108,142,255,0.3)'
                : 'linear-gradient(135deg, #6C8EFF, #818CF8)',
              color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Event'}
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
    boxSizing: 'border-box' as const, outline: 'none',
    fontFamily: 'inherit', WebkitAppearance: 'none' as const,
    colorScheme: 'dark' as const,
  },
}
