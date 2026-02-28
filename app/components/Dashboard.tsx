'use client'

import { useState } from 'react'

export default function Dashboard() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Empty dishwasher', done: true, person: 'Ella', color: 'rgba(251,191,36,0.12)', textColor: '#FBBF24' },
    { id: 2, text: 'Feed the dog', done: true, person: 'Ella', color: 'rgba(251,191,36,0.12)', textColor: '#FBBF24' },
    { id: 3, text: 'Grocery run', done: false, person: 'Mum', color: 'rgba(108,142,255,0.12)', textColor: '#6C8EFF' },
    { id: 4, text: 'Set the table for dinner', done: false, person: 'Jack', color: 'rgba(244,114,182,0.12)', textColor: '#F472B6' },
    { id: 5, text: 'Vacuum lounge', done: false, person: 'Mum', color: 'rgba(108,142,255,0.12)', textColor: '#6C8EFF' },
    { id: 6, text: 'Take out bins', done: false, person: 'Dad', color: 'rgba(52,211,153,0.12)', textColor: '#34D399' },
    { id: 7, text: 'Sign Zoo permission slip', done: false, person: 'Urgent', color: 'rgba(248,113,113,0.12)', textColor: '#F87171' },
  ])

  const [activeNav, setActiveNav] = useState('home')

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const doneCount = tasks.filter(t => t.done).length

  const navItems = [
    { id: 'home', icon: '⊞', label: 'Home' },
    { id: 'schedule', icon: '🗓', label: 'Schedule' },
    { id: 'school', icon: '🏫', label: 'School' },
    { id: 'chores', icon: '✅', label: 'Chores' },
    { id: 'meals', icon: '🍽', label: 'Meals' },
  ]

  const navItems2 = [
    { id: 'clean', icon: '🧹', label: 'Clean' },
    { id: 'goals', icon: '🎯', label: 'Goals' },
    { id: 'money', icon: '💰', label: 'Money' },
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
          --accent: #6C8EFF; --accent2: #A78BFA; --green: #34D399;
          --amber: #FBBF24; --red: #F87171; --pink: #F472B6; --cyan: #22D3EE;
        }

        html, body { height: 100%; overflow: hidden; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); }

        .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

        .sidebar { width: 68px; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; padding: 18px 0; gap: 4px; flex-shrink: 0; }
        .sidebar-logo { width: 38px; height: 38px; background: linear-gradient(135deg, #6C8EFF, #A78BFA); border-radius: 11px; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; color: white; margin-bottom: 18px; flex-shrink: 0; }
        .nav-item { width: 46px; height: 46px; border-radius: 13px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; gap: 3px; border: 1px solid transparent; }
        .nav-icon { font-size: 17px; line-height: 1; }
        .nav-label { font-size: 7.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; color: var(--muted); transition: color 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.04); }
        .nav-item.active { background: rgba(108,142,255,0.12); border-color: rgba(108,142,255,0.25); }
        .nav-item.active .nav-label { color: var(--accent); }
        .nav-divider { width: 30px; height: 1px; background: var(--border); margin: 8px 0; }
        .sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .av { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; transition: all 0.2s; font-family: 'Syne', sans-serif; }
        .av:hover { border-color: var(--accent); transform: scale(1.08); }

        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 24px 28px; gap: 20px; }

        .topbar { display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0; }
        .greeting { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; line-height: 1; letter-spacing: -0.5px; }
        .date-text { font-size: 12px; color: var(--muted); margin-top: 5px; }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .live-pill { display: flex; align-items: center; gap: 5px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.18); color: #34D399; padding: 5px 11px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .live-dot { width: 5px; height: 5px; background: #34D399; border-radius: 50%; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .notif-btn { width: 34px; height: 34px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; position: relative; }
        .notif-badge { position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; background: #F87171; border-radius: 50%; border: 1.5px solid var(--panel); }

        .grid { flex: 1; display: grid; grid-template-columns: 1.2fr 1fr 0.8fr; grid-template-rows: 1fr 1fr; gap: 14px; overflow: hidden; min-height: 0; }

        .panel { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; overflow: hidden; transition: border-color 0.2s; animation: fadeUp 0.35s ease both; }
        .panel:hover { border-color: var(--border2); }
        .panel.tall { grid-row: span 2; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }

        .ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-shrink: 0; }
        .ph-left { display: flex; align-items: center; gap: 10px; }
        .ph-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .ph-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; }
        .ph-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }
        .ph-action { font-size: 10px; color: var(--muted); cursor: pointer; padding: 3px 9px; border-radius: 7px; background: var(--card2); border: 1px solid var(--border); transition: all 0.2s; font-weight: 500; }
        .ph-action:hover { color: var(--accent); border-color: rgba(108,142,255,0.3); }
        .pb { flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 8px; }

        .today-card { display: flex; align-items: flex-start; gap: 12px; padding: 13px 14px; border-radius: 13px; background: var(--card2); border: 1px solid transparent; transition: all 0.2s; cursor: pointer; flex-shrink: 0; }
        .today-card:hover { background: rgba(255,255,255,0.04); }
        .card-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; font-family: 'Syne', sans-serif; }
        .card-emoji { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .card-body { flex: 1; min-width: 0; }
        .card-name { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.2; }
        .card-detail { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.4; }
        .card-tag { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 20px; flex-shrink: 0; align-self: flex-start; text-transform: uppercase; letter-spacing: 0.3px; }
        .card-time { font-size: 10px; color: var(--muted); font-weight: 500; flex-shrink: 0; align-self: flex-start; margin-top: 2px; }

        .weather-strip { background: var(--card2); border-radius: 13px; padding: 11px 14px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; border: 1px solid var(--border); }
        .w-temp { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; line-height: 1; }
        .w-desc { font-size: 10px; color: var(--muted); margin-top: 2px; }
        .w-tag { font-size: 9px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }

        .dp-labels { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .dp-label { font-size: 9px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .dp-pct { font-size: 9px; color: var(--accent); font-weight: 600; }
        .dp-track { height: 4px; background: var(--card2); border-radius: 10px; overflow: hidden; }
        .dp-fill { height: 100%; width: 37%; background: linear-gradient(90deg, #6C8EFF, #A78BFA); border-radius: 10px; }

        .task-row { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 10px; background: var(--card2); transition: background 0.2s; cursor: pointer; flex-shrink: 0; }
        .task-row:hover { background: rgba(255,255,255,0.05); }
        .task-cb { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--border2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 9px; transition: all 0.18s; }
        .task-cb.done { background: #34D399; border-color: #34D399; color: #0D0F14; font-weight: 700; }
        .task-text { flex: 1; font-size: 11px; font-weight: 500; }
        .task-text.done { text-decoration: line-through; color: var(--muted); }
        .task-tag { font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }

        .meal-hero { flex: 1; background: var(--card2); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px solid rgba(244,114,182,0.15); cursor: pointer; transition: border-color 0.2s; }
        .meal-hero:hover { border-color: rgba(244,114,182,0.3); }
        .meal-emoji { font-size: 38px; margin-bottom: 8px; line-height: 1; }
        .meal-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
        .meal-detail { font-size: 11px; color: var(--muted); margin-top: 3px; }
        .meal-tags { display: flex; gap: 6px; margin-top: 10px; }
        .meal-tag { font-size: 10px; padding: 3px 10px; border-radius: 20px; font-weight: 500; }

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
      `}</style>

      <div className="app">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">FH</div>
          {navItems.map(item => (
            <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => setActiveNav(item.id)}>
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-label">{item.label}</div>
            </div>
          ))}
          <div className="nav-divider" />
          {navItems2.map(item => (
            <div key={item.id} className={`nav-item ${activeNav === item.id ? 'active' : ''}`} onClick={() => setActiveNav(item.id)}>
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-label">{item.label}</div>
            </div>
          ))}
          <div className="sidebar-bottom">
            <div className="nav-divider" />
            <div className="av" style={{background:'linear-gradient(135deg,#6C8EFF,#A78BFA)'}}>M</div>
            <div className="av" style={{background:'linear-gradient(135deg,#34D399,#22D3EE)'}}>D</div>
            <div className="av" style={{background:'linear-gradient(135deg,#FBBF24,#F97316)'}}>E</div>
            <div className="av" style={{background:'linear-gradient(135deg,#F472B6,#A78BFA)'}}>J</div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            <div>
              <div className="greeting">Good morning 👋</div>
              <div className="date-text">Saturday, 28 February 2026</div>
            </div>
            <div className="topbar-right">
              <div className="live-pill"><div className="live-dot" /> Live</div>
              <div className="notif-btn">🔔<div className="notif-badge" /></div>
            </div>
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
                    <div className="ph-sub">Sat 28 Feb · 6 things happening</div>
                  </div>
                </div>
                <div className="ph-action">Full calendar</div>
              </div>
              <div className="pb">
                <div style={{flexShrink:0}}>
                  <div className="dp-labels">
                    <div className="dp-label">Day progress</div>
                    <div className="dp-pct">37% through the day</div>
                  </div>
                  <div className="dp-track"><div className="dp-fill" /></div>
                </div>
                <div className="weather-strip">
                  <div style={{fontSize:22}}>⛅</div>
                  <div style={{flex:1}}>
                    <div className="w-temp">18°C</div>
                    <div className="w-desc">Partly cloudy · Wellington</div>
                  </div>
                  <div className="w-tag" style={{background:'rgba(52,211,153,0.1)',color:'#34D399'}}>Good for outdoors</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(251,191,36,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#FBBF24,#F97316)'}}>E</div>
                  <div className="card-body">
                    <div className="card-name">Ella — PE Gear today 👟</div>
                    <div className="card-detail">Don&apos;t forget sports shoes & water bottle. PE is period 2.</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(251,191,36,0.12)',color:'#FBBF24'}}>School</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(244,114,182,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#F472B6,#A78BFA)'}}>J</div>
                  <div className="card-body">
                    <div className="card-name">Jack — School uniform 👕</div>
                    <div className="card-detail">Regular uniform day. Bag packed? Reading folder inside.</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(244,114,182,0.12)',color:'#F472B6'}}>School</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(52,211,153,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#34D399,#22D3EE)'}}>D</div>
                  <div className="card-body">
                    <div className="card-name">Dad — Drop-off & pick-up 🚗</div>
                    <div className="card-detail">Drop-off 7:30am · Pick-up 3:10pm · Both kids</div>
                  </div>
                  <div className="card-tag" style={{background:'rgba(52,211,153,0.12)',color:'#34D399'}}>Transport</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(108,142,255,0.2)'}}>
                  <div className="card-avatar" style={{background:'linear-gradient(135deg,#6C8EFF,#A78BFA)'}}>M</div>
                  <div className="card-body">
                    <div className="card-name">Mum — Dog vet appointment 🐶</div>
                    <div className="card-detail">Buddy&apos;s check-up · Newlands Vet · 10:30am</div>
                  </div>
                  <div className="card-time">10:30</div>
                </div>
                <div className="today-card" style={{borderColor:'rgba(248,113,113,0.2)'}}>
                  <div className="card-emoji" style={{background:'rgba(248,113,113,0.1)'}}>📋</div>
                  <div className="card-body">
                    <div className="card-name">Permission slip due Monday</div>
                    <div className="card-detail">Ella&apos;s Zoo excursion — sign & return by Mon 3 Mar</div>
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
                    <div className="ph-sub">{doneCount} of {tasks.length} done</div>
                  </div>
                </div>
                <div className="ph-action">Add task</div>
              </div>
              <div className="pb">
                {tasks.map(task => (
                  <div key={task.id} className="task-row" onClick={() => toggleTask(task.id)}>
                    <div className={`task-cb ${task.done ? 'done' : ''}`}>{task.done ? '✓' : ''}</div>
                    <div className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</div>
                    <div className="task-tag" style={{background:task.color, color:task.textColor}}>{task.person}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* GOALS */}
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
              <div className="pb" style={{justifyContent:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:16,flex:1}}>
                  <div className="metric-ring">
                    <svg width="76" height="76" viewBox="0 0 76 76">
                      <circle fill="none" stroke="var(--card2)" strokeWidth="6" cx="38" cy="38" r="30"/>
                      <circle fill="none" stroke="url(#goalGrad)" strokeWidth="6" strokeLinecap="round" cx="38" cy="38" r="30" strokeDasharray="188.5" strokeDashoffset="52"/>
                      <defs>
                        <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6C8EFF"/>
                          <stop offset="100%" stopColor="#A78BFA"/>
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
                      {name:'🏋️ Garage', pct:25, bg:'linear-gradient(90deg,#FBBF24,#F97316)'},
                    ].map(g => (
                      <div key={g.name}>
                        <div className="mg-top"><div className="mg-name">{g.name}</div><div className="mg-pct">{g.pct}%</div></div>
                        <div className="mg-track"><div className="mg-fill" style={{width:`${g.pct}%`,background:g.bg}} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TONIGHT'S MEAL */}
            <div className="panel">
              <div className="ph">
                <div className="ph-left">
                  <div className="ph-icon" style={{background:'rgba(244,114,182,0.15)'}}>🍽</div>
                  <div>
                    <div className="ph-title">Tonight&apos;s Meal</div>
                    <div className="ph-sub">Saturday</div>
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
                    <div className="ph-sub">February</div>
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
                    {label:'🏡 Bills', pct:100, color:'#F87171'},
                    {label:'🎉 Activities', pct:76, color:'#FBBF24'},
                    {label:'🏖️ Savings', pct:100, color:'#6C8EFF'},
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
      </div>
    </>
  )
}