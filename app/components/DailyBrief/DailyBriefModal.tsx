'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NZ_TZ = 'Pacific/Auckland'

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
}

function getNZTodayDate(): Date {
  const str = new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getWeekMondayStr(): string {
  const d = getNZTodayDate()
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNZDayOfWeek(): string {
  return new Date().toLocaleDateString('en-NZ', { weekday: 'long', timeZone: NZ_TZ }).toLowerCase()
}

function getTodayNZRange(): { start: string; end: string } {
  const d = new Date()
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: NZ_TZ })
  const nzStr = d.toLocaleString('en-NZ', { timeZone: NZ_TZ, timeZoneName: 'shortOffset' })
  const match = nzStr.match(/GMT([+-]\d+)/)
  const off = match
    ? parseInt(match[1]) >= 0
      ? `+${String(parseInt(match[1])).padStart(2, '0')}:00`
      : `-${String(Math.abs(parseInt(match[1]))).padStart(2, '00')}:00`
    : '+13:00'
  return {
    start: `${dateStr}T00:00:00${off}`,
    end: `${dateStr}T23:59:59${off}`,
  }
}

function isWeekendToday(): boolean {
  const dow = new Date().toLocaleDateString('en-NZ', { weekday: 'long', timeZone: NZ_TZ }).toLowerCase()
  return dow === 'saturday' || dow === 'sunday'
}

function getBriefTimeLine(): string {
  const d = new Date()
  const weekday = d.toLocaleDateString('en-NZ', { weekday: 'long', timeZone: NZ_TZ })
  const dayNum = d.toLocaleDateString('en-NZ', { day: 'numeric', timeZone: NZ_TZ })
  const month = d.toLocaleDateString('en-NZ', { month: 'long', timeZone: NZ_TZ })
  const time = d.toLocaleTimeString('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: NZ_TZ,
  })
  return `${weekday} · ${dayNum} ${month} · ${time}`
}

function getGreetingWord(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

const BRIEF_SUBTITLES = [
  "Buckle up — here's what's on today!",
  "Get ready to rock and roll with today's plans.",
  "Here's the lowdown on your day ahead.",
  "Let's make today a great one — here's the rundown.",
  "Your day, sorted. Let's do this!",
  "Rise and shine — here's what's coming up.",
  "Today's looking good — here's the full picture.",
  "One quick look and you're ready to go.",
  "Here's everything you need to crush today.",
  "All the good stuff, right here, right now.",
  "Consider yourself briefed — go get 'em!",
  "Today's forecast: totally manageable. Here's the plan.",
  "Quick intel before you hit the day running.",
  "You've got this — here's what's on.",
  "Packed day ahead — let's see what we're working with.",
]

function getDailySubtitle(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return BRIEF_SUBTITLES[(dayOfYear - 1) % BRIEF_SUBTITLES.length]
}

type Member = 'M' | 'D' | 'I' | 'J'

const MEMBER_MAP: Record<string, Member> = {
  Mum: 'M',
  Dad: 'D',
  Isabel: 'I',
  James: 'J',
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 }

interface Task {
  id: string
  title: string
  assigned_to: Member[]
  recurrence: string
  due_date?: string
  recurrence_days?: number[]
  recurrence_day_of_month?: number
  is_active: boolean
  priority: string
}

function isTaskDueToday(task: Task): boolean {
  if (!task.is_active) return false
  const today = new Date()
  const dow = today.getDay()
  const dom = today.getDate()
  switch (task.recurrence) {
    case 'daily':   return true
    case 'weekly':
      if (!task.recurrence_days || task.recurrence_days.length === 0) return true
      return task.recurrence_days.includes(dow)
    case 'monthly':
      if (!task.recurrence_day_of_month) return dom === 1
      return task.recurrence_day_of_month === dom
    case 'custom':  return true
    case 'once':    return task.due_date === getToday()
    default:        return false
  }
}

interface Completion {
  task_id: string
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  all_day: boolean
  members: string[]
}

interface SchoolRow {
  dropoff_person: string | null
  pickup_person: string | null
  isabel_uniform: 'pe' | 'uniform'
  james_uniform: 'pe' | 'uniform'
  isabel_activities: string[]
  james_activities: string[]
}

interface MealPlan {
  emoji: string
  meal_name: string
  cook_time?: string
  cooked_by?: string
}

interface WeatherData {
  current: {
    temp: number
    weather: Array<{ id: number; description: string }>
    wind_speed: number
  }
  daily: Array<{ temp: { min: number; max: number } }>
}

function deriveWear(weather: WeatherData): { value: string; sub: string } {
  const temp = Math.round(weather.current.temp)
  const weatherId = weather.current.weather[0]?.id ?? 800
  const windKmh = Math.round((weather.current.wind_speed ?? 0) * 3.6)
  const isRaining = weatherId >= 200 && weatherId < 700
  const isWindy = windKmh > 40

  let value: string
  if (temp < 8) value = 'Heavy coat'
  else if (temp < 12) value = 'Two layers'
  else if (temp < 16) value = 'Light jacket'
  else value = 'Stay cool'

  const desc = weather.current.weather[0]?.description ?? ''
  const conditionStr = desc ? `${desc.charAt(0).toUpperCase() + desc.slice(1)}` : ''
  const extras: string[] = []
  if (isRaining) extras.push('bring a raincoat')
  if (isWindy) extras.push('windy later')

  const daily = weather.daily[0]
  const hiLo = daily ? ` · H ${Math.round(daily.temp.max)}° L ${Math.round(daily.temp.min)}°` : ''
  const sub = [`${temp}° ${conditionStr}`.trim(), ...extras].join(' · ') + hiLo

  return { value, sub }
}

function getWeatherIcon(id: number): string {
  if (id >= 200 && id < 300) return '⛈'
  if (id >= 300 && id < 400) return '🌦'
  if (id >= 500 && id < 600) return '🌧'
  if (id >= 600 && id < 700) return '❄️'
  if (id >= 700 && id < 800) return '🌫'
  if (id === 800) return '☀️'
  if (id === 801) return '🌤'
  if (id <= 804) return '⛅'
  return '🌡'
}

function fmtTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-NZ', {
    timeZone: NZ_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

interface Props {
  onDismiss: () => void
}

export default function DailyBriefModal({ onDismiss }: Props) {
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [schoolRow, setSchoolRow] = useState<SchoolRow | null | undefined>(undefined)
  const [meal, setMeal] = useState<MealPlan | null | undefined>(undefined)
  const [dueTasks, setDueTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [dismissing, setDismissing] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Read user from localStorage
    let memberKey: Member = 'M'
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) {
        const user = JSON.parse(stored)
        setCurrentUser(user)
        memberKey = MEMBER_MAP[user.name] ?? 'M'
      }
    } catch { /* ignore */ }

    // Weather
    fetch('/api/weather')
      .then(r => r.ok ? r.json() : null)
      .then(data => setWeather(data))
      .catch(() => setWeather(null))

    // School plan
    if (!isWeekendToday()) {
      supabase
        .from('school_plan')
        .select('dropoff_person, pickup_person, isabel_uniform, james_uniform, isabel_activities, james_activities')
        .eq('week_start', getWeekMondayStr())
        .eq('day_of_week', getNZDayOfWeek())
        .maybeSingle()
        .then(({ data }) => setSchoolRow(data ?? null))
    } else {
      setSchoolRow(null)
    }

    // Meal
    supabase
      .from('meal_plan')
      .select('emoji, meal_name, cook_time, cooked_by')
      .eq('meal_date', getToday())
      .maybeSingle()
      .then(({ data }) => setMeal(data ?? null))

    // Tasks + completions
    const today = getToday()
    Promise.all([
      supabase.from('tasks').select('id, title, assigned_to, recurrence, due_date, recurrence_days, recurrence_day_of_month, is_active, priority'),
      supabase.from('task_completions').select('task_id').eq('completed_for_date', today),
    ]).then(([{ data: taskData }, { data: compData }]) => {
      const tasks = (taskData as Task[]) ?? []
      const completedIds = new Set(((compData as Completion[]) ?? []).map(c => c.task_id))
      const due = tasks
        .filter(t => isTaskDueToday(t))
        .filter(t => t.assigned_to.includes(memberKey))
        .filter(t => !completedIds.has(t.id))
        .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1))
        .slice(0, 3)
      setDueTasks(due)
    })

    // Events
    const { start, end } = getTodayNZRange()
    supabase
      .from('events')
      .select('id, title, start_time, all_day, members')
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time')
      .then(({ data }) => setEvents((data as CalendarEvent[]) ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDismiss = () => {
    // Write dismiss key to localStorage
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) {
        const user = JSON.parse(stored)
        localStorage.setItem(`brief_dismissed_${user.name}_${getToday()}`, '1')
      }
    } catch { /* ignore */ }

    setDismissing(true)
    setTimeout(() => setDone(true), 380)
    setTimeout(() => onDismiss(), 380 + 2800)
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const wear = weather ? deriveWear(weather) : null
  const weatherId = weather?.current.weather[0]?.id ?? 800
  const weatherIcon = weather ? getWeatherIcon(weatherId) : null
  const weatherTemp = weather ? Math.round(weather.current.temp) : null
  const weatherDesc = weather?.current.weather[0]?.description ?? ''
  const weatherHigh = weather?.daily[0] ? Math.round(weather.daily[0].temp.max) : null
  const weatherLow = weather?.daily[0] ? Math.round(weather.daily[0].temp.min) : null

  const isWeekend = isWeekendToday()
  const isabelPE = schoolRow?.isabel_uniform === 'pe'
  const jamesPE = schoolRow?.james_uniform === 'pe'
  const bothPE = isabelPE && jamesPE
  const eitherPE = isabelPE || jamesPE

  const schoolEmoji = isWeekend ? '🎉' : eitherPE ? '👟' : '🏫'
  const schoolTitle = isWeekend
    ? 'No school!'
    : schoolRow === undefined
    ? '…'
    : schoolRow === null
    ? 'Not planned'
    : bothPE ? 'PE Day' : isabelPE ? 'Isabel PE Day' : jamesPE ? 'James PE Day' : 'School Day'
  const schoolSub = isWeekend
    ? 'Enjoy the weekend!'
    : schoolRow === undefined
    ? ''
    : schoolRow === null
    ? 'Nothing set for today'
    : bothPE
    ? 'Isabel & James · bring sports shoes'
    : isabelPE
    ? 'Isabel · bring sports shoes'
    : jamesPE
    ? 'James · bring sports shoes'
    : 'Regular uniform day'

  const isabelActivities = schoolRow?.isabel_activities ?? []
  const jamesActivities = schoolRow?.james_activities ?? []
  const isabelSwimming = isabelActivities.some(a => a.toLowerCase().includes('swim'))
  const jamesSwimming = jamesActivities.some(a => a.toLowerCase().includes('swim'))
  const hasSwimming = isabelSwimming || jamesSwimming
  const isabelOther = isabelActivities.filter(a => !a.toLowerCase().includes('swim'))
  const jamesOther = jamesActivities.filter(a => !a.toLowerCase().includes('swim'))
  const showReminder = !isWeekend && schoolRow != null && (hasSwimming || isabelOther.length > 0 || jamesOther.length > 0)

  const reminderValue = hasSwimming ? 'Swimming togs + towel' : (isabelOther[0] ?? jamesOther[0] ?? '')
  const reminderSub = (() => {
    const parts: string[] = []
    if (isabelSwimming && jamesSwimming) parts.push('Both kids have swimming')
    else if (isabelSwimming) parts.push('Isabel has swimming')
    else if (jamesSwimming) parts.push('James has swimming')
    if (isabelOther.length > 0) parts.push(`Isabel has ${isabelOther.join(', ')}`)
    if (jamesOther.length > 0) parts.push(`James has ${jamesOther.join(', ')}`)
    return parts.join(' · ')
  })()

  // Animation delay offsets — shift later tiles if reminder tile is visible
  const tileBase = 0.18
  const tileGap = 0.06
  const reminderSlot = showReminder ? 1 : 0 // extra tile in grid
  const dOffset = (n: number) => `${tileBase + n * tileGap + (n > 1 ? reminderSlot * tileGap : 0)}s`

  return (
    <>
      <style>{`
        @keyframes briefOverlayIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes briefOverlayOut { to { opacity: 0; } }
        @keyframes briefSheetUp    { from { transform: translateY(100%); opacity: 0.5; } to { transform: translateY(0); opacity: 1; } }
        @keyframes briefSheetDown  { to { transform: translateY(110%); opacity: 0; } }
        @keyframes briefTileIn     { from { opacity: 0; transform: scale(0.94) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes briefBtnIn      { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes briefDoneIn     { from { opacity: 0; } to { opacity: 1; } }
        @keyframes briefPopIn      { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .brief-scroll::-webkit-scrollbar { display: none; }
        .brief-btn:active { transform: scale(0.97) !important; opacity: 0.85 !important; }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5,5,10,0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 200,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: dismissing
            ? 'briefOverlayOut 0.4s ease forwards'
            : 'briefOverlayIn 0.4s ease both',
        }}
      >
        {/* Sheet */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 390,
            maxHeight: '92vh',
            background: '#11111c',
            borderRadius: '28px 28px 0 0',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: dismissing
              ? 'briefSheetDown 0.4s cubic-bezier(0.55,0,1,0.45) forwards'
              : 'briefSheetUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both',
          }}
        >
          {/* Radial glow */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 200,
            background: 'radial-gradient(ellipse at 50% -20%, rgba(96,165,250,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          {/* Drag pill */}
          <div style={{
            width: 36, height: 4,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            margin: '12px auto 0',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }} />

          {/* Header */}
          <div style={{
            padding: '16px 22px 12px',
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(240,238,232,0.45)',
              marginBottom: 6,
            }} suppressHydrationWarning>
              {getBriefTimeLine()}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 4 }}>
              {getGreetingWord()}, {currentUser?.name ?? '…'} 👋
            </div>
            <div style={{ fontSize: 14, color: 'rgba(240,238,232,0.45)', lineHeight: 1.4 }} suppressHydrationWarning>
              {getDailySubtitle()}
            </div>
          </div>

          {/* Scrollable tile area */}
          <div
            className="brief-scroll"
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
              padding: '8px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              position: 'relative',
              zIndex: 2,
              scrollbarWidth: 'none',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

              {/* ── WHAT TO WEAR ── */}
              <div style={{
                borderRadius: 16, padding: 14,
                background: 'linear-gradient(145deg, #1a1f2e, #141928)',
                border: '1px solid rgba(96,165,250,0.2)',
                animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(0)} both`,
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>🧥</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#60a5fa', marginBottom: 4 }}>What to wear</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: '#f0eee8' }}>
                  {wear ? wear.value : '…'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                  {wear?.sub ?? ''}
                </div>
              </div>

              {/* ── SCHOOL TODAY ── */}
              <div style={{
                borderRadius: 16, padding: 14,
                background: 'linear-gradient(145deg, #1f1a10, #19150a)',
                border: '1px solid rgba(251,191,36,0.2)',
                animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(1)} both`,
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>{schoolEmoji}</div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#fbbf24', marginBottom: 4 }}>School today</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: '#f0eee8' }}>
                  {schoolTitle}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                  {schoolSub}
                </div>
              </div>

              {/* ── DON'T FORGET (wide, conditional) ── */}
              {showReminder && (
                <div style={{
                  gridColumn: 'span 2',
                  borderRadius: 16, padding: 14,
                  background: 'linear-gradient(145deg, #201510, #1a100c)',
                  border: '1px solid rgba(251,146,60,0.2)',
                  animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${tileBase + 2 * tileGap}s both`,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>
                    {hasSwimming ? '🏊' : '⭐'}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#fb923c', marginBottom: 4 }}>Don&apos;t forget</div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: '#f0eee8' }}>
                    {reminderValue}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                    {reminderSub}
                  </div>
                </div>
              )}

              {/* ── DINNER TONIGHT ── */}
              <div style={{
                borderRadius: 16, padding: 14,
                background: 'linear-gradient(145deg, #1f1020, #170d1a)',
                border: '1px solid rgba(244,114,182,0.2)',
                animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(2)} both`,
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>
                  {meal?.emoji ?? '🍽'}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#f472b6', marginBottom: 4 }}>Dinner tonight</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: '#f0eee8' }}>
                  {meal === undefined ? '…' : meal === null ? 'Nothing planned' : meal.meal_name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                  {meal?.cook_time
                    ? `${meal.cook_time}${meal.cooked_by ? ` · ${meal.cooked_by} cooking` : ''}`
                    : meal?.cooked_by
                    ? `${meal.cooked_by} cooking`
                    : ''}
                </div>
              </div>

              {/* ── WEATHER SNAPSHOT ── */}
              <div style={{
                borderRadius: 16, padding: 14,
                background: 'linear-gradient(145deg, #131d2a, #0f1820)',
                border: '1px solid rgba(96,165,250,0.15)',
                animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(3)} both`,
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>
                  {weatherIcon ?? '⛅'}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#60a5fa', marginBottom: 4 }}>Weather</div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25, color: '#f0eee8' }}>
                  {weatherTemp !== null
                    ? `${weatherTemp}° ${weatherDesc ? weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1) : ''}`.trim()
                    : '…'}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)', marginTop: 3, lineHeight: 1.4 }}>
                  {weatherHigh !== null && weatherLow !== null
                    ? `H ${weatherHigh}° L ${weatherLow}°`
                    : ''}
                </div>
              </div>

              {/* ── SCHOOL RUNS (wide, hidden on weekends) ── */}
              {!isWeekend && (
                <div style={{
                  gridColumn: 'span 2',
                  borderRadius: 16, padding: '14px 16px',
                  background: 'linear-gradient(145deg, #0f1f18, #0c1a14)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(4)} both`,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 8 }}>
                    🚗 School runs
                  </div>
                  {([
                    { label: 'Drop-off', person: schoolRow?.dropoff_person, time: '8:30', ampm: 'am' },
                    { label: 'Pick-up',  person: schoolRow?.pickup_person,  time: '3:00', ampm: 'pm' },
                  ] as const).map((row, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '3px 0',
                      ...(i === 0 ? { borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 6, marginBottom: 3 } : {}),
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#f0eee8' }}>
                        {row.label}{row.person ? ` · ${row.person}` : ''}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(240,238,232,0.45)' }}>
                        {row.time}
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginLeft: 4 }}>{row.ampm}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TASKS DUE TODAY (wide, conditional) ── */}
              {dueTasks.length > 0 && (
                <div style={{
                  gridColumn: 'span 2',
                  borderRadius: 16, padding: '14px 16px',
                  background: 'linear-gradient(145deg, #1c1520, #16101a)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(5)} both`,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 8 }}>
                    ⚡ Due today
                  </div>
                  {dueTasks.map((task, i) => (
                    <div key={task.id} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '3px 0',
                      ...(i < dueTasks.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 5, marginBottom: 2 } : {}),
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#f0eee8', lineHeight: 1.3 }}>{task.title}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── CALENDAR EVENTS (wide, conditional) ── */}
              {events.length > 0 && (
                <div style={{
                  gridColumn: 'span 2',
                  borderRadius: 16, padding: '14px 16px',
                  background: '#1c1c26',
                  border: '1px solid rgba(255,255,255,0.07)',
                  animation: `briefTileIn 0.4s cubic-bezier(0.22,1,0.36,1) ${dOffset(6)} both`,
                  overflow: 'hidden',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(240,238,232,0.45)', marginBottom: 8 }}>
                    📅 Today&apos;s events
                  </div>
                  {events.slice(0, 3).map((ev, i) => (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '4px 0',
                      ...(i < Math.min(events.length, 3) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 7, marginBottom: 3 } : {}),
                    }}>
                      <span style={{
                        flexShrink: 0,
                        background: 'rgba(96,165,250,0.15)',
                        color: '#60a5fa',
                        borderRadius: 100,
                        padding: '2px 8px',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {ev.all_day ? 'All day' : fmtTime(ev.start_time)}
                      </span>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: '#f0eee8',
                        flex: 1, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

          {/* Footer — CTA button */}
          <div style={{
            padding: `10px 14px calc(env(safe-area-inset-bottom, 0px) + 20px)`,
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}>
            <button
              className="brief-btn"
              onClick={handleDismiss}
              style={{
                width: '100%',
                background: '#f0eee8',
                color: '#0a0a0f',
                border: 'none',
                borderRadius: 100,
                padding: '16px 24px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 17, fontWeight: 700,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'transform 0.12s ease, opacity 0.12s ease',
                animation: 'briefBtnIn 0.4s cubic-bezier(0.22,1,0.36,1) 0.6s both',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: 20 }}>✅</span>
              All Set — let&apos;s go!
            </button>
          </div>

        </div>
      </div>

      {/* Done / farewell state */}
      {done && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          animation: 'briefDoneIn 0.4s ease both',
        }}>
          <div style={{ fontSize: 56, animation: 'briefPopIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', color: '#f0eee8' }}>
            Have a great day, {currentUser?.name ?? ''}!
          </div>
          <div style={{ fontSize: 14, color: 'rgba(240,238,232,0.45)', textAlign: 'center' }}>
            Loading your dashboard…
          </div>
        </div>
      )}
    </>
  )
}
