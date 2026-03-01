'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const NZ_TZ = 'Pacific/Auckland'

function getNZToday(): Date {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return d
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAYS = [
  { key: 'monday',    abbr: 'MON', offset: 0 },
  { key: 'tuesday',   abbr: 'TUE', offset: 1 },
  { key: 'wednesday', abbr: 'WED', offset: 2 },
  { key: 'thursday',  abbr: 'THU', offset: 3 },
  { key: 'friday',    abbr: 'FRI', offset: 4 },
]

const PERSON_CFG: Record<string, { initial: string; gradient: string }> = {
  Mum:   { initial: 'M', gradient: 'linear-gradient(135deg,#6C8EFF,#A78BFA)' },
  Dad:   { initial: 'D', gradient: 'linear-gradient(135deg,#34D399,#22D3EE)' },
  Other: { initial: '?', gradient: 'linear-gradient(135deg,#888,#999)' },
}

interface SchoolRow {
  day_of_week: string
  dropoff_person: string | null
  pickup_person: string | null
  isabel_uniform: 'pe' | 'uniform'
  james_uniform: 'pe' | 'uniform'
  isabel_activities: string[]
  james_activities: string[]
}

const WEEKEND_MESSAGES = [
  { emoji: '🎉', text: 'NO SCHOOL TODAY BABY!' },
  { emoji: '☀️', text: 'Weekend vibes only!' },
  { emoji: '🛌', text: 'Sleep in, no rush!' },
  { emoji: '🎮', text: "Free time, let's go!" },
]

function parseRows(rows: SchoolRow[]): Record<string, SchoolRow> {
  const map: Record<string, SchoolRow> = {}
  rows.forEach(r => { map[r.day_of_week] = r })
  return map
}

export default function TodayAtSchool() {
  const [today] = useState<Date>(getNZToday)
  const [weekMonday] = useState<Date>(() => getWeekMonday(getNZToday()))
  const [nextWeekMonday] = useState<Date>(() => {
    const d = getWeekMonday(getNZToday())
    d.setDate(d.getDate() + 7)
    return d
  })
  const [weekNum] = useState<number>(() => getISOWeek(getNZToday()))

  const todayDow = today.getDay()
  const isWeekend = todayDow === 0 || todayDow === 6
  const defaultIdx = todayDow >= 1 && todayDow <= 5 ? todayDow - 1 : 0

  const [selectedIdx, setSelectedIdx] = useState(defaultIdx)
  const [viewingNextWeek, setViewingNextWeek] = useState(false)
  const [thisWeekData, setThisWeekData] = useState<Record<string, SchoolRow>>({})
  const [nextWeekData, setNextWeekData] = useState<Record<string, SchoolRow>>({})
  const [loading, setLoading] = useState(true)
  const [isParent, setIsParent] = useState(false)
  const [weekendMsg] = useState(() => WEEKEND_MESSAGES[Math.floor(Math.random() * WEEKEND_MESSAGES.length)])

  const fetchAllData = useCallback(() => {
    Promise.all([
      supabase.from('school_plan').select('*').eq('week_start', toYMD(weekMonday)),
      supabase.from('school_plan').select('*').eq('week_start', toYMD(nextWeekMonday)),
    ]).then(([r0, r1]) => {
      setThisWeekData(parseRows((r0.data as SchoolRow[]) ?? []))
      setNextWeekData(parseRows((r1.data as SchoolRow[]) ?? []))
      setLoading(false)
    })
  }, [weekMonday, nextWeekMonday])

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('familyUser') ?? '{}')
      setIsParent(u.role === 'parent')
    } catch { /* ignore */ }

    fetchAllData()

    const ch = supabase
      .channel('today-at-school')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_plan' }, fetchAllData)
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [fetchAllData])

  // Active context — this week or next week preview
  const activeMonday = viewingNextWeek ? nextWeekMonday : weekMonday
  const activeData   = viewingNextWeek ? nextWeekData   : thisWeekData

  const selDay = DAYS[selectedIdx]
  const data   = activeData[selDay.key] ?? null
  const todayDayName = today.toLocaleDateString('en-NZ', { weekday: 'long' })

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 16, flexShrink: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(108,142,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
            🏫
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700 }}>Today at School</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }} suppressHydrationWarning>
              {todayDayName} · Week {weekNum}
            </div>
          </div>
        </div>
        {isParent && (
          <Link href="/school" style={{ textDecoration: 'none' }}>
            <div style={{
              fontSize: 10, color: 'var(--muted)', padding: '3px 9px',
              borderRadius: 7, background: 'var(--card2)', border: '1px solid var(--border)',
              fontWeight: 500, cursor: 'pointer',
            }}>
              Week plan
            </div>
          </Link>
        )}
      </div>

      {/* Weekend */}
      {isWeekend && !viewingNextWeek ? (
        <>
          <div style={{
            textAlign: 'center', padding: '24px 12px 20px',
            background: 'var(--card2)', borderRadius: 16,
            border: '1px solid var(--border)',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 38, marginBottom: 8 }}>{weekendMsg.emoji}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
              {weekendMsg.text}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              School&apos;s back {todayDow === 6 ? 'Monday' : 'tomorrow'} — enjoy today!
            </div>
          </div>

          {/* Next week preview button */}
          <div
            onClick={() => { setSelectedIdx(0); setViewingNextWeek(true) }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
              background: 'rgba(108,142,255,0.08)',
              border: '1px solid rgba(108,142,255,0.2)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 13 }}>📅</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
              Peek at next week
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }} suppressHydrationWarning>
              {nextWeekMonday.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} →
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Back to weekend pill — only shown when previewing next week on a weekend */}
          {isWeekend && viewingNextWeek && (
            <div
              onClick={() => setViewingNextWeek(false)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 600, color: 'var(--muted)',
                padding: '3px 10px', borderRadius: 20,
                background: 'var(--card2)', border: '1px solid var(--border)',
                cursor: 'pointer', marginBottom: 10,
              }}
            >
              ← {weekendMsg.emoji} Back to weekend
            </div>
          )}

          {/* Day strip */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
            {DAYS.map((d, i) => {
              const chipDate = new Date(activeMonday)
              chipDate.setDate(chipDate.getDate() + d.offset)
              const active = i === selectedIdx
              return (
                <div
                  key={d.key}
                  onClick={() => setSelectedIdx(i)}
                  style={{
                    flexShrink: 0, padding: '5px 10px', borderRadius: 10,
                    background: active ? 'rgba(108,142,255,0.15)' : 'var(--card2)',
                    border: `1px solid ${active ? 'rgba(108,142,255,0.35)' : 'var(--border)'}`,
                    color: active ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    textAlign: 'center', minWidth: 44, transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: 9 }}>{d.abbr}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700 }} suppressHydrationWarning>
                    {chipDate.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
          ) : !data ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Nothing planned yet{isParent ? " — tap 'Week plan' to add" : ''}
            </div>
          ) : (
            <>
              {/* Transport */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {([
                  { label: 'Drop-off', time: '7:30am', person: data.dropoff_person },
                  { label: 'Pick-up',  time: '3:10pm', person: data.pickup_person  },
                ] as const).map(({ label, time, person }) => {
                  const cfg = person ? PERSON_CFG[person] : null
                  return (
                    <div key={label} style={{ background: 'var(--card2)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600, marginBottom: 5 }}>
                        🚗 {label}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {cfg && person ? (
                          <>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                              {cfg.initial}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{person}</div>
                            <div style={{ fontSize: 10, marginLeft: 'auto', color: 'var(--muted)' }}>{time}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Not set</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Kids */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { name: 'Isabel', initial: 'I', gradient: 'linear-gradient(135deg,#FBBF24,#F97316)', uniform: data.isabel_uniform, activities: data.isabel_activities },
                  { name: 'James',  initial: 'J', gradient: 'linear-gradient(135deg,#F472B6,#A78BFA)', uniform: data.james_uniform,  activities: data.james_activities  },
                ]).map(kid => (
                  <div key={kid.name} style={{
                    background: kid.uniform === 'pe' ? 'rgba(251,191,36,0.04)' : 'var(--card2)',
                    borderRadius: 14, padding: 12,
                    border: `1px solid ${kid.uniform === 'pe' ? 'rgba(251,191,36,0.3)' : 'transparent'}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: kid.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>
                        {kid.initial}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{kid.name}</div>
                    </div>
                    <div style={{ fontSize: 26, margin: '4px 0' }}>{kid.uniform === 'pe' ? '👟' : '👕'}</div>
                    <div style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      display: 'inline-block', marginBottom: 5,
                      background: kid.uniform === 'pe' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)',
                      color: kid.uniform === 'pe' ? '#FBBF24' : 'rgba(240,242,248,0.45)',
                    }}>
                      {kid.uniform === 'pe' ? 'PE Day' : 'Uniform'}
                    </div>
                    {kid.activities.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                        {kid.activities.map((a, i) => (
                          <span key={i} style={{
                            fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                            background: 'rgba(108,142,255,0.1)', color: 'var(--accent)',
                            display: 'inline-block', margin: '2px 2px 0 0',
                          }}>{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
