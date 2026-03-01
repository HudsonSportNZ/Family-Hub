'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NZ_TZ = 'Pacific/Auckland'

function getNZToday(): Date {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekStart(offsetWeeks: number): Date {
  const today = getNZToday()
  const dow = today.getDay()
  const daysToMon = dow === 0 ? -6 : 1 - dow
  const d = new Date(today)
  d.setDate(d.getDate() + daysToMon + offsetWeeks * 7)
  return d
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatRange(monday: Date): string {
  const friday = new Date(monday)
  friday.setDate(friday.getDate() + 4)
  return `${monday.getDate()}–${friday.getDate()} ${friday.toLocaleDateString('en-NZ', { month: 'short' })}`
}

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

interface DayPlan {
  dropoff_person: string | null
  pickup_person: string | null
  isabel_uniform: 'pe' | 'uniform'
  james_uniform: 'pe' | 'uniform'
  isabel_activities: string[]
  james_activities: string[]
}

const EMPTY_DAY: DayPlan = {
  dropoff_person: null,
  pickup_person: null,
  isabel_uniform: 'uniform',
  james_uniform: 'uniform',
  isabel_activities: [],
  james_activities: [],
}

const DAY_CONFIG: { key: DayKey; label: string; offset: number }[] = [
  { key: 'monday',    label: 'Monday',    offset: 0 },
  { key: 'tuesday',   label: 'Tuesday',   offset: 1 },
  { key: 'wednesday', label: 'Wednesday', offset: 2 },
  { key: 'thursday',  label: 'Thursday',  offset: 3 },
  { key: 'friday',    label: 'Friday',    offset: 4 },
]

function makeEmptyWeek(): Record<DayKey, DayPlan> {
  const result = {} as Record<DayKey, DayPlan>
  for (const d of DAY_CONFIG) {
    result[d.key] = { ...EMPTY_DAY, isabel_activities: [], james_activities: [] }
  }
  return result
}

function rowToPlan(row: Record<string, unknown>): DayPlan {
  return {
    dropoff_person:    (row.dropoff_person as string)    ?? null,
    pickup_person:     (row.pickup_person as string)     ?? null,
    isabel_uniform:    (row.isabel_uniform as 'pe' | 'uniform') ?? 'uniform',
    james_uniform:     (row.james_uniform as 'pe' | 'uniform')  ?? 'uniform',
    isabel_activities: (row.isabel_activities as string[]) ?? [],
    james_activities:  (row.james_activities as string[])  ?? [],
  }
}

function getDaySummary(plan: DayPlan): { text: string; amber?: boolean; muted?: boolean }[] {
  const tags: { text: string; amber?: boolean; muted?: boolean }[] = []
  const parts: string[] = []
  if (plan.dropoff_person) parts.push(`${plan.dropoff_person} drop`)
  if (plan.pickup_person)  parts.push(`${plan.pickup_person} pick`)
  if (parts.length > 0)    tags.push({ text: parts.join(' · ') })
  if (plan.isabel_uniform === 'pe') tags.push({ text: 'Isabel PE', amber: true })
  if (plan.james_uniform  === 'pe') tags.push({ text: 'James PE',  amber: true })
  if (tags.length === 0)            tags.push({ text: 'Not set', muted: true })
  return tags
}

const PERSON_BTNS = [
  { label: 'Mum',   dot: '#6C8EFF' },
  { label: 'Dad',   dot: '#34D399' },
  { label: 'Other', dot: 'rgba(255,255,255,0.25)' },
]

export default function SchoolPlanner() {
  const router = useRouter()

  const [weekOffset, setWeekOffset] = useState(0)
  const [plans, setPlans] = useState<[Record<DayKey, DayPlan>, Record<DayKey, DayPlan>]>(
    [makeEmptyWeek(), makeEmptyWeek()]
  )
  const [openDay, setOpenDay] = useState<DayKey | null>(null)
  const [actInputs, setActInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [m0, m1] = [getWeekStart(0), getWeekStart(1)]
      const [r0, r1] = await Promise.all([
        supabase.from('school_plan').select('*').eq('week_start', toYMD(m0)),
        supabase.from('school_plan').select('*').eq('week_start', toYMD(m1)),
      ])
      const next: [Record<DayKey, DayPlan>, Record<DayKey, DayPlan>] = [makeEmptyWeek(), makeEmptyWeek()]
      ;(r0.data ?? []).forEach((row: Record<string, unknown>) => { next[0][row.day_of_week as DayKey] = rowToPlan(row) })
      ;(r1.data ?? []).forEach((row: Record<string, unknown>) => { next[1][row.day_of_week as DayKey] = rowToPlan(row) })
      setPlans(next)
      setLoading(false)

      const today = getNZToday()
      const dow = today.getDay()
      setOpenDay(dow >= 1 && dow <= 5 ? DAY_CONFIG[dow - 1].key : 'monday')
    }
    load()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const weekPlan = plans[weekOffset]

  function updateDay(dayKey: DayKey, update: Partial<DayPlan>) {
    setPlans(prev => {
      const next: typeof prev = [{ ...prev[0] }, { ...prev[1] }]
      next[weekOffset] = { ...next[weekOffset], [dayKey]: { ...next[weekOffset][dayKey], ...update } }
      return next
    })
  }

  function getActInput(dayKey: DayKey, kid: 'isabel' | 'james') {
    return actInputs[`${dayKey}-${kid}`] ?? ''
  }
  function setActInput(dayKey: DayKey, kid: 'isabel' | 'james', val: string) {
    setActInputs(prev => ({ ...prev, [`${dayKey}-${kid}`]: val }))
  }
  function addActivity(dayKey: DayKey, kid: 'isabel' | 'james') {
    const val = getActInput(dayKey, kid).trim()
    if (!val) return
    const key = `${kid}_activities` as 'isabel_activities' | 'james_activities'
    updateDay(dayKey, { [key]: [...weekPlan[dayKey][key], val] })
    setActInput(dayKey, kid, '')
  }
  function removeActivity(dayKey: DayKey, kid: 'isabel' | 'james', index: number) {
    const key = `${kid}_activities` as 'isabel_activities' | 'james_activities'
    const acts = [...weekPlan[dayKey][key]]
    acts.splice(index, 1)
    updateDay(dayKey, { [key]: acts })
  }

  async function saveWeek() {
    setSaving(true)
    const weekStart = toYMD(getWeekStart(weekOffset))
    const rows = DAY_CONFIG.map(d => ({
      week_start:         weekStart,
      day_of_week:        d.key,
      dropoff_person:     weekPlan[d.key].dropoff_person,
      pickup_person:      weekPlan[d.key].pickup_person,
      isabel_uniform:     weekPlan[d.key].isabel_uniform,
      james_uniform:      weekPlan[d.key].james_uniform,
      isabel_activities:  weekPlan[d.key].isabel_activities,
      james_activities:   weekPlan[d.key].james_activities,
    }))
    const { error } = await supabase
      .from('school_plan')
      .upsert(rows, { onConflict: 'week_start,day_of_week' })
    setSaving(false)
    setToast(error ? 'Save failed — try again' : 'Week saved ✓')
  }

  const monday0 = getWeekStart(0)
  const monday1 = getWeekStart(1)

  return (
    <>
      <style>{`
        :root {
          --bg: #0D0F14; --panel: #13151C; --card: #181B24; --card2: #1E2130;
          --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
          --text: #F0F2F8; --muted: rgba(240,242,248,0.4); --muted2: rgba(240,242,248,0.65);
          --accent: #6C8EFF; --accent2: #A78BFA;
          --green: #34D399; --amber: #FBBF24; --red: #F87171; --pink: #F472B6;
        }
        html, body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; }
        .sp-act-input {
          flex: 1; background: var(--card2); border: 1px solid var(--border);
          border-radius: 8px; padding: 7px 10px; font-size: 11px;
          color: var(--text); font-family: 'Inter', sans-serif; outline: none; width: 100%;
        }
        .sp-act-input::placeholder { color: var(--muted); }
        .sp-act-input:focus { border-color: rgba(108,142,255,0.35); }
        .sp-day-body { overflow: hidden; transition: max-height 0.3s ease; }
        .sp-back-btn:hover { background: rgba(255,255,255,0.1) !important; }
        .sp-week-tab { transition: all 0.2s; cursor: pointer; }
        .sp-week-tab:hover { border-color: rgba(108,142,255,0.25) !important; }
        .sp-save-btn:hover:not(:disabled) { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER — matches Calendar page pattern ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#13151C',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* Back */}
          <div
            className="sp-back-btn"
            onClick={() => router.back()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F0F2F8', cursor: 'pointer', fontSize: 16,
              transition: 'background 0.15s',
            }}
          >←</div>

          {/* Icon + Title */}
          <img src="/icons/apple-touch-icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 9, display: 'block', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#F0F2F8', flex: 1 }}>
            School Planner
          </span>

          {/* Save */}
          <button
            className="sp-save-btn"
            onClick={saveWeek}
            disabled={saving}
            style={{
              background: 'var(--accent)', color: 'white',
              padding: '8px 16px', borderRadius: 10,
              fontSize: 12, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
            }}
          >
            {saving ? 'Saving…' : 'Save week'}
          </button>
        </div>

        {/* ── WEEK TABS ── */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px 0', background: '#13151C', flexShrink: 0 }}>
          {([0, 1] as const).map(offset => {
            const monday = offset === 0 ? monday0 : monday1
            const active = weekOffset === offset
            return (
              <div
                key={offset}
                className="sp-week-tab"
                onClick={() => setWeekOffset(offset)}
                style={{
                  padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  fontFamily: "'Syne', sans-serif",
                  border: `1px solid ${active ? 'rgba(108,142,255,0.35)' : 'var(--border)'}`,
                  background: active ? 'rgba(108,142,255,0.15)' : 'var(--card)',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                }}
              >
                {offset === 0 ? 'This Week' : 'Next Week'}
                <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 5 }} suppressHydrationWarning>
                  {formatRange(monday)}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── DAY ROWS ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 20px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          display: 'flex', flexDirection: 'column', gap: 10,
          scrollbarWidth: 'none',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>Loading…</div>
          ) : (
            DAY_CONFIG.map(({ key, label, offset }) => {
              const monday = weekOffset === 0 ? monday0 : monday1
              const dayDate = new Date(monday)
              dayDate.setDate(dayDate.getDate() + offset)
              const dateLabel = dayDate.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
              const isOpen = openDay === key
              const plan = weekPlan[key]
              const summary = getDaySummary(plan)

              return (
                <div key={key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

                  {/* Row header */}
                  <div
                    onClick={() => setOpenDay(isOpen ? null : key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: 'var(--card2)',
                      borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', minHeight: 56,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }} suppressHydrationWarning>{dateLabel}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 }}>
                      {summary.map((tag, i) => (
                        <span key={i} style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                          background: tag.amber ? 'rgba(251,191,36,0.08)' : 'var(--card)',
                          color:      tag.amber ? 'var(--amber)' : 'var(--muted)',
                          border:     `1px solid ${tag.amber ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
                        }}>
                          {tag.text}
                        </span>
                      ))}
                      <span style={{
                        fontSize: 11, color: 'var(--muted)',
                        display: 'inline-block', transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                      }}>▼</span>
                    </div>
                  </div>

                  {/* Accordion body */}
                  <div className="sp-day-body" style={{ maxHeight: isOpen ? '1200px' : 0 }}>
                    <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                      {/* Transport — full width */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 8 }}>
                          🚗 Transport
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {([
                            { field: 'dropoff_person' as const, label: 'Drop-off' },
                            { field: 'pickup_person'  as const, label: 'Pick-up'  },
                          ]).map(({ field, label: tLabel }) => (
                            <div key={field}>
                              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>{tLabel}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {PERSON_BTNS.map(({ label: pLabel, dot }) => {
                                  const selected = plan[field] === pLabel
                                  return (
                                    <div
                                      key={pLabel}
                                      onClick={() => updateDay(key, { [field]: selected ? null : pLabel })}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '5px 10px', borderRadius: 20, minHeight: 30,
                                        border: `1px solid ${selected ? 'rgba(52,211,153,0.4)' : 'var(--border)'}`,
                                        background: selected ? 'rgba(52,211,153,0.1)' : 'var(--card2)',
                                        fontSize: 11, fontWeight: 600,
                                        color: selected ? 'var(--green)' : 'var(--muted)',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                      }}
                                    >
                                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                                      {pLabel}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Isabel + James */}
                      {([
                        { kid: 'isabel' as const, name: 'Isabel', initial: 'I', gradient: 'linear-gradient(135deg,#FBBF24,#F97316)', uniformField: 'isabel_uniform' as const, actsField: 'isabel_activities' as const },
                        { kid: 'james'  as const, name: 'James',  initial: 'J', gradient: 'linear-gradient(135deg,#F472B6,#A78BFA)', uniformField: 'james_uniform'  as const, actsField: 'james_activities'  as const },
                      ]).map(({ kid, name, initial, gradient, uniformField, actsField }) => (
                        <div key={kid}>
                          {/* Kid header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                              {initial}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted2, rgba(240,242,248,0.65))' }}>{name}</div>
                          </div>

                          {/* Uniform toggle */}
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 5 }}>Uniform</div>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            {([
                              { val: 'pe'      as const, emoji: '👟', label: 'PE'      },
                              { val: 'uniform' as const, emoji: '👕', label: 'Uniform' },
                            ]).map(({ val, emoji, label: uLabel }) => {
                              const sel = plan[uniformField] === val
                              return (
                                <div
                                  key={val}
                                  onClick={() => updateDay(key, { [uniformField]: val })}
                                  style={{
                                    flex: 1, padding: '8px 6px', borderRadius: 10, textAlign: 'center',
                                    border: `1px solid ${sel ? (val === 'pe' ? 'rgba(251,191,36,0.4)' : 'rgba(108,142,255,0.3)') : 'var(--border)'}`,
                                    background: sel ? (val === 'pe' ? 'rgba(251,191,36,0.1)' : 'rgba(108,142,255,0.08)') : 'var(--card2)',
                                    fontSize: 11, fontWeight: 600,
                                    color: sel ? (val === 'pe' ? 'var(--amber)' : 'var(--accent)') : 'var(--muted)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                  }}
                                >
                                  <div style={{ fontSize: 16, marginBottom: 2 }}>{emoji}</div>
                                  {uLabel}
                                </div>
                              )
                            })}
                          </div>

                          {/* Activities */}
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', marginBottom: 5 }}>Activities</div>
                          {plan[actsField].length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                              {plan[actsField].map((act, i) => (
                                <div key={i} style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                                  background: 'rgba(108,142,255,0.1)', color: 'var(--accent)',
                                  border: '1px solid rgba(108,142,255,0.15)',
                                }}>
                                  {act}
                                  <span
                                    onClick={() => removeActivity(key, kid, i)}
                                    style={{ cursor: 'pointer', opacity: 0.6, fontSize: 11, lineHeight: 1 }}
                                  >×</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              className="sp-act-input"
                              value={getActInput(key, kid)}
                              onChange={e => setActInput(key, kid, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addActivity(key, kid) } }}
                              placeholder="Add activity…"
                            />
                            <div
                              onClick={() => addActivity(key, kid)}
                              style={{
                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: 'rgba(108,142,255,0.15)', color: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18, cursor: 'pointer',
                                border: '1px solid rgba(108,142,255,0.2)', fontWeight: 700,
                              }}
                            >+</div>
                          </div>
                        </div>
                      ))}

                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom))',
          left: '50%', transform: 'translateX(-50%)',
          background: toast.includes('✓') ? 'var(--green)' : 'var(--red)',
          color: '#0D0F14', padding: '10px 20px', borderRadius: 20,
          fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
          zIndex: 100, pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(52,211,153,0.3)',
        }}>
          {toast}
        </div>
      )}
    </>
  )
}
