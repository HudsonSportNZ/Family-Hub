'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  eachDayOfInterval, isSameMonth,
} from 'date-fns'
import EventModal, { MEMBERS, CalendarEvent } from './EventModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const NZ_TZ    = 'Pacific/Auckland'
const DAY_START = 7   // 7 am
const DAY_END   = 21  // 9 pm
const HOUR_PX   = 64  // pixels per hour

type View = 'day' | 'week' | 'month'

// ── HELPERS ────────────────────────────────────────────────────────────────

function getNZDateStr(d: Date | string): string {
  return new Date(typeof d === 'string' ? d : d).toLocaleDateString('en-CA', { timeZone: NZ_TZ })
}

function getNZHourMin(ts: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: NZ_TZ, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date(ts))
  return {
    hour:   parseInt(parts.find(p => p.type === 'hour')?.value   ?? '0'),
    minute: parseInt(parts.find(p => p.type === 'minute')?.value ?? '0'),
  }
}

function isTodayNZ(date: Date): boolean {
  return getNZDateStr(date) === getNZDateStr(new Date())
}

function isEventOnDay(eventTs: string, date: Date): boolean {
  return getNZDateStr(eventTs) === getNZDateStr(date)
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-NZ', {
    timeZone: NZ_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function eventColor(ev: CalendarEvent): string {
  if (ev.colour) return ev.colour
  const first = MEMBERS.find(m => ev.members.includes(m.id))
  return first?.color ?? '#6C8EFF'
}

function eventPos(ev: CalendarEvent): { top: number; height: number } {
  const s = getNZHourMin(ev.start_time)
  const e = getNZHourMin(ev.end_time)
  const topMins   = (s.hour - DAY_START) * 60 + s.minute
  const endMins   = (e.hour - DAY_START) * 60 + e.minute
  const durMins   = Math.max(endMins - topMins, 30) // min 30-min height
  const maxMins   = (DAY_END - DAY_START) * 60
  return {
    top:    Math.min(Math.max(topMins / 60 * HOUR_PX, 0), (maxMins - 30) / 60 * HOUR_PX),
    height: Math.min(durMins / 60 * HOUR_PX, (maxMins - topMins) / 60 * HOUR_PX),
  }
}

function currentTimePx(): number {
  const { hour, minute } = getNZHourMin(new Date().toISOString())
  return ((hour - DAY_START) + minute / 60) * HOUR_PX
}

// Assign column layout to overlapping events
function layoutEvents(evts: CalendarEvent[]): { ev: CalendarEvent; col: number; maxCols: number }[] {
  const sorted = [...evts].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  const colEnds: number[] = []
  const laid = sorted.map(ev => {
    const s = new Date(ev.start_time).getTime()
    let col = colEnds.findIndex(end => end <= s)
    if (col === -1) col = colEnds.length
    colEnds[col] = new Date(ev.end_time).getTime()
    return { ev, col, maxCols: 0 }
  })
  laid.forEach(item => {
    const s = new Date(item.ev.start_time).getTime()
    const e = new Date(item.ev.end_time).getTime()
    const concurrent = laid.filter(o =>
      new Date(o.ev.start_time).getTime() < e && new Date(o.ev.end_time).getTime() > s
    )
    item.maxCols = Math.max(...concurrent.map(c => c.col)) + 1
  })
  return laid
}

function eventsForDay(events: CalendarEvent[], date: Date, filters: string[]): CalendarEvent[] {
  return events.filter(ev => {
    if (!isEventOnDay(ev.start_time, date)) return false
    if (filters.length === 0) return true
    return ev.members.some(m => filters.includes(m))
  })
}

function expandEvents(evts: CalendarEvent[], from: Date, to: Date): CalendarEvent[] {
  const result: CalendarEvent[] = []
  for (const ev of evts) {
    result.push(ev)
    if (!ev.recurrence || ev.recurrence === 'none') continue
    const duration = new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()
    let cur = new Date(ev.start_time)
    for (let i = 1; i <= 400; i++) {
      cur = ev.recurrence === 'daily'   ? addDays(cur, 1)
          : ev.recurrence === 'weekly'  ? addWeeks(cur, 1)
          : addMonths(cur, 1)
      if (cur > to) break
      if (cur >= from) {
        result.push({
          ...ev,
          id:         `${ev.id}_r${i}`,
          start_time: cur.toISOString(),
          end_time:   new Date(cur.getTime() + duration).toISOString(),
          _parentId:  ev.id,
        })
      }
    }
  }
  return result
}

// ── SUBCOMPONENTS ──────────────────────────────────────────────────────────

function MemberAvatars({ members, size = 16 }: { members: string[]; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {members.slice(0, 3).map(id => {
        const m = MEMBERS.find(x => x.id === id)
        if (!m) return null
        return (
          <div key={id} style={{
            width: size, height: size, borderRadius: '50%',
            background: m.color, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: size * 0.48, fontWeight: 700,
            color: 'white', fontFamily: "'Syne', sans-serif", flexShrink: 0,
          }}>
            {m.initial}
          </div>
        )
      })}
    </div>
  )
}

function TimeColumn() {
  return (
    <div style={{ width: 44, flexShrink: 0, position: 'relative', height: (DAY_END - DAY_START) * HOUR_PX }}>
      {Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i).map(h => (
        <div key={h} style={{
          position: 'absolute', top: (h - DAY_START) * HOUR_PX - 8,
          width: '100%', textAlign: 'right', paddingRight: 8,
          fontSize: 10, color: 'rgba(240,242,248,0.3)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
        </div>
      ))}
    </div>
  )
}

function EventBlock({
  ev, style, onClick,
}: { ev: CalendarEvent; style: React.CSSProperties; onClick: () => void }) {
  const color = eventColor(ev)
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        position: 'absolute',
        background: color + '28',
        border: `1px solid ${color}50`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: '3px 6px',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'filter 0.15s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#F0F2F8', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ev.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: 'rgba(240,242,248,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fmtTime(ev.start_time)}
        </span>
        <MemberAvatars members={ev.members} size={13} />
      </div>
    </div>
  )
}

// ── DAY VIEW ───────────────────────────────────────────────────────────────
function DayView({
  date, events, filters, onEventClick, onSlotClick,
}: {
  date: Date
  events: CalendarEvent[]
  filters: string[]
  onEventClick: (ev: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
}) {
  const dayEvts    = eventsForDay(events, date, filters).filter(e => !e.all_day)
  const allDayEvts = eventsForDay(events, date, filters).filter(e => e.all_day)
  const laid       = layoutEvents(dayEvts)
  const showLine   = isTodayNZ(date)
  const hours      = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
  const gridH      = (DAY_END - DAY_START) * HOUR_PX

  return (
    <div>
      {allDayEvts.length > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {allDayEvts.map(ev => (
            <div
              key={ev.id}
              onClick={() => onEventClick(ev)}
              style={{
                background: eventColor(ev) + '28',
                borderLeft: `3px solid ${eventColor(ev)}`,
                borderRadius: 6, padding: '4px 10px',
                fontSize: 12, fontWeight: 600, color: '#F0F2F8',
                cursor: 'pointer', marginBottom: 4,
              }}
            >
              {ev.title}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)', paddingBottom: 80 }}>
        <TimeColumn />
        <div
          style={{ flex: 1, position: 'relative', height: gridH, cursor: 'crosshair' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            const hour = Math.floor((e.clientY - rect.top) / HOUR_PX) + DAY_START
            onSlotClick(date, Math.min(Math.max(hour, DAY_START), DAY_END - 1))
          }}
        >
          {hours.map(h => (
            <div key={h} style={{
              position: 'absolute', top: (h - DAY_START) * HOUR_PX,
              left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.05)',
            }} />
          ))}
          {showLine && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              top: currentTimePx(), zIndex: 5, pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1.5, background: '#F87171' }} />
              </div>
            </div>
          )}
          {laid.map(({ ev, col, maxCols }) => {
            const { top, height } = eventPos(ev)
            const w = 1 / maxCols
            return (
              <EventBlock
                key={ev.id}
                ev={ev}
                onClick={() => onEventClick(ev)}
                style={{
                  top: top + 1, height: height - 2,
                  left: `calc(${col * w * 100}% + 2px)`,
                  width: `calc(${w * 100}% - 4px)`,
                  zIndex: 2,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── WEEK VIEW ──────────────────────────────────────────────────────────────
// Shows 7 days; 3 visible at once via horizontal scroll only.
// Time column is pinned left. Full 7am–9pm range fits without vertical scroll.
function WeekView({
  weekStart, events, filters, onEventClick, onSlotClick, onDayHeaderClick,
}: {
  weekStart: Date
  events: CalendarEvent[]
  filters: string[]
  onEventClick: (ev: CalendarEvent) => void
  onSlotClick: (date: Date, hour: number) => void
  onDayHeaderClick: (date: Date) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [weekHeight, setWeekHeight] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      setContainerWidth(el.offsetWidth)
      const top = el.getBoundingClientRect().top
      const vh  = window.visualViewport?.height ?? window.innerHeight
      // 88px ≈ mobile nav (49px) + iOS safe-area-bottom (~34px) + buffer (5px)
      setWeekHeight(Math.max(vh - top - 88, 300))
    }
    update()
    // Re-measure after toolbar may have reflowed (flexWrap on narrow screens)
    const t = setTimeout(update, 80)
    const obs = new ResizeObserver(update)
    obs.observe(el)
    window.addEventListener('resize', update)
    return () => {
      clearTimeout(t)
      obs.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  const days       = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours      = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
  const TOTAL_MINS = (DAY_END - DAY_START) * 60
  const HEADER_H   = 52
  const colWidth   = containerWidth > 44 ? Math.floor((containerWidth - 44) / 3) : 120

  // Convert minutes-from-DAY_START to a percentage of the total grid height
  const toTop = (mins: number) => `${(mins / TOTAL_MINS) * 100}%`

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', height: weekHeight || 500, minHeight: 300, overflow: 'hidden' }}
    >
      {/* ── Pinned time column ─────────────────────────────────────────── */}
      <div style={{
        width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column',
        zIndex: 3, background: '#13151C',
      }}>
        {/* Spacer matches day-header height */}
        <div style={{ height: HEADER_H, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }} />
        {/* Time labels — percentage positioned to align with grid lines */}
        <div style={{ flex: 1, position: 'relative' }}>
          {hours.map((h, i) => (
            <div key={h} style={{
              position: 'absolute',
              top: toTop(i * 60),
              width: '100%', textAlign: 'right', paddingRight: 6,
              fontSize: 9, color: 'rgba(240,242,248,0.3)',
              transform: 'translateY(-50%)',
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
            }}>
              {h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}
        </div>
      </div>

      {/* ── Horizontal scroll: 3 days visible, no vertical scroll ──────── */}
      <div style={{
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {/* Inner container exactly wide enough for 7 columns */}
        <div style={{ display: 'flex', height: '100%', width: colWidth * 7 }}>
          {days.map(d => {
            const dayEvts = eventsForDay(events, d, filters).filter(e => !e.all_day)
            const laid    = layoutEvents(dayEvts)
            const today   = isTodayNZ(d)

            // Current time percentage (only computed for today)
            const nowMins = (() => {
              if (!today) return -1
              const { hour, minute } = getNZHourMin(new Date().toISOString())
              return (hour - DAY_START) * 60 + minute
            })()

            return (
              <div key={d.toISOString()} style={{
                width: colWidth, flexShrink: 0, height: '100%',
                display: 'flex', flexDirection: 'column',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
              }}>
                {/* Day header */}
                <div
                  onClick={() => onDayHeaderClick(d)}
                  style={{
                    height: HEADER_H, flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    background: today ? 'rgba(108,142,255,0.05)' : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'rgba(240,242,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {format(d, 'EEE')}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: '50%', marginTop: 3,
                    background: today ? '#6C8EFF' : 'transparent',
                    fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
                    color: today ? 'white' : 'rgba(240,242,248,0.85)',
                  }}>
                    {format(d, 'd')}
                  </div>
                </div>

                {/* Day body — percentage-positioned events, no vertical scroll */}
                <div
                  style={{
                    flex: 1, position: 'relative', overflow: 'hidden',
                    background: today ? 'rgba(108,142,255,0.03)' : 'transparent',
                    cursor: 'crosshair',
                  }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const pct  = (e.clientY - rect.top) / rect.height
                    const hour = Math.floor(pct * (DAY_END - DAY_START)) + DAY_START
                    onSlotClick(d, Math.min(Math.max(hour, DAY_START), DAY_END - 1))
                  }}
                >
                  {/* Hour grid lines */}
                  {hours.map((_, i) => (
                    <div key={i} style={{
                      position: 'absolute', top: toTop(i * 60),
                      left: 0, right: 0,
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                      pointerEvents: 'none',
                    }} />
                  ))}

                  {/* Current time indicator */}
                  {today && nowMins >= 0 && nowMins <= TOTAL_MINS && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0,
                      top: toTop(nowMins), zIndex: 5, pointerEvents: 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 1.5, background: '#F87171' }} />
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {laid.map(({ ev, col, maxCols }) => {
                    const s       = getNZHourMin(ev.start_time)
                    const e       = getNZHourMin(ev.end_time)
                    const topMins = Math.max((s.hour - DAY_START) * 60 + s.minute, 0)
                    const endMins = Math.min((e.hour - DAY_START) * 60 + e.minute, TOTAL_MINS)
                    const durMins = Math.max(endMins - topMins, 30)
                    const w       = 1 / maxCols
                    return (
                      <EventBlock
                        key={ev.id}
                        ev={ev}
                        onClick={() => onEventClick(ev)}
                        style={{
                          top:    toTop(topMins),
                          height: `calc(${toTop(durMins)} - 2px)`,
                          left:   `calc(${col * w * 100}% + 1px)`,
                          width:  `calc(${w * 100}% - 2px)`,
                          zIndex: 2,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── MONTH VIEW ─────────────────────────────────────────────────────────────
function MonthView({
  month, events, filters, onEventClick, onDayClick,
}: {
  month: Date
  events: CalendarEvent[]
  filters: string[]
  onEventClick: (ev: CalendarEvent) => void
  onDayClick: (date: Date) => void
}) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const gridEnd   = endOfWeek(endOfMonth(month),     { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const numWeeks  = days.length / 7

  return (
    // Fixed height flex column — no scrolling, cells fill screen evenly
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 180px)',
    }}>
      {/* Day-of-week headers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: '#13151C', flexShrink: 0,
      }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} style={{ textAlign: 'center', padding: '7px 0', fontSize: 10, color: 'rgba(240,242,248,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid — equal rows, no overflow */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(7,1fr)',
        gridTemplateRows: `repeat(${numWeeks},1fr)`,
      }}>
        {days.map(d => {
          const dayEvts = eventsForDay(events, d, filters)
          const inMonth = isSameMonth(d, month)
          const today   = isTodayNZ(d)
          const dStr    = format(d, 'yyyy-MM-dd')
          const overflow = dayEvts.length - 2

          return (
            <div
              key={dStr}
              onClick={() => onDayClick(d)}
              style={{
                padding: '4px 2px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                borderRight:  '1px solid rgba(255,255,255,0.05)',
                background: today ? 'rgba(108,142,255,0.06)' : 'transparent',
                opacity: inMonth ? 1 : 0.3,
                cursor: 'pointer', transition: 'background 0.15s',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Date number */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2, flexShrink: 0 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: today ? '#6C8EFF' : 'transparent',
                  fontSize: 11, fontWeight: today ? 700 : 400,
                  color: today ? 'white' : inMonth ? 'rgba(240,242,248,0.85)' : 'rgba(240,242,248,0.3)',
                  fontFamily: "'Syne', sans-serif",
                }}>
                  {format(d, 'd')}
                </div>
              </div>

              {/* Up to 2 event chips */}
              {dayEvts.slice(0, 2).map(ev => (
                <div
                  key={ev.id}
                  onClick={e => { e.stopPropagation(); onEventClick(ev) }}
                  style={{
                    background: eventColor(ev) + '30',
                    borderLeft: `2px solid ${eventColor(ev)}`,
                    borderRadius: 3, padding: '1px 3px',
                    fontSize: 9, fontWeight: 600, color: '#F0F2F8',
                    marginBottom: 1, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {ev.all_day
                    ? ev.title
                    : `${fmtTime(ev.start_time).replace(':00', '').replace(' ', '')} ${ev.title}`}
                </div>
              ))}

              {overflow > 0 && (
                <div style={{ fontSize: 9, color: 'rgba(240,242,248,0.4)', paddingLeft: 2, flexShrink: 0 }}>
                  +{overflow}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function CalendarModule() {
  const [view,        setView]        = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filters,     setFilters]     = useState<string[]>([])
  // undefined = closed, null = new event, CalendarEvent = editing
  const [modalEvent,  setModalEvent]  = useState<CalendarEvent | null | undefined>(undefined)
  const [modalDate,   setModalDate]   = useState(new Date())
  const [modalHour,   setModalHour]   = useState(9)
  const [, setTick] = useState(0) // force re-render every minute for time indicator

  // ── Fetch events
  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time')
    if (!error && data) setEvents(data as CalendarEvent[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Refetch whenever the tab becomes visible again (handles Supabase cold-start)
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') fetchEvents() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [fetchEvents])

  // ── Real-time subscription
  useEffect(() => {
    const ch = supabase
      .channel('calendar-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (payload.eventType === 'INSERT') {
          setEvents(prev => [...prev, payload.new as CalendarEvent]
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()))
        } else if (payload.eventType === 'UPDATE') {
          setEvents(prev => prev.map(e => e.id === (payload.new as CalendarEvent).id ? payload.new as CalendarEvent : e))
        } else if (payload.eventType === 'DELETE') {
          setEvents(prev => prev.filter(e => e.id !== (payload.old as { id: string }).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Tick every minute (current time indicator)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Navigation
  const navigate = (dir: 1 | -1) => {
    setCurrentDate(d => {
      if (view === 'day')   return dir === 1 ? addDays(d, 1)    : subDays(d, 1)
      if (view === 'week')  return dir === 1 ? addWeeks(d, 1)   : subWeeks(d, 1)
      return                       dir === 1 ? addMonths(d, 1)  : subMonths(d, 1)
    })
  }

  const toggleFilter = (id: string) =>
    setFilters(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])

  const openCreate = (date: Date, hour: number) => {
    setModalDate(date)
    setModalHour(hour)
    setModalEvent(null)
  }

  const openEdit = (ev: CalendarEvent) => {
    const realEv = ev._parentId ? events.find(e => e.id === ev._parentId) ?? ev : ev
    setModalEvent(realEv)
  }

  const handleSave = (saved: CalendarEvent) => {
    setEvents(prev => {
      const exists = prev.some(e => e.id === saved.id)
      if (exists) return prev.map(e => e.id === saved.id ? saved : e)
      return [...prev, saved].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    })
    setModalEvent(undefined)
  }

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
    setModalEvent(undefined)
  }

  // ── Expand recurring events ±3 months around current date
  const expandedEvents = useMemo(() => {
    const from = subMonths(currentDate, 3)
    const to   = addMonths(currentDate, 3)
    return expandEvents(events, from, to)
  }, [events, currentDate])

  // ── Header title
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const headerTitle =
    view === 'day'   ? format(currentDate, 'EEEE, d MMMM yyyy') :
    view === 'week'  ? `${format(weekStart, 'd MMM')} – ${format(addDays(weekStart, 6), 'd MMM yyyy')}` :
    format(currentDate, 'MMMM yyyy')

  return (
    <>
      <style>{`
        .cal-view-btn {
          padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: 'Inter', sans-serif;
          border: 1px solid transparent;
        }
        .cal-view-btn.active {
          background: rgba(108,142,255,0.18); border-color: rgba(108,142,255,0.35); color: #6C8EFF;
        }
        .cal-view-btn:not(.active) {
          background: transparent; color: rgba(240,242,248,0.5);
        }
        .cal-view-btn:not(.active):hover {
          background: rgba(255,255,255,0.05); color: rgba(240,242,248,0.8);
        }
        .cal-nav-btn {
          width: 30px; height: 30px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: rgba(240,242,248,0.7); font-size: 14px; transition: all 0.15s;
          user-select: none;
        }
        .cal-nav-btn:hover { background: rgba(255,255,255,0.1); color: #F0F2F8; }
        .cal-today-btn {
          padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
          cursor: pointer; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1); color: rgba(240,242,248,0.7);
          font-family: 'Inter', sans-serif; transition: all 0.15s;
        }
        .cal-today-btn:hover { background: rgba(255,255,255,0.1); color: #F0F2F8; }
        .cal-add-btn {
          width: 30px; height: 30px; border-radius: 8px; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
          background: rgba(108,142,255,0.15); border: 1px solid rgba(108,142,255,0.3);
          color: #6C8EFF; font-size: 18px; line-height: 1; font-weight: 300;
          transition: all 0.15s; user-select: none;
        }
        .cal-add-btn:hover { background: rgba(108,142,255,0.25); }
        .cal-filter-chip {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 20px; cursor: pointer;
          font-size: 12px; font-weight: 600; transition: all 0.15s;
          border: 1px solid transparent; flex-shrink: 0; user-select: none;
        }
      `}</style>

      <div style={{ color: '#F0F2F8', fontFamily: "'Inter', sans-serif" }}>

        {/* ── TOOLBAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* Nav arrows + today */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="cal-nav-btn" onClick={() => navigate(-1)}>‹</div>
            <div className="cal-nav-btn" onClick={() => navigate(1)}>›</div>
            <button className="cal-today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
          </div>

          {/* Title */}
          <div style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#F0F2F8', minWidth: 120 }}>
            {headerTitle}
          </div>

          {/* View switcher + add button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['day', 'week', 'month'] as View[]).map(v => (
                <button key={v} className={`cal-view-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <div className="cal-add-btn" onClick={() => openCreate(currentDate, 9)} title="New event">+</div>
          </div>
        </div>

        {/* ── MEMBER FILTERS ── */}
        <div style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          <div
            className="cal-filter-chip"
            onClick={() => setFilters([])}
            style={{
              background: filters.length === 0 ? 'rgba(108,142,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filters.length === 0 ? 'rgba(108,142,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: filters.length === 0 ? '#6C8EFF' : 'rgba(240,242,248,0.5)',
            }}
          >
            All
          </div>
          {MEMBERS.map(m => {
            const active = filters.includes(m.id)
            return (
              <div
                key={m.id}
                className="cal-filter-chip"
                onClick={() => toggleFilter(m.id)}
                style={{
                  background: active ? m.color + '20' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? m.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  color: active ? m.color : 'rgba(240,242,248,0.5)',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                {m.label}
              </div>
            )
          })}
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(240,242,248,0.4)', fontSize: 14 }}>
            Loading events…
          </div>
        )}

        {/* ── VIEWS ── */}
        {!loading && view === 'day' && (
          <DayView
            date={currentDate}
            events={expandedEvents}
            filters={filters}
            onEventClick={openEdit}
            onSlotClick={openCreate}
          />
        )}
        {!loading && view === 'week' && (
          <WeekView
            weekStart={weekStart}
            events={expandedEvents}
            filters={filters}
            onEventClick={openEdit}
            onSlotClick={openCreate}
            onDayHeaderClick={d => { setCurrentDate(d); setView('day') }}
          />
        )}
        {!loading && view === 'month' && (
          <MonthView
            month={currentDate}
            events={expandedEvents}
            filters={filters}
            onEventClick={openEdit}
            onDayClick={d => { setCurrentDate(d); setView('day') }}
          />
        )}

        {/* ── EVENT MODAL ── */}
        {modalEvent !== undefined && (
          <EventModal
            event={modalEvent}
            defaultDate={modalDate}
            defaultHour={modalHour}
            onClose={() => setModalEvent(undefined)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}

      </div>
    </>
  )
}
