'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TODAY = new Date().toISOString().split('T')[0]

type Member = 'M' | 'D' | 'I' | 'J'

const MEMBER_STYLES: Record<Member, { color: string; bg: string; label: string; gradient: string }> = {
  M: { color: '#6C8EFF', bg: 'rgba(108,142,255,0.12)', label: 'Mum',    gradient: 'linear-gradient(135deg,#6C8EFF,#A78BFA)' },
  D: { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  label: 'Dad',    gradient: 'linear-gradient(135deg,#34D399,#22D3EE)' },
  I: { color: '#F472B6', bg: 'rgba(244,114,182,0.12)', label: 'Isabel', gradient: 'linear-gradient(135deg,#FBBF24,#F97316)' },
  J: { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'James',  gradient: 'linear-gradient(135deg,#F472B6,#A78BFA)' },
}

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

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [activeNav, setActiveNav] = useState('home')

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

  const todayTasks = tasks.filter(isTaskDueToday)
  const isCompleted = (taskId: string) => completions.some(c => c.task_id === taskId)
  const doneCount = todayTasks.filter(t => isCompleted(t.id)).length

  const toggleTask = async (task: Task) => {
    const existing = completions.find(c => c.task_id === task.id)
    if (existing) {
      await supabase.from('task_completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const member = task.assigned_to[0] ?? 'M'
      const { data } = await supabase
        .from('task_completions')
        .insert({ task_id: task.id, completed_by: member, completed_for_date: TODAY })
        .select().single()
      if (data) setCompletions(prev => [...prev, data as Completion])
    }
  }

  const navItems = [
    { id: 'home',     icon: '⊞', label: 'Home',     href: '/'       },
    { id: 'schedule', icon: '🗓', label: 'Schedule', href: null      },
    { id: 'tasks',    icon: '✅', label: 'Tasks',    href: '/tasks'  },
    { id: 'meals',    icon: '🍽', label: 'Meals',    href: null      },
    { id: 'money',    icon: '💰', label: 'Money',    href: null      },
  ]

  const sidebarExtra = [
    { id: 'school', icon: '🏫', label: 'School' },
    { id: 'clean',  icon: '🧹', label: 'Clean'  },
    { id: 'goals',  icon: '🎯', label: 'Goals'  },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #0D0F14; --panel: #13151C; --card: #181B24; --card2: #1E2130;
          --border: rgba(255,255,255,0.06); --border2: rgba(255,255,255,0.1);
          --text: #F0F2F8; --muted: rgba(240,242,248,0.35); --muted2: rgba(240,242,248,0.6);
          --accent: #6C8EFF; --green: #34D399; --amber: #FBBF24; --red: #F87171; --pink: #F472B6;
          --bottom-bar: 64px;
        }

        html, body {
          height: 100%;
          font-family: 'Inter', sans-serif;
          background: var(--bg);
          color: var(--text);
          overflow: hidden;
        }

        /* ── LAYOUT ── */
        .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        /* Desktop sidebar */
        .sidebar {
          width: 68px;
          background: var(--panel);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 0;
          gap: 4px;
          flex-shrink: 0;
        }
        .sidebar-logo {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #6C8EFF, #A78BFA);
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
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

        /* Main content */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 24px 28px;
          gap: 20px;
        }

        /* ── TOPBAR ── */
        .topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
        .greeting { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; line-height: 1; letter-spacing: -0.5px; }
        .date-text { font-size: 12px; color: var(--muted); margin-top: 5px; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .live-pill {
          display: flex; align-items: center; gap: 5px;
          background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.18);
          color: #34D399; padding: 5px 11px; border-radius: 20px;
          font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .live-dot { width: 5px; height: 5px; background: #34D399; border-radius: 50%; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .notif-btn {
          width: 34px; height: 34px; background: var(--card); border: 1px solid var(--border);
          border-radius: 10px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: 14px; position: relative;
        }
        .notif-badge { position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; background: #F87171; border-radius: 50%; border: 1.5px solid var(--panel); }

        /* ── DESKTOP GRID ── */
        .grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1.2fr 1fr 0.8fr;
          grid-template-rows: 1fr 1fr;
          gap: 14px;
          overflow: hidden;
          min-height: 0;
        }

        /* ── PANELS ── */
        .panel {
          background: var(--card); border: 1px solid var(--border); border-radius: 18px;
          padding: 20px; display: flex; flex-direction: column; overflow: hidden;
          transition: border-color 0.2s; animation: fadeUp 0.35s ease both;
        }
        .panel:hover { border-color: var(--border2); }
        .panel.tall { grid-row: span 2; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }

        .ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-shrink: 0; }
        .ph-left { display: flex; align-items: center; gap: 10px; }
        .ph-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .ph-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; }
        .ph-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }
        .ph-action {
          font-size: 10px; color: var(--muted); cursor: pointer; padding: 3px 9px;
          border-radius: 7px; background: var(--card2); border: 1px solid var(--border);
          transition: all 0.2s; font-weight: 500; text-decoration: none; display: inline-block;
        }
        .ph-action:hover { color: var(--accent); border-color: rgba(108,142,255,0.3); }
        .pb { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 8px; }

        /* ── CARDS ── */
        .today-card {
          display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px;
          border-radius: 13px; background: var(--card2); border: 1px solid transparent;
          transition: all 0.2s; cursor: pointer; flex-shrink: 0;
        }
        .today-card:hover { background: rgba(255,255,255,0.04); }
        .card-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; font-family: 'Syne', sans-serif; }
        .card-emoji { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .card-body { flex: 1; min-width: 0; }
        .card-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.2; }
        .card-detail { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.4; }
        .card-tag { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; align-self: flex-start; text-transform: uppercase; letter-spacing: 0.3px; }
        .card-time { font-size: 10px; color: var(--muted); font-weight: 500; flex-shrink: 0; align-self: flex-start; margin-top: 2px; }

        /* ── WEATHER ── */
        .weather-strip { background: var(--card2); border-radius: 13px; padding: 11px 14px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; border: 1px solid var(--border); }
        .w-temp { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; line-height: 1; }
        .w-desc { font-size: 10px; color: var(--muted); margin-top: 2px; }
        .w-tag { font-size: 9px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
        .dp-labels { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .dp-label { font-size: 9px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .dp-pct { font-size: 9px; color: var(--accent); font-weight: 600; }
        .dp-track { height: 4px; background: var(--card2); border-radius: 10px; overflow: hidden; }
        .dp-fill { height: 100%; width: 37%; background: linear-gradient(90deg, #6C8EFF, #A78BFA); border-radius: 10px; }

        /* ── TASKS ── */
        .task-row {
          display: flex; align-items: center; gap: 9px; padding: 9px 11px;
          border-radius: 10px; background: var(--card2); transition: background 0.2s;
          cursor: pointer; flex-shrink: 0;
        }
        .task-row:hover { background: rgba(255,255,255,0.05); }
        .task-cb { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 9px; transition: all 0.18s; }
        .task-cb.done { background: #34D399; border-color: #34D399; color: #0D0F14; font-weight: 700; }
        .task-text { flex: 1; font-size: 11px; font-weight: 500; }
        .task-text.done { text-decoration: line-through; color: var(--muted); }
        .task-tag { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
        .task-progress { height: 3px; background: var(--card2); border-radius: 10px; overflow: hidden; margin-bottom: 4px; flex-shrink: 0; }
        .task-progress-fill { height: 100%; background: linear-gradient(90deg, #6C8EFF, #34D399); border-radius: 10px; transition: width 0.4s ease; }

        /* ── GOALS ── */
        .metric-ring { position: relative; width: 76px; height: 76px; flex-shrink: 0; }
        .metric-ring svg { transform: rotate(-90deg); }
        .ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .rval { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; line-height: 1; color: #A78BFA; }
        .rlbl { font-size: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.3px; margin-top: 1px; }
        .metric-row { flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
        .mg-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .mg-name { font-size: 11px; font-weight: 500; }
        .mg-pct { font-size: 10px; color: var(--muted); }
        .mg-track { height: 4px; background: var(--card2); border-radius: 10px; overflow: hidden; }
        .mg-fill { height: 100%; border-radius: 10px; }

        /* ── MEAL ── */
        .meal-hero { flex: 1; background: var(--card2); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px solid rgba(244,114,182,0.15); cursor: pointer; transition: border-color 0.2s; }
        .meal-hero:hover { border-color: rgba(244,114,182,0.3); }
        .meal-emoji { font-size: 38px; margin-bottom: 8px; line-height: 1; }
        .meal-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
        .meal-detail { font-size: 11px; color: var(--muted); margin-top: 3px; }
        .meal-tags { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; justify-content: center; }
        .meal-tag { font-size: 10px; padding: 3px 10px; border-radius: 20px; font-weight: 500; }

        /* ── MONEY ── */
        .budget-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; margin-bottom: 10px; }
        .bsplit { background: var(--card2); border-radius: 10px; padding: 10px 12px; }
        .bval { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; line-height: 1; }
        .blbl { font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; margin-top: 3px; }
        .spend-bar-wrap { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 9px; }
        .sbar-top { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .sbar-lbl { font-size: 11px; font-weight: 500; }
        .sbar-num { font-size: 10px; color: var(--muted); }
        .sbar-track { height: 4px; background: var(--card2); border-radius: 10px; overflow: hidden; }
        .sbar-fill { height: 100%; border-radius: 10px; }

        /* ── EMPTY STATE ── */
        .empty-tasks { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 8px; color: var(--muted); }
        .empty-tasks span { font-size: 28px; }
        .empty-tasks p { font-size: 11px; }

        /* ══════════════════════════════════════
           MOBILE STYLES
        ══════════════════════════════════════ */

        /* Mobile: hide sidebar, show bottom bar */
        .bottom-bar { display: none; }

        @media (max-width: 768px) {
          html, body { overflow: hidden; }

          .sidebar { display: none; }

          .bottom-bar {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: var(--bottom-bar);
            background: var(--panel);
            border-top: 1px solid var(--border);
            z-index: 100;
            align-items: center;
            justify-content: space-around;
            padding: 0 8px;
            padding-bottom: env(safe-area-inset-bottom);
          }

          .bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 6px 12px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
          }
          .bottom-nav-item.active { background: rgba(108,142,255,0.12); }
          .bottom-nav-icon { font-size: 20px; line-height: 1; }
          .bottom-nav-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--muted); }
          .bottom-nav-item.active .bottom-nav-label { color: var(--accent); }

          .app { flex-direction: column; }

          .main {
            padding: 16px 16px 0 16px;
            gap: 14px;
            overflow-y: auto;
            overflow-x: hidden;
            /* room for bottom bar */
            padding-bottom: calc(var(--bottom-bar) + 16px);
            height: 100vh;
          }

          /* Mobile topbar */
          .greeting { font-size: 20px; }
          .date-text { font-size: 11px; }
          .live-pill { padding: 4px 8px; font-size: 9px; }

          /* Mobile: single column stacked cards */
          .grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow: visible;
            flex: none;
          }

          .panel { border-radius: 16px; padding: 16px; }
          .panel.tall { grid-row: unset; }

          /* What's On — limit height on mobile, scrollable internally */
          .panel.tall .pb {
            max-height: 320px;
            overflow-y: auto;
          }

          /* Member avatars row on mobile */
          .mobile-members {
            display: flex;
            gap: 8px;
            margin-bottom: 14px;
            flex-shrink: 0;
          }
          .member-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 99px;
            border: 1px solid var(--border);
            background: var(--card2);
            font-size: 12px;
            font-weight: 600;
          }
          .member-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
          }

          /* Bigger tap targets on mobile */
          .task-row { padding: 12px 14px; }
          .task-cb { width: 22px; height: 22px; border-radius: 6px; font-size: 11px; }
          .task-text { font-size: 13px; }
          .task-tag { font-size: 10px; padding: 3px 9px; }

          .today-card { padding: 12px; }
          .card-name { font-size: 13px; }

          /* Goals — horizontal scroll on mobile */
          .goals-scroll {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .goal-chip {
            flex-shrink: 0;
            background: var(--card2);
            border-radius: 12px;
            padding: 12px 14px;
            min-width: 110px;
            text-align: center;
          }
          .goal-chip-pct {
            font-family: 'Syne', sans-serif;
            font-size: 22px;
            font-weight: 800;
            line-height: 1;
          }
          .goal-chip-name {
            font-size: 11px;
            color: var(--muted);
            margin-top: 4px;
          }
          .goal-chip-bar {
            height: 3px;
            background: var(--border);
            border-radius: 99px;
            overflow: hidden;
            margin-top: 8px;
          }

          /* Money — horizontal budget chips */
          .budget-split { grid-template-columns: 1fr 1fr; gap: 10px; }
          .bval { font-size: 22px; }

          /* Meal */
          .meal-emoji { font-size: 44px; }
          .meal-name { font-size: 20px; }
        }

        @media (min-width: 769px) {
          .mobile-members { display: none; }
          .goals-scroll { display: none; }
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
              <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => setActiveNav(item.id)}>
                <div className="nav-icon">{item.icon}</div>
                <div className="nav-label">{item.label}</div>
              </div>
            )
          ))}
          <div className="nav-divider" />
          {sidebarExtra.map(item => (
            <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => setActiveNav(item.id)}>
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

          {/* TOPBAR */}
          <div className="topbar">
            <div>
              <div className="greeting">{getGreeting()} 👋</div>
              <div className="date-text">{new Date().toLocaleDateString('en-NZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
            </div>
            <div className="topbar-right">
              <div className="live-pill"><div className="live-dot" /> Live</div>
              <div className="notif-btn">🔔<div className="notif-badge" /></div>
            </div>
          </div>

          {/* MOBILE: member pills */}
          <div className="mobile-members">
            {(Object.entries(MEMBER_STYLES) as [Member, typeof MEMBER_STYLES[Member]][]).map(([id, m]) => (
              <div key={id} className="member-pill">
                <div className="member-dot" style={{background: m.color}} />
                {m.label}
              </div>
            ))}
          </div>

          {/* GRID */}
          <div className="grid">

            {/* WHAT'S ON TODAY */}
            <div className="panel tall">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(108,142,255,0.15)'}}>✨</div>
                  <div>
                    <div className="ph-title">What&apos;s On Today</div>
                    <div className="ph-sub">{new Date().toLocaleDateString('en-NZ', { weekday:'short', day:'numeric', month:'short' })} · 6 things</div>
                  </div>
                </div>
                <div className="ph-action">Calendar</div>
              </div>
              <div className="pb">
                <div style={{flexShrink:0}}>
                  <div className="dp-labels">
                    <div className="dp-label">Day progress</div>
                    <div className="dp-pct">37%</div>
                  </div>
                  <div className="dp-track"><div className="dp-fill" /></div>
                </div>
                <div className="weather-strip">
                  <div style={{fontSize:22}}>⛅</div>
                  <div style={{flex:1}}>
                    <div className="w-temp">18°C</div>
                    <div className="w-desc">Partly cloudy · Wellington</div>
                  </div>
                  <div className="w-tag" style={{background:'rgba(52,211,153,0.1)',color:'#34D399'}}>Good outside</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(251,191,36,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#FBBF24,#F97316)'}}>I</div>
                  <div className="card-body">
                    <div className="card-name">Isabel — PE Gear 👟</div>
                    <div className="card-detail">Sports shoes & water bottle. Period 2.</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(251,191,36,0.12)',color:'#FBBF24'}}>School</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(244,114,182,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#F472B6,#A78BFA)'}}>J</div>
                  <div className="card-body">
                    <div className="card-name">James — Uniform 👕</div>
                    <div className="card-detail">Regular day. Reading folder in bag.</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(244,114,182,0.12)',color:'#F472B6'}}>School</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(52,211,153,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#34D399,#22D3EE)'}}>D</div>
                  <div className="card-body">
                    <div className="card-name">Dad — Drop-off & pick-up 🚗</div>
                    <div className="card-detail">7:30am drop · 3:10pm pick-up · Both kids</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(52,211,153,0.12)',color:'#34D399'}}>Transport</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(108,142,255,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#6C8EFF,#A78BFA)'}}>M</div>
                  <div className="card-body">
                    <div className="card-name">Mum — Vet appointment 🐶</div>
                    <div className="card-detail">Buddy&apos;s check-up · Newlands Vet</div>
                  </div>
                  <div className="card-time">10:30</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(248,113,113,0.2)'}}>
                  <div className="card-emoji" style={{background:'rgba(248,113,113,0.1)'}}>📋</div>
                  <div className="card-body">
                    <div className="card-name">Permission slip due Monday</div>
                    <div className="card-detail">Isabel&apos;s Zoo excursion — sign by Mon 3 Mar</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(248,113,113,0.12)',color:'#F87171'}}>Urgent</div>
                </div>
              </div>
            </div>

            {/* TODAY'S TASKS */}
            <div className="panel">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(52,211,153,0.15)'}}>✅</div>
                  <div>
                    <div className="ph-title">Today&apos;s Tasks</div>
                    <div className="ph-sub">{doneCount} of {todayTasks.length} done</div>
                  </div>
                </div>
                <a href="/tasks" className="ph-action">View all</a>
              </div>
              {todayTasks.length > 0 && (
                <div className="task-progress">
                  <div className="task-progress-fill" style={{width:`${todayTasks.length ? (doneCount/todayTasks.length)*100 : 0}%`}} />
                </div>
              )}
              <div className="pb">
                {todayTasks.length === 0 ? (
                  <div className="empty-tasks">
                    <span>✨</span>
                    <p>Nothing due today!</p>
                    <a href="/tasks" style={{fontSize:11, color:'var(--accent)', textDecoration:'none'}}>+ Add tasks</a>
                  </div>
                ) : (
                  todayTasks.slice(0, 6).map(task => {
                    const done = isCompleted(task.id)
                    const primaryMember = task.assigned_to[0] as Member | undefined
                    const style = primaryMember ? MEMBER_STYLES[primaryMember] : { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: '–', gradient: '' }
                    return (
                      <div key={task.id} className="task-row" onClick={() => toggleTask(task)}>
                        <div className={`task-cb ${done ? 'done' : ''}`}>{done ? '✓' : ''}</div>
                        <span style={{fontSize:14, flexShrink:0}}>{task.icon}</span>
                        <div className={`task-text ${done ? 'done' : ''}`}>{task.title}</div>
                        {primaryMember && (
                          <div className="task-tag" style={{background:style.bg, color:style.color}}>{style.label}</div>
                        )}
                      </div>
                    )
                  })
                )}
                {todayTasks.length > 6 && (
                  <a href="/tasks" style={{fontSize:11, color:'var(--muted)', textDecoration:'none', textAlign:'center', paddingTop:4}}>
                    +{todayTasks.length - 6} more · View all
                  </a>
                )}
              </div>
            </div>

            {/* GOALS — desktop: ring chart, mobile: horizontal scroll chips */}
            <div className="panel">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(167,139,250,0.15)'}}>🎯</div>
                  <div>
                    <div className="ph-title">Goals</div>
                    <div className="ph-sub">4 active</div>
                  </div>
                </div>
                <div className="ph-action">View all</div>
              </div>
              {/* Desktop goals */}
              <div className="pb" style={{justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
                  <div className="metric-ring">
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle fill="none" stroke="var(--card2)" strokeWidth="6" cx="38" cy="38" r="30"/>
                      <circle fill="none" stroke="url(#goalGrad)" strokeWidth="6" strokeLinecap="round" cx="38" cy="38" r="30" strokeDasharray="188.5" strokeDashoffset="52"/>
                      <defs>
                        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6C8EFF"/><stop offset="100%" stopColor="#A78BFA"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="ring-label"><div className="rval">72%</div><div className="rlbl">Overall</div></div>
                  </div>
                  <div className="metric-row">
                    {[
                      {name:'🏖️ Holiday', pct:72, bg:'linear-gradient(90deg,#6C8EFF,#A78BFA)'},
                      {name:'📚 Reading', pct:60, bg:'linear-gradient(90deg,#34D399,#22D3EE)'},
                      {name:'⚽ Football', pct:40, bg:'linear-gradient(90deg,#F472B6,#A78BFA)'},
                      {name:'🏋️ Garage',  pct:25, bg:'linear-gradient(90deg,#FBBF24,#F97316)'},
                    ].map(g => (
                      <div key={g.name}>
                        <div className="mg-top"><div className="mg-name">{g.name}</div><div className="mg-pct">{g.pct}%</div></div>
                        <div className="mg-track"><div className="mg-fill" style={{width:`${g.pct}%`,background:g.bg}} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Mobile goals — horizontal chips */}
              <div className="goals-scroll">
                {[
                  {name:'🏖️ Holiday', pct:72, color:'#6C8EFF'},
                  {name:'📚 Reading', pct:60, color:'#34D399'},
                  {name:'⚽ Football', pct:40, color:'#F472B6'},
                  {name:'🏋️ Garage',  pct:25, color:'#FBBF24'},
                ].map(g => (
                  <div key={g.name} className="goal-chip">
                    <div className="goal-chip-pct" style={{color:g.color}}>{g.pct}%</div>
                    <div className="goal-chip-name">{g.name}</div>
                    <div className="goal-chip-bar">
                      <div style={{height:'100%', width:`${g.pct}%`, background:g.color, borderRadius:99}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TONIGHT'S MEAL */}
            <div className="panel">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(244,114,182,0.15)'}}>🍽</div>
                  <div>
                    <div className="ph-title">Tonight&apos;s Meal</div>
                    <div className="ph-sub">{new Date().toLocaleDateString('en-NZ', {weekday:'long'})}</div>
                  </div>
                </div>
                <div className="ph-action">Week plan</div>
              </div>
              <div className="pb">
                <div className="meal-hero">
                  <div className="meal-emoji">🌮</div>
                  <div className="meal-name">Taco Tuesday</div>
                  <div className="meal-detail">Beef tacos · serves 4 · 30 mins</div>
                  <div className="meal-tags">
                    <div className="meal-tag" style={{background:'rgba(52,211,153,0.1)',color:'#34D399'}}>All planned</div>
                    <div className="meal-tag" style={{background:'rgba(251,191,36,0.1)',color:'#FBBF24'}}>3 items needed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* MONEY */}
            <div className="panel">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(52,211,153,0.15)'}}>💰</div>
                  <div>
                    <div className="ph-title">Money</div>
                    <div className="ph-sub">{new Date().toLocaleDateString('en-NZ',{month:'long'})}</div>
                  </div>
                </div>
                <div className="ph-action">View all</div>
              </div>
              <div className="pb">
                <div className="budget-split">
                  <div className="bsplit"><div className="bval" style={{color:'#34D399'}}>$840</div><div className="blbl">Remaining</div></div>
                  <div className="bsplit"><div className="bval" style={{color:'rgba(240,242,248,0.6)'}}>$4,200</div><div className="blbl">Budget</div></div>
                </div>
                <div className="spend-bar-wrap">
                  {[
                    {label:'🛒 Groceries', pct:85, color:'#34D399'},
                    {label:'🏡 Bills',      pct:100, color:'#F87171'},
                    {label:'🎉 Activities', pct:76, color:'#FBBF24'},
                    {label:'🏖️ Savings',   pct:100, color:'#6C8EFF'},
                  ].map(b => (
                    <div key={b.label}>
                      <div className="sbar-top"><div className="sbar-lbl">{b.label}</div><div className="sbar-num">{b.pct}%</div></div>
                      <div className="sbar-track"><div className="sbar-fill" style={{width:`${b.pct}%`,background:b.color}} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── MOBILE BOTTOM TAB BAR ── */}
        <nav className="bottom-bar">
          {navItems.map(item => (
            item.href ? (
              <a key={item.id} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
                <div className={`bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}>
                  <div className="bottom-nav-icon">{item.icon}</div>
                  <div className="bottom-nav-label">{item.label}</div>
                </div>
              </a>
            ) : (
              <div
                key={item.id}
                className={`bottom-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                <div className="bottom-nav-icon">{item.icon}</div>
                <div className="bottom-nav-label">{item.label}</div>
              </div>
            )
          ))}
        </nav>

      </div>
    </>
  )
}