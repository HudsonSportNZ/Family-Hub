'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import EventModal from './EventModal'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TODAY = new Date().toISOString().split('T')[0]
const NZ_TZ = 'Pacific/Auckland'

type Member = 'M' | 'D' | 'I' | 'J'

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
  icon: string
}

interface Completion {
  id: string
  task_id: string
  completed_by: Member
  completed_for_date: string
}

interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  all_day: boolean
  location?: string
  members: string[]
  colour?: string
}

const EVENT_MEMBERS = [
  { id: 'mum',    label: 'Mum',    initial: 'M', color: '#6C8EFF' },
  { id: 'dad',    label: 'Dad',    initial: 'D', color: '#34D399' },
  { id: 'isabel', label: 'Isabel', initial: 'I', color: '#F472B6' },
  { id: 'james',  label: 'James',  initial: 'J', color: '#FBBF24' },
]

function eventColor(ev: CalendarEvent): string {
  if (ev.colour) return ev.colour
  const first = EVENT_MEMBERS.find(m => ev.members.includes(m.id))
  return first?.color ?? '#6C8EFF'
}

function fmtEventTime(ts: string): { time: string; ampm: string } {
  const str = new Date(ts).toLocaleTimeString('en-NZ', {
    timeZone: NZ_TZ, hour: 'numeric', minute: '2-digit', hour12: true,
  })
  const parts = str.split(' ')
  return { time: parts[0], ampm: parts[1] ?? '' }
}

function getTodayNZRange(): { start: string; end: string } {
  const d = new Date()
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: NZ_TZ }) // YYYY-MM-DD
  // Get the NZ offset for today
  const nzStr = d.toLocaleString('en-NZ', { timeZone: NZ_TZ, timeZoneName: 'shortOffset' })
  const match = nzStr.match(/GMT([+-]\d+)/)
  const off = match ? (parseInt(match[1]) >= 0 ? `+${String(parseInt(match[1])).padStart(2,'0')}:00` : `-${String(Math.abs(parseInt(match[1]))).padStart(2,'0')}:00`) : '+13:00'
  return {
    start: `${dateStr}T00:00:00${off}`,
    end:   `${dateStr}T23:59:59${off}`,
  }
}

function getMemberLabel(members: string[]): string {
  if (members.length === 0) return ''
  if (members.length === 4) return 'All'
  return members.map(m => EVENT_MEMBERS.find(x => x.id === m)?.label ?? m).join(', ')
}

function isTaskDueToday(task: Task): boolean {
  if (!task.is_active) return false
  const today = new Date()
  const dow = today.getDay()
  const dom = today.getDate()
  switch (task.recurrence) {
    case 'daily':   return true
    case 'weekly':  return (task.recurrence_days ?? []).includes(dow)
    case 'monthly': return task.recurrence_day_of_month === dom
    case 'custom':  return true
    case 'once':    return task.due_date === TODAY
    default:        return false
  }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const navItems = [
  { id: 'tasks',    icon: '✅', label: 'Tasks',    href: '/tasks'    },
  { id: 'schedule', icon: '📅', label: 'Calendar', href: '/calendar' },
  { id: 'meals',    icon: '🍴', label: 'Food',     href: null        },
  { id: 'money',    icon: '💰', label: 'Money',    href: null        },
  { id: 'chat',     icon: '💬', label: 'Chat',     href: '/chat'     },
]

const FAMILY = [
  { id: 'M', label: 'Mum',    color: '#6C8EFF' },
  { id: 'D', label: 'Dad',    color: '#34D399' },
  { id: 'I', label: 'Isabel', color: '#FBBF24' },
  { id: 'J', label: 'James',  color: '#F472B6' },
]

export default function Dashboard() {
  const pathname = usePathname()
  const activeNav = pathname === '/' ? 'home' : (navItems.find(i => i.href && i.href !== '/' && pathname.startsWith(i.href))?.id ?? 'home')

  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [activeMember, setActiveMember] = useState('M')
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) setCurrentUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const handleSwitchUser = () => {
    localStorage.removeItem('familyUser')
    window.location.href = '/login'
  }

  useEffect(() => {
    const fetchTasks = async () => {
      const [{ data: taskData }, { data: completionData }] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('task_completions').select('*').eq('completed_for_date', TODAY),
      ])
      setTasks((taskData as Task[]) ?? [])
      setCompletions((completionData as Completion[]) ?? [])
    }
    fetchTasks()
  }, [])

  // Fetch today's events (wide UTC window, filter by NZ date in JS)
  useEffect(() => {
    const { start, end } = getTodayNZRange()
    supabase
      .from('events')
      .select('*')
      .gte('start_time', start)
      .lte('start_time', end)
      .order('start_time')
      .then(({ data }) => setTodayEvents((data as CalendarEvent[]) ?? []))
  }, [])

  // Real-time subscription for today's events
  useEffect(() => {
    const ch = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        // Re-fetch on any change
        const { start, end } = getTodayNZRange()
        supabase
          .from('events')
          .select('*')
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time')
          .then(({ data }) => setTodayEvents((data as CalendarEvent[]) ?? []))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const todayTasks = tasks.filter(isTaskDueToday)
  const isCompleted = (taskId: string) => completions.some(c => c.task_id === taskId)
  const doneCount = todayTasks.filter(t => isCompleted(t.id)).length
  const remainingCount = todayTasks.length - doneCount

  const sidebarExtra = [
    { id: 'school', icon: '🏫', label: 'School' },
    { id: 'clean',  icon: '🧹', label: 'Clean'  },
    { id: 'goals',  icon: '🎯', label: 'Goals'  },
  ]

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #0D0F14; --panel: #13151C; --card: #181B24; --card2: #1E2130;
          --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
          --text: #F0F2F8; --muted: rgba(240,242,248,0.4);
          --accent: #6C8EFF; --accent2: #A78BFA;
          --green: #34D399; --amber: #FBBF24; --red: #F87171; --pink: #F472B6; --cyan: #22D3EE;
          --bottom-bar: 64px;
        }

        html, body {
          height: 100%;
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          overflow: hidden;
        }

        /* ── APP SHELL ── */
        .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        /* ── DESKTOP SIDEBAR ── */
        .sidebar {
          width: 68px; background: var(--panel); border-right: 1px solid var(--border);
          display: flex; flex-direction: column; align-items: center;
          padding: 18px 0; gap: 4px; flex-shrink: 0;
        }
        .sidebar-logo {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #6C8EFF, #A78BFA);
          border-radius: 11px; display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; color: white;
          margin-bottom: 18px; flex-shrink: 0;
        }
        .nav-item {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; gap: 3px; border: 1px solid transparent;
        }
        .nav-icon { font-size: 17px; line-height: 1; }
        .nav-label { font-size: 7.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--muted); transition: color 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.04); }
        .nav-item.active { background: rgba(108,142,255,0.12); border-color: rgba(108,142,255,0.25); }
        .nav-item.active .nav-label { color: var(--accent); }
        .nav-divider { width: 30px; height: 1px; background: var(--border); margin: 8px 0; }
        .sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .av {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; cursor: pointer;
          border: 1.5px solid transparent; transition: all 0.2s;
          font-family: 'Syne', sans-serif;
        }
        .av:hover { border-color: var(--accent); transform: scale(1.08); }

        /* ── MAIN COLUMN ── */
        .main {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; min-width: 0;
        }

        .main-inner {
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
        }

        @media (min-width: 769px) {
          .main-inner {
            max-width: 430px; width: 100%; margin: 0 auto;
          }
        }

        /* ── HEADER ── */
        .dash-header { padding: 16px 22px 10px; flex-shrink: 0; }
        @media (min-width: 769px) { .dash-header { padding-top: 24px; } }

        .dash-header-top {
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .dash-greeting {
          font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800;
          color: var(--text); line-height: 1;
        }
        .dash-date { font-size: 12px; color: var(--muted); margin-top: 3px; }
        .dash-header-right { display: flex; gap: 8px; align-items: center; }
        .user-chip {
          display: flex; align-items: center; gap: 6px;
          background: var(--card); border: 1px solid var(--border);
          border-radius: 20px; padding: 3px 10px 3px 4px;
          cursor: pointer; transition: all 0.2s;
        }
        .user-chip:hover { border-color: var(--border2); background: var(--card2); }
        .user-chip-av {
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; color: white;
          font-family: 'Syne', sans-serif; flex-shrink: 0;
        }
        .user-chip-name {
          font-size: 12px; font-weight: 600; color: var(--muted);
          font-family: 'Inter', sans-serif;
        }


        /* ── FAMILY BAR ── */
        .family-bar {
          display: flex; gap: 8px; padding: 0 22px 12px; flex-shrink: 0;
          overflow-x: auto; scrollbar-width: none;
        }
        .family-bar::-webkit-scrollbar { display: none; }
        .fam-chip {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          border-radius: 20px; background: var(--card); border: 1px solid var(--border);
          font-size: 12px; font-weight: 600; color: var(--muted);
          cursor: pointer; transition: all 0.2s; flex-shrink: 0; white-space: nowrap;
        }
        .fam-chip.active {
          background: rgba(108,142,255,0.12);
          border-color: rgba(108,142,255,0.3);
          color: var(--text);
        }
        .fam-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* ── QUICK STATS ── */
        .quick-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 8px; padding: 0 22px 12px; flex-shrink: 0;
        }
        .quick-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 16px; padding: 12px 10px;
          display: flex; flex-direction: column; gap: 4px;
          cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
          text-decoration: none; color: inherit;
        }
        .quick-card:hover { border-color: var(--border2); }
        .qc-icon { font-size: 18px; margin-bottom: 2px; }
        .qc-label { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .qc-value { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.2; }
        .qc-sub { font-size: 9px; color: var(--muted); }
        .qc-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; border-radius: 0 0 16px 16px; }

        /* ── SCROLL AREA ── */
        .dash-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 0 22px;
          padding-bottom: calc(var(--bottom-bar) + 16px + env(safe-area-inset-bottom));
          display: flex; flex-direction: column; gap: 12px;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .dash-scroll::-webkit-scrollbar { display: none; }
        @media (min-width: 769px) { .dash-scroll { padding-bottom: 24px; } }

        /* ── WEATHER HERO ── */
        .weather-hero {
          border-radius: 22px; padding: 22px; position: relative; overflow: hidden;
          background: linear-gradient(135deg, #1a2340 0%, #0f1628 50%, #151828 100%);
          border: 1px solid rgba(108,142,255,0.2);
          min-height: 160px; display: flex; flex-direction: column; justify-content: space-between;
          flex-shrink: 0;
        }
        .weather-hero::before {
          content: ''; position: absolute; top: -30px; right: -30px;
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(108,142,255,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .weather-hero::after {
          content: ''; position: absolute; bottom: -20px; left: 20px;
          width: 100px; height: 100px;
          background: radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .weather-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .weather-temp {
          font-family: 'Syne', sans-serif; font-size: 52px; font-weight: 800;
          color: white; line-height: 1; letter-spacing: -2px;
        }
        .weather-desc { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px; }
        .weather-loc { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .weather-stats { display: flex; gap: 16px; margin-top: 12px; }
        .wstat-val { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: white; }
        .wstat-lbl { font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
        .weather-icon-big { font-size: 64px; line-height: 1; flex-shrink: 0; }
        .weather-bottom { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
        .weather-tag { font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 20px; }

        /* ── SECTION CARD ── */
        .section-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 20px; padding: 16px; flex-shrink: 0;
        }
        .section-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
          color: var(--muted); font-weight: 700; margin-bottom: 12px;
        }

        /* ── UNIFORM ── */
        .uniform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .uniform-item {
          background: var(--card2); border-radius: 14px; padding: 14px 12px;
          display: flex; flex-direction: column; gap: 6px;
          border: 1px solid transparent; transition: all 0.2s;
        }
        .uniform-item.highlight {
          border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.05);
        }
        .uniform-child { display: flex; align-items: center; gap: 7px; }
        .uniform-avatar {
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; font-family: 'Syne', sans-serif; flex-shrink: 0;
        }
        .uniform-name { font-size: 12px; font-weight: 600; color: var(--text); }
        .uniform-type { font-size: 18px; margin: 2px 0; }
        .uniform-detail { font-size: 10px; color: var(--muted); line-height: 1.3; }
        .uniform-badge {
          font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
          align-self: flex-start; text-transform: uppercase; letter-spacing: 0.3px;
        }

        /* ── EVENTS ── */
        .event-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid var(--border);
        }
        .event-item:first-child { padding-top: 0; }
        .event-item:last-child { border-bottom: none; padding-bottom: 0; }
        .event-item.current {
          background: rgba(108,142,255,0.05); border-radius: 12px;
          padding: 10px 8px; margin: 0 -4px; border-bottom: none;
        }
        .event-time-col { width: 40px; flex-shrink: 0; text-align: center; }
        .event-time { font-size: 11px; font-weight: 600; color: var(--accent); font-variant-numeric: tabular-nums; }
        .event-ampm { font-size: 9px; color: var(--muted); }
        .event-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .event-dot.glow { box-shadow: 0 0 0 3px rgba(108,142,255,0.2); }
        .event-info { flex: 1; }
        .event-name { font-size: 13px; font-weight: 600; color: var(--text); }
        .event-name.done { text-decoration: line-through; color: rgba(240,242,248,0.3); }
        .event-detail { font-size: 11px; color: var(--muted); margin-top: 2px; }
        .event-who { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 20px; flex-shrink: 0; }

        /* ── QUOTE ── */
        .quote-card {
          background: linear-gradient(135deg, rgba(108,142,255,0.08), rgba(167,139,250,0.08));
          border: 1px solid rgba(108,142,255,0.15);
          border-radius: 20px; padding: 18px; text-align: center;
          position: relative; overflow: hidden; flex-shrink: 0;
        }
        .quote-card::before {
          content: '"'; position: absolute; top: -10px; left: 10px;
          font-family: 'Syne', sans-serif; font-size: 80px; font-weight: 800;
          color: rgba(108,142,255,0.1); line-height: 1;
        }
        .quote-emoji { font-size: 22px; margin-bottom: 8px; }
        .quote-text {
          font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
          color: var(--text); line-height: 1.4; position: relative; z-index: 1;
        }
        .quote-author { font-size: 11px; color: var(--muted); margin-top: 8px; }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          html, body { overflow: hidden; }
          .sidebar { display: none; }
          .app { flex-direction: column; }
          .dash-greeting { font-size: 22px; }
        }
      `}</style>

      <div className="app">

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">FH</div>
          {navItems.map(item => (
            item.href ? (
              <a key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
                <div className={`nav-item ${activeNav === item.id ? 'active' : ''}`}>
                  <div className="nav-icon">{item.icon}</div>
                  <div className="nav-label">{item.label}</div>
                </div>
              </a>
            ) : (
              <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`}>
                <div className="nav-icon">{item.icon}</div>
                <div className="nav-label">{item.label}</div>
              </div>
            )
          ))}
          <div className="nav-divider" />
          {sidebarExtra.map(item => (
            <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`}>
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-label">{item.label}</div>
            </div>
          ))}
          <div className="sidebar-bottom">
            <div className="nav-divider" />
            <div className="av" style={{background:'linear-gradient(135deg,#6C8EFF,#A78BFA)'}}>M</div>
            <div className="av" style={{background:'linear-gradient(135deg,#34D399,#22D3EE)'}}>D</div>
            <div className="av" style={{background:'linear-gradient(135deg,#FBBF24,#F97316)'}}>I</div>
            <div className="av" style={{background:'linear-gradient(135deg,#F472B6,#A78BFA)'}}>J</div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main">
          <div className="main-inner">

            {/* HEADER */}
            <div className="dash-header">
              <div className="dash-header-top">
                <div>
                  <div className="dash-greeting" suppressHydrationWarning>
                    {currentUser ? `Hi ${currentUser.name} 👋` : `${getGreeting()} 👋`}
                  </div>
                  <div className="dash-date" suppressHydrationWarning>
                    {new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div className="dash-header-right">
                  {currentUser && (
                    <div className="user-chip" onClick={handleSwitchUser} title="Switch user">
                      <div
                        className="user-chip-av"
                        style={{ background: FAMILY.find(f => f.label === currentUser.name)?.color ?? '#6C8EFF' }}
                      >
                        {currentUser.name[0]}
                      </div>
                      <span className="user-chip-name">{currentUser.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FAMILY SELECTOR */}
            <div className="family-bar">
              {FAMILY.map(f => (
                <div
                  key={f.id}
                  className={`fam-chip ${activeMember === f.id ? 'active' : ''}`}
                  onClick={() => setActiveMember(f.id)}
                >
                  <div className="fam-dot" style={{background: f.color}} />
                  {f.label}
                </div>
              ))}
            </div>

            {/* QUICK STATS */}
            <div className="quick-row">
              <a href="/tasks" className="quick-card">
                <div className="qc-icon">✅</div>
                <div className="qc-label">Tasks</div>
                <div className="qc-value">{todayTasks.length === 0 ? '—' : remainingCount === 0 ? 'All done!' : `${remainingCount} left`}</div>
                <div className="qc-sub">{doneCount} of {todayTasks.length} done</div>
                <div className="qc-bar" style={{background:'var(--green)'}} />
              </a>
              <div className="quick-card">
                <div className="qc-icon">🌮</div>
                <div className="qc-label">Dinner</div>
                <div className="qc-value">Tacos</div>
                <div className="qc-sub">30 mins</div>
                <div className="qc-bar" style={{background:'var(--pink)'}} />
              </div>
              <div className="quick-card">
                <div className="qc-icon">💬</div>
                <div className="qc-label">Quote</div>
                <div className="qc-value">Daily</div>
                <div className="qc-sub">Tap to read</div>
                <div className="qc-bar" style={{background:'var(--accent2)'}} />
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="dash-scroll">

              {/* WEATHER HERO */}
              <div className="weather-hero">
                <div className="weather-top">
                  <div>
                    <div className="weather-temp">18°</div>
                    <div className="weather-desc">Partly Cloudy</div>
                    <div className="weather-loc">📍 Wellington, NZ</div>
                    <div className="weather-stats">
                      <div>
                        <div className="wstat-val">22°</div>
                        <div className="wstat-lbl">High</div>
                      </div>
                      <div>
                        <div className="wstat-val">14°</div>
                        <div className="wstat-lbl">Low</div>
                      </div>
                      <div>
                        <div className="wstat-val">18km/h</div>
                        <div className="wstat-lbl">Wind</div>
                      </div>
                    </div>
                  </div>
                  <div className="weather-icon-big">⛅</div>
                </div>
                <div className="weather-bottom">
                  <div className="weather-tag" style={{background:'rgba(52,211,153,0.15)',color:'#34D399'}}>🌿 Good for outdoors</div>
                  <div className="weather-tag" style={{background:'rgba(34,211,238,0.1)',color:'#22D3EE'}}>⚽ Football conditions</div>
                </div>
              </div>

              {/* WHAT TO WEAR */}
              <div className="section-card">
                <div className="section-label">👕 What to wear today</div>
                <div className="uniform-grid">
                  <div className="uniform-item highlight">
                    <div className="uniform-child">
                      <div className="uniform-avatar" style={{background:'linear-gradient(135deg,#FBBF24,#F97316)'}}>I</div>
                      <div className="uniform-name">Isabel</div>
                    </div>
                    <div className="uniform-type">👟</div>
                    <div className="uniform-detail">PE gear + sports shoes. Water bottle!</div>
                    <div className="uniform-badge" style={{background:'rgba(251,191,36,0.15)',color:'#FBBF24'}}>PE Day</div>
                  </div>
                  <div className="uniform-item">
                    <div className="uniform-child">
                      <div className="uniform-avatar" style={{background:'linear-gradient(135deg,#F472B6,#A78BFA)'}}>J</div>
                      <div className="uniform-name">James</div>
                    </div>
                    <div className="uniform-type">👕</div>
                    <div className="uniform-detail">Regular uniform. Reading folder in bag.</div>
                    <div className="uniform-badge" style={{background:'rgba(255,255,255,0.06)',color:'rgba(240,242,248,0.5)'}}>Normal</div>
                  </div>
                </div>
              </div>

              {/* TODAY'S EVENTS — live from Supabase */}
              <div className="section-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="section-label" style={{ marginBottom: 0 }}>📅 Today&apos;s events</div>
                  <Link href="/calendar" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, opacity: 0.8 }}>
                    View Calendar →
                  </Link>
                </div>

                {todayEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 14 }}>
                    Nothing on today 🎉
                  </div>
                ) : (
                  todayEvents.map(ev => {
                    const color = eventColor(ev)
                    const now = new Date()
                    const evStart = new Date(ev.start_time)
                    const evEnd   = new Date(ev.end_time)
                    const isCurrent = evStart <= now && evEnd >= now
                    const isPast    = evEnd < now
                    const { time, ampm } = fmtEventTime(ev.start_time)
                    const who = getMemberLabel(ev.members)
                    return (
                      <div
                        key={ev.id}
                        className={`event-item${isCurrent ? ' current' : ''}`}
                        style={{ opacity: isPast ? 0.45 : 1, cursor: 'pointer' }}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <div className="event-time-col">
                          <div className="event-time" style={{ color: isCurrent ? color : isPast ? 'var(--muted)' : 'var(--accent)' }}>
                            {time}
                          </div>
                          <div className="event-ampm">{ampm}</div>
                        </div>
                        <div
                          className={`event-dot${isCurrent ? ' glow' : ''}`}
                          style={{ background: isPast ? '#444' : color }}
                        />
                        <div className="event-info">
                          <div className={`event-name${isPast ? ' done' : ''}`}>{ev.title}</div>
                          {ev.location && (
                            <div className="event-detail">{ev.location}</div>
                          )}
                        </div>
                        {who && (
                          <div
                            className="event-who"
                            style={{
                              background: isPast ? 'rgba(255,255,255,0.05)' : color + '20',
                              color: isPast ? 'rgba(240,242,248,0.3)' : color,
                            }}
                          >
                            {who}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* DAILY QUOTE */}
              <div className="quote-card">
                <div className="quote-emoji">💫</div>
                <div className="quote-text">&ldquo;Teamwork makes the dream work&rdquo;</div>
                <div className="quote-author" suppressHydrationWarning>
                  Daily family quote · {new Date().toLocaleDateString('en-NZ', {weekday: 'long'})}
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={saved => {
            setTodayEvents(prev => prev.map(e => e.id === saved.id ? saved : e))
            setSelectedEvent(null)
          }}
          onDelete={id => {
            setTodayEvents(prev => prev.filter(e => e.id !== id))
            setSelectedEvent(null)
          }}
        />
      )}
    </>
  )
}
