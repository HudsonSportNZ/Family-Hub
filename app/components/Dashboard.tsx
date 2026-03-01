'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import EventModal from './EventModal'
import TodayAtSchool from './school/TodayAtSchool'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NZ_TZ = 'Pacific/Auckland'
function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
}

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
    case 'once':    return task.due_date === getToday()
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
  { id: 'groceries', icon: '🛒', label: 'List',    href: '/groceries' },
  { id: 'money',    icon: '💰', label: 'Money',    href: null        },
  { id: 'chat',     icon: '💬', label: 'Chat',     href: '/chat'     },
]

const FAMILY = [
  { id: 'M', label: 'Mum',    color: '#6C8EFF' },
  { id: 'D', label: 'Dad',    color: '#34D399' },
  { id: 'I', label: 'Isabel', color: '#FBBF24' },
  { id: 'J', label: 'James',  color: '#F472B6' },
]

const QUOTES = [
  'Today we try again, not perfectly, just honestly.',
  'Mornings feel easier when everyone helps a little.',
  'Being kind at home matters most.',
  'We solve problems calmly in this house.',
  'A messy start doesn\'t ruin the day.',
  'School mornings reward preparation the night before.',
  'Helping without reminders is real maturity.',
  'Hard homework grows smart brains.',
  'Tired parents still love loudly.',
  'Good siblings protect each other, even while arguing.',
  'Try first, complain later.',
  'Every family improves slowly together.',
  'Apologising quickly is a strength.',
  'Everyone gets overwhelmed sometimes. Reset and continue.',
  'You are allowed to learn slowly.',
  'Confidence comes after practice, not before.',
  'Effort matters more than natural talent.',
  'Calm voices fix more problems than loud ones.',
  'Our home is a teamwork zone.',
  'Responsibility creates freedom later.',
  'Be helpful before being entertained.',
  'A tidy room helps your brain relax.',
  'Strong families communicate clearly.',
  'Some days are hard. Keep showing up.',
  'You can restart your attitude anytime today.',
  'Respect grows trust.',
  'Finishing tasks feels better than avoiding them.',
  'Everyone contributes to a happy home.',
  'Courage is doing it anyway.',
  'Make future-you thankful tonight.',
  'Listening carefully shows real respect.',
  'Progress beats perfection every time.',
  'You don\'t have to win to improve.',
  'The first step breaks the fear.',
  'Everyone is learning, including adults.',
  'We speak kindly here, even frustrated.',
  'Gratitude changes bad moods quickly.',
  'A deep breath solves half the problem.',
  'Being early makes life easier.',
  'Practice builds confidence.',
  'Family time is important work.',
  'Do small jobs properly.',
  'We clean up after ourselves.',
  'Strong character forms in ordinary days.',
  'Choose helpful, not easy.',
  'Take turns fairly today.',
  'Patience is powerful.',
  'You are capable of hard things.',
  'Think before reacting.',
  'Help first, relax later.',
  'Encourage someone today.',
  'Be brave enough to ask questions.',
  'Morning moods set afternoon outcomes.',
  'Respect sleep; tomorrow depends on it.',
  'Do the next right thing.',
  'Calm choices prevent big problems.',
  'Your effort affects everyone at home.',
  'Kind words stay in hearts longer.',
  'Responsibility builds confidence.',
  'Try again with a better plan.',
  'Good habits make easy mornings.',
  'Show appreciation for small efforts.',
  'Be someone siblings can trust.',
  'Mistakes are part of learning.',
  'Cooperation makes evenings peaceful.',
  'Support people when they struggle.',
  'Clean spaces create calm minds.',
  'You\'re stronger than this frustration.',
  'Do hard tasks before screens.',
  'Make the house better than you found it.',
  'Parents aren\'t perfect either.',
  'Finish what you start.',
  'Every day teaches something useful.',
  'Be proud of effort today.',
  'Share responsibility fairly.',
  'Practice patience with siblings.',
  'Calm mornings begin with preparation.',
  'Everyone deserves respect at home.',
  'Speak truthfully and kindly.',
  'Growth happens outside comfort.',
  'Keep promises, even small ones.',
  'Choose gratitude tonight.',
  'Help younger family members learn.',
  'A calm mind solves faster.',
  'Being organised saves time later.',
  'Complaining doesn\'t fix problems.',
  'Ask before assuming.',
  'Kindness is remembered.',
  'Everyone improves at their own pace.',
  'Rest, then continue.',
  'Focus on what you can control.',
  'Learn from yesterday\'s mistake.',
  'We help each other succeed.',
  'Take responsibility quickly.',
  'Be patient while others learn.',
  'Do chores before reminders.',
  'Encouragement builds confidence.',
  'Respect family routines.',
  'Keep trying even when slow.',
  'Do your part today.',
  'Calm homes are built by calm voices.',
  'Think long-term, not just tonight.',
  'Every good habit starts awkwardly.',
  'Try solving it before asking help.',
  'Celebrate improvement, not just results.',
  'Be gentle with tired people.',
  'Everyone has bad days sometimes.',
  'Practice makes tomorrow easier.',
  'Being reliable earns trust.',
  'Kindness counts most inside the home.',
  'Strong mornings start the night before.',
  'Keep learning even after mistakes.',
  'Do small tasks immediately.',
  'Avoiding problems makes them bigger.',
  'Apologise when wrong.',
  'Accept apologies when given.',
  'Respect shared spaces.',
  'A helpful attitude changes everything.',
  'Be patient with yourself today.',
  'Help parents without being asked.',
  'Kind actions matter more than big speeches.',
  'Consistency beats bursts of effort.',
  'Speak up respectfully.',
  'Every person here matters.',
  'Hard work today means easier tomorrow.',
  'Stay calm during disagreements.',
  'Cooperation speeds everything up.',
  'Responsibility is a privilege.',
  'Try your best, not someone else\'s best.',
  'Keep practicing.',
  'The day improves after one good decision.',
  'Support your siblings today.',
  'Think of others before yourself sometimes.',
  'Calm first, solutions second.',
  'Be dependable.',
  'Don\'t quit early.',
  'Do it properly once.',
  'Ask kindly.',
  'Share fairly.',
  'Listen fully.',
  'Stay curious.',
  'Learn something new.',
  'Be respectful online and offline.',
  'Care for belongings.',
  'Appreciate your teachers.',
  'Be patient in queues.',
  'Use encouraging words.',
  'Do your responsibilities early.',
  'Be brave at school.',
  'Tell the truth.',
  'Kindness shows real strength.',
  'One calm person calms the room.',
  'Focus beats rushing.',
  'Be thoughtful before speaking.',
  'Try again after rest.',
  'Everyone grows differently.',
  'Practice makes mornings smoother.',
  'Finish homework before relaxing.',
  'Respect family time.',
  'Be proud of improvement.',
  'Show empathy when others struggle.',
  'Stay patient during learning.',
  'Accept feedback positively.',
  'Encourage effort in others.',
  'Tidy before bedtime.',
  'Prepare tomorrow tonight.',
  'You can do difficult things.',
  'Progress happens slowly.',
  'Work steadily.',
  'Calm beats fast.',
  'Support people publicly, correct privately.',
  'Be generous with help.',
  'Keep trying different strategies.',
  'Rest improves performance.',
  'Help younger ones learn safely.',
  'Respect shared time.',
  'Speak respectfully to parents.',
  'Think before clicking.',
  'Small kindnesses matter.',
  'Trust grows from honesty.',
  'Choose effort over excuses.',
  'Be responsible with screens.',
  'Priorities first, fun later.',
  'Practice gratitude before sleep.',
  'Cooperation solves evenings faster.',
  'Clean as you go.',
  'Own your choices.',
  'Stay patient with difficult tasks.',
  'Every day is practice for adulthood.',
  'Encourage learning curiosity.',
  'Keep promises made.',
  'Be supportive at dinner conversations.',
  'Calm down before solving.',
  'Help set the table.',
  'Share responsibilities equally.',
  'Think long-term consequences.',
  'Respect bedtime routines.',
  'Keep improving steadily.',
  'Focus on progress.',
  'You belong here.',
  'Family is built daily by actions.',
  'Respect mornings. They shape days.',
  'Make today easier for Mum and Dad.',
  'Offer help before entertainment.',
  'A good attitude helps everyone.',
  'Take pride in simple tasks.',
  'The right thing is rarely the easiest.',
  'Be kind even when tired.',
  'Clean spaces help clear thinking.',
  'Learning takes patience.',
  'Trust yourself trying.',
  'Practice resilience.',
  'You are improving every week.',
  'Help siblings succeed.',
  'Encourage younger kids kindly.',
  'Calm decisions beat quick reactions.',
  'Finish chores properly.',
  'Don\'t rush important things.',
  'Appreciate family dinners.',
  'Talk honestly about feelings.',
  'Keep growing.',
  'Be respectful at school.',
  'Choose patience today.',
  'Make someone\'s day easier.',
  'Be brave asking help.',
  'Effort compounds.',
  'Good habits build good lives.',
  'Stay organised today.',
  'Be dependable for your family.',
  'Think solutions, not blame.',
  'Encourage learning effort.',
  'Speak kindly during disagreements.',
  'Try again calmly.',
  'Your behaviour affects everyone.',
  'Respect shared responsibilities.',
  'Help prepare meals.',
  'Clean up after eating.',
  'Keep practicing difficult skills.',
  'Be supportive during hard days.',
  'Finish strong today.',
  'Encourage positivity.',
  'Be responsible with time.',
  'Rest when needed.',
  'Try your best at school.',
  'Learn from feedback.',
  'Help without expecting reward.',
  'Practice gratitude at night.',
  'Make thoughtful choices.',
  'Stay patient with yourself.',
  'Keep going.',
  'Some days we just show up. That counts.',
  'Breakfast conversations matter more than we realise.',
  'A calm goodbye helps school confidence.',
  'Pack bags early; stress sleeps late.',
  'Homework done early feels amazing later.',
  'Helping tonight makes tomorrow peaceful.',
  'You don\'t need to rush growing up.',
  'Ask questions. Curious kids become capable adults.',
  'Try solving sibling problems without shouting.',
  'Parents worry because they care deeply.',
  'A hug fixes many moods.',
  'Take responsibility before explanations.',
  'Even five minutes of effort matters.',
  'Speak how you want to be spoken to.',
  'Try again after a snack and water.',
  'Being reliable is a quiet superpower.',
  'Prepare for tomorrow before relaxing tonight.',
  'Family dinners are memory-making time.',
  'Screens wait. People first.',
  'Learn to do boring things well.',
  'You\'re building your future habits today.',
  'Clean backpacks prevent morning chaos.',
  'Ask how someone\'s day was.',
  'Do it properly the first time.',
  'Encourage effort, not just results.',
  'Every hard skill was once confusing.',
  'We help tired people here.',
  'Being early is respectful.',
  'Think about tomorrow-morning you.',
  'Fix small messes immediately.',
  'Read a little every day.',
  'Say thank you often.',
  'Admit mistakes quickly.',
  'Apologise sincerely.',
  'Accept help gratefully.',
  'Share success humbly.',
  'Support someone nervous today.',
  'You are safe to try here.',
  'Practice before performance.',
  'You learn fastest when uncomfortable.',
  'Good days follow good preparation.',
  'Speak kindly at breakfast.',
  'Start homework before screens.',
  'Courage grows through repetition.',
  'Responsibility earns independence.',
  'Encourage someone struggling.',
  'Calm thinking beats panic thinking.',
  'Focus on improvement, not comparison.',
  'Ask what you can do.',
  'Offer to help clear dishes.',
  'A peaceful bedtime starts after dinner.',
  'Practice reading aloud confidently.',
  'Everyone here is on your team.',
  'Be the reason home feels safe.',
  'Keep promises you make.',
  'A quiet room helps homework.',
  'Respect shared mornings.',
  'Prepare clothes the night before.',
  'Start tasks earlier than feels necessary.',
  'Celebrate finishing something difficult.',
  'Learn patience waiting your turn.',
  'Pay attention to instructions.',
  'Encourage siblings during hard tasks.',
  'One good decision can save a day.',
  'Help carry groceries.',
  'Talk through problems calmly.',
  'Drink water, then decide.',
  'Everyone deserves another chance.',
  'Today is practice for adulthood.',
  'Effort compounds quietly.',
  'Keep improving a little daily.',
  'Your attitude travels with you.',
  'You\'re becoming someone dependable.',
  'Be trustworthy even unwatched.',
  'Choose honesty over convenience.',
  'Kindness makes strong friendships.',
  'You can handle disappointment.',
  'Ask for guidance early.',
  'Finish what you begin.',
  'Respect people\'s time.',
  'Be brave raising your hand.',
  'Tidy desks help thinking.',
  'A plan reduces worry.',
  'Encourage shy friends.',
  'Focus during explanations.',
  'Speak respectfully to teachers.',
  'Say goodnight properly.',
  'Start mornings without rushing others.',
  'Do something thoughtful today.',
  'Learning takes repetition.',
  'Accept constructive correction.',
  'Keep practicing skills patiently.',
  'Small efforts stack into big results.',
  'You\'re growing even when tired.',
  'Try once more before quitting.',
  'Calm breathing resets frustration.',
  'Respect shared family spaces.',
  'Be kind after long days.',
  'Keep perspective during problems.',
  'Every day is a training day.',
  'Offer encouragement freely.',
  'Be someone others rely on.',
  'Take pride in reliability.',
  'Do the difficult thing early.',
  'Share the remote fairly.',
  'Laugh often at dinner.',
  'Support parents sometimes too.',
  'Make mornings easier for everyone.',
  'End the day peacefully.',
  'Gratitude improves sleep.',
  'Rest prepares success.',
  'Tomorrow rewards preparation.',
  'Growth happens quietly.',
  'You are loved here daily.',
  'The Hudson family shows up for each other.',
]

function getDailyQuote(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  const dayOfYear = Math.floor(diff / oneDay) // 1–365
  return QUOTES[(dayOfYear - 1) % QUOTES.length]
}

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Dashboard() {
  const pathname = usePathname()
  const activeNav = pathname === '/' ? 'home' : (navItems.find(i => i.href && i.href !== '/' && pathname.startsWith(i.href))?.id ?? 'home')

  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [activeMember, setActiveMember] = useState('M')
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null)
  const [tonightMeal, setTonightMeal] = useState<{ emoji: string; meal_name: string; cook_time?: string } | null | undefined>(undefined)
  const [quoteOpen, setQuoteOpen] = useState(false)

  const dailyQuote = getDailyQuote()
  const quotePreview = dailyQuote.split(' ').slice(0, 3).join(' ') + '...'
  const dayOfYear = getDayOfYear()
  const quoteDate = (() => {
    const d = new Date()
    const weekday = d.toLocaleDateString('en-NZ', { weekday: 'long' })
    const dayMonth = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long' })
    return `${weekday} ${dayMonth}`
  })()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) {
        const user = JSON.parse(stored)
        setCurrentUser(user)
        const memberId = FAMILY.find(m => m.label === user.name)?.id
        if (memberId) setActiveMember(memberId)
      }
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
        supabase.from('task_completions').select('*').eq('completed_for_date', getToday()),
      ])
      setTasks((taskData as Task[]) ?? [])
      setCompletions((completionData as Completion[]) ?? [])
    }
    fetchTasks()
  }, [])

  // Fetch tonight's meal
  useEffect(() => {
    supabase
      .from('meal_plan')
      .select('emoji, meal_name, cook_time')
      .eq('meal_date', getToday())
      .maybeSingle()
      .then(({ data }) => setTonightMeal(data ?? null))
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

  const todayTasks = tasks
    .filter(isTaskDueToday)
    .filter(t => t.assigned_to.includes(activeMember as Member))
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
        .dash-header { padding: 16px 22px 10px; padding-top: max(16px, env(safe-area-inset-top)); flex-shrink: 0; }
        @media (min-width: 769px) { .dash-header { padding-top: max(24px, env(safe-area-inset-top)); } }

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

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          html, body { overflow: hidden; }
          .sidebar { display: none; }
          .app { flex-direction: column; }
          .dash-greeting { font-size: 22px; }
        }

        /* ── QUOTE MODAL ── */
        @keyframes quoteModalIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .quote-modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .quote-modal-card {
          max-width: 340px; width: 100%;
          background: linear-gradient(135deg, rgba(108,142,255,0.12), rgba(167,139,250,0.08));
          border: 1px solid rgba(108,142,255,0.2);
          border-radius: 24px; padding: 32px 28px;
          position: relative; overflow: hidden;
          animation: quoteModalIn 0.2s ease-out;
        }
        .quote-modal-deco {
          position: absolute; top: -10px; left: 12px;
          font-family: 'Syne', sans-serif; font-size: 72px; font-weight: 800;
          color: rgba(108,142,255,0.15); line-height: 1;
          user-select: none; pointer-events: none; z-index: 0;
        }
        .quote-modal-close {
          position: absolute; top: 14px; right: 14px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%; width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(240,242,248,0.6);
          font-size: 16px; line-height: 1;
        }
        .quote-modal-body { position: relative; z-index: 1; text-align: center; }
        .quote-modal-sparkle { font-size: 28px; margin-bottom: 12px; }
        .quote-modal-text {
          font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700;
          color: #F0F2F8; line-height: 1.5; text-align: center;
        }
        .quote-modal-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 20px 0; }
        .quote-modal-footer { font-family: 'Inter', sans-serif; font-size: 11px; color: var(--muted); text-align: center; }
        .quote-modal-badge {
          display: inline-block;
          background: rgba(108,142,255,0.1); color: var(--accent);
          font-size: 10px; font-weight: 700;
          padding: 4px 12px; border-radius: 20px; margin-top: 8px;
        }
      `}</style>

      <div className="app">

        {/* ── DESKTOP SIDEBAR ── */}
        <aside className="sidebar">
          <img src="/icons/apple-touch-icon.png" style={{ width: 38, height: 38, borderRadius: 11, display: 'block', marginBottom: 18, flexShrink: 0 }} alt="" />
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
              <a href="/meals" className="quick-card">
                <div className="qc-icon">{tonightMeal?.emoji ?? '🍽'}</div>
                <div className="qc-label">Dinner</div>
                {tonightMeal === undefined ? (
                  <div className="qc-value" style={{color:'var(--muted)'}}>—</div>
                ) : tonightMeal === null ? (
                  <div className="qc-value" style={{color:'var(--muted)', fontSize:11}}>Not planned</div>
                ) : (
                  <>
                    <div className="qc-value">{tonightMeal.meal_name}</div>
                    {tonightMeal.cook_time && <div className="qc-sub">{tonightMeal.cook_time}</div>}
                  </>
                )}
                <div className="qc-bar" style={{background:'var(--pink)'}} />
              </a>
              <div className="quick-card" onClick={() => setQuoteOpen(true)}>
                <div className="qc-icon">💬</div>
                <div className="qc-label">Quote</div>
                <div className="qc-value" suppressHydrationWarning>{quotePreview}</div>
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

              {/* TODAY AT SCHOOL */}
              <TodayAtSchool />

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

      {quoteOpen && (
        <div className="quote-modal-backdrop" onClick={() => setQuoteOpen(false)}>
          <div className="quote-modal-card" onClick={e => e.stopPropagation()}>
            <div className="quote-modal-deco">&ldquo;</div>
            <button className="quote-modal-close" onClick={() => setQuoteOpen(false)}>×</button>
            <div className="quote-modal-body">
              <div className="quote-modal-sparkle">✨</div>
              <div className="quote-modal-text" suppressHydrationWarning>{dailyQuote}</div>
              <div className="quote-modal-divider" />
              <div className="quote-modal-footer" suppressHydrationWarning>
                Hudson Family · {quoteDate}
              </div>
              <div className="quote-modal-badge" suppressHydrationWarning>
                Day {dayOfYear} of 365
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
