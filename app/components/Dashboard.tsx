'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import EventModal from './EventModal'
import QuickAddTaskModal from './QuickAddTaskModal'
import TodayAtSchool from './school/TodayAtSchool'
import WeatherWidget from './WeatherWidget'

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

interface SchoolDayRow {
  dropoff_person: string | null
  pickup_person: string | null
}

interface TimelineItem {
  id: string
  mins: number
  displayTime: string
  ampm: string
  title: string
  subtitle: string
  color: string
  status: 'done' | 'next' | 'later'
  calendarEvent?: CalendarEvent
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
  return first?.color ?? '#60a5fa'
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
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: NZ_TZ })
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

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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

const AVATAR_GRADIENTS: Record<string, string> = {
  Mum:    'linear-gradient(135deg, #6C8EFF, #A78BFA)',
  Dad:    'linear-gradient(135deg, #34D399, #22D3EE)',
  Isabel: 'linear-gradient(135deg, #FBBF24, #F97316)',
  James:  'linear-gradient(135deg, #F472B6, #A78BFA)',
}

const COOKER_COLORS: Record<string, string> = {
  Mum:      '#6C8EFF',
  Dad:      '#34D399',
  Takeaway: '#a78bfa',
  Easy:     '#fbbf24',
}

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
  const dayOfYear = Math.floor(diff / oneDay)
  return QUOTES[(dayOfYear - 1) % QUOTES.length]
}

function getDayOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

const FAB_ACTIONS = [
  { label: 'Add a task',         icon: '✅', bg: 'linear-gradient(135deg, #34D399, #22D3EE)', shadow: 'rgba(52,211,153,0.4)',   action: 'task'      },
  { label: 'Add an event',       icon: '🗓', bg: 'linear-gradient(135deg, #6C8EFF, #A78BFA)', shadow: 'rgba(108,142,255,0.4)', action: 'event'     },
  { label: 'Add a grocery item', icon: '🛒', bg: 'linear-gradient(135deg, #FBBF24, #F97316)', shadow: 'rgba(251,191,36,0.4)',  action: 'groceries' },
]

const sidebarExtra = [
  { id: 'school', icon: '🏫', label: 'School' },
  { id: 'clean',  icon: '🧹', label: 'Clean'  },
  { id: 'goals',  icon: '🎯', label: 'Goals'  },
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
  const [tonightMeal, setTonightMeal] = useState<{ emoji: string; meal_name: string; cook_time?: string; cooked_by?: string; serves?: string } | null | undefined>(undefined)
  const [todaySchoolRow, setTodaySchoolRow] = useState<SchoolDayRow | null>(null)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)
  const [fabClosing, setFabClosing] = useState(false)
  const [showFabTask, setShowFabTask] = useState(false)
  const [showFabEvent, setShowFabEvent] = useState(false)
  const router = useRouter()

  const dailyQuote = getDailyQuote()
  const dayOfYear = getDayOfYear()
  const quoteDate = (() => {
    const d = new Date()
    const weekday = d.toLocaleDateString('en-NZ', { weekday: 'long' })
    const dayMonth = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long' })
    return `${weekday} ${dayMonth}`
  })()

  const headerDateLine = (() => {
    const d = new Date()
    const weekday = d.toLocaleDateString('en-NZ', { weekday: 'long', timeZone: NZ_TZ })
    const day = d.toLocaleDateString('en-NZ', { day: 'numeric', timeZone: NZ_TZ })
    const month = d.toLocaleDateString('en-NZ', { month: 'long', timeZone: NZ_TZ })
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${weekday}, ${day} ${month} · Week ${weekNum}`
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

  const openFab  = () => { setFabClosing(false); setFabOpen(true) }
  const closeFab = () => {
    setFabClosing(true)
    setTimeout(() => { setFabOpen(false); setFabClosing(false) }, 150)
  }
  const handleFabToggle = () => { fabOpen ? closeFab() : openFab() }
  const handleFabAction = (action: string) => {
    closeFab()
    setTimeout(() => {
      if (action === 'task')       setShowFabTask(true)
      else if (action === 'event') setShowFabEvent(true)
      else router.push('/groceries?action=add')
    }, 150)
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

  useEffect(() => {
    supabase
      .from('meal_plan')
      .select('emoji, meal_name, cook_time, cooked_by, serves')
      .eq('meal_date', getToday())
      .maybeSingle()
      .then(({ data }) => setTonightMeal(data ?? null))
  }, [])

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

  useEffect(() => {
    const ch = supabase
      .channel('dashboard-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
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

  // Fetch today's school plan row for What's On Today timeline
  useEffect(() => {
    const monday = getWeekMondayStr()
    const dow = getNZDayOfWeek()
    supabase
      .from('school_plan')
      .select('dropoff_person, pickup_person')
      .eq('week_start', monday)
      .eq('day_of_week', dow)
      .maybeSingle()
      .then(({ data }) => setTodaySchoolRow(data ?? null))
  }, [])

  const todayTasks = tasks
    .filter(isTaskDueToday)
    .filter(t => t.assigned_to.includes(activeMember as Member))
  const isCompleted = (taskId: string) => completions.some(c => c.task_id === taskId)
  const doneCount = todayTasks.filter(t => isCompleted(t.id)).length
  const remainingCount = todayTasks.length - doneCount

  const handleToggleTask = async (task: Task) => {
    const done = isCompleted(task.id)
    if (done) {
      const completion = completions.find(c => c.task_id === task.id)
      if (completion) {
        setCompletions(prev => prev.filter(c => c.id !== completion.id))
        await supabase.from('task_completions').delete().eq('id', completion.id)
      }
    } else {
      const optimistic: Completion = {
        id: `opt-${task.id}`,
        task_id: task.id,
        completed_by: activeMember as Member,
        completed_for_date: getToday(),
      }
      setCompletions(prev => [...prev, optimistic])
      const { data } = await supabase
        .from('task_completions')
        .insert({ task_id: task.id, completed_by: activeMember, completed_for_date: getToday() })
        .select()
        .single()
      if (data) {
        setCompletions(prev => prev.map(c => c.id === optimistic.id ? data as Completion : c))
      }
    }
  }

  // Only show incomplete tasks — they drop off as they're ticked
  const displayTasks = todayTasks
    .filter(t => !isCompleted(t.id))
    .slice(0, 4)

  // Build What's On Today timeline
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const rawTimeline: Omit<TimelineItem, 'status'>[] = []

  // Drop-off at 8:30am
  rawTimeline.push({
    id: 'dropoff',
    mins: 8 * 60 + 30,
    displayTime: '8:30', ampm: 'am',
    title: 'School drop-off',
    subtitle: todaySchoolRow?.dropoff_person ? `${todaySchoolRow.dropoff_person} driving` : 'Not set',
    color: '#4ade80',
  })

  // Calendar events — slotted in chronologically
  todayEvents.forEach(ev => {
    const evDate = new Date(ev.start_time)
    const mins = evDate.getHours() * 60 + evDate.getMinutes()
    const { time, ampm } = fmtEventTime(ev.start_time)
    rawTimeline.push({
      id: ev.id,
      mins,
      displayTime: time,
      ampm: ampm.toLowerCase(),
      title: ev.title,
      subtitle: ev.location ?? getMemberLabel(ev.members),
      color: eventColor(ev),
      calendarEvent: ev,
    })
  })

  // Pick-up at 3:00pm
  rawTimeline.push({
    id: 'pickup',
    mins: 15 * 60,
    displayTime: '3:00', ampm: 'pm',
    title: 'School pick-up',
    subtitle: todaySchoolRow?.pickup_person ? `${todaySchoolRow.pickup_person} driving` : 'Not set',
    color: '#60a5fa',
  })

  // Dinner at 5:30pm
  rawTimeline.push({
    id: 'dinner',
    mins: 17 * 60 + 30,
    displayTime: '5:30', ampm: 'pm',
    title: tonightMeal === undefined
      ? 'Dinner'
      : tonightMeal === null
        ? 'No dinner planned'
        : `${tonightMeal.emoji} ${tonightMeal.meal_name}`,
    subtitle: 'Dinner',
    color: '#f472b6',
  })

  rawTimeline.sort((a, b) => a.mins - b.mins)

  let nextFound = false
  const timeline: TimelineItem[] = rawTimeline.map(item => {
    let status: 'done' | 'next' | 'later'
    if (item.mins < nowMins) {
      status = 'done'
    } else if (!nextFound) {
      status = 'next'
      nextFound = true
    } else {
      status = 'later'
    }
    return { ...item, status }
  })

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #0a0a0f;
          --panel: #13131a;
          --card: #13131a;
          --card2: #1c1c26;
          --border: rgba(255,255,255,0.07);
          --border2: rgba(255,255,255,0.12);
          --text: #f0eee8;
          --muted: rgba(240,238,232,0.42);
          --faint: rgba(240,238,232,0.15);
          --accent: #60a5fa;
          --accent2: #a78bfa;
          --green: #4ade80;
          --amber: #fbbf24;
          --red: #f87171;
          --pink: #f472b6;
          --cyan: #22d3ee;
          --bottom-bar: 56px;
        }

        html, body {
          height: 100%;
          font-family: 'DM Sans', sans-serif;
          background: var(--bg);
          color: var(--text);
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── APP SHELL ── */
        .app { display: flex; height: 100dvh; width: 100vw; overflow: hidden; }

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
        .nav-item.active { background: rgba(96,165,250,0.12); border-color: rgba(96,165,250,0.25); }
        .nav-item.active .nav-label { color: var(--accent); }
        .nav-divider { width: 30px; height: 1px; background: var(--border); margin: 8px 0; }
        .sidebar-bottom { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 7px; }
        .av {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; cursor: pointer;
          border: 1.5px solid transparent; transition: all 0.2s;
        }
        .av:hover { border-color: var(--accent); transform: scale(1.08); }

        /* ── MAIN COLUMN ── */
        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; min-height: 0; }
        .main-inner { display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0; }
        @media (min-width: 769px) {
          .main-inner { max-width: 430px; width: 100%; margin: 0 auto; }
        }

        /* ── HEADER ── */
        .dash-header {
          padding: 16px 18px 14px;
          padding-top: max(20px, env(safe-area-inset-top));
          flex-shrink: 0;
        }
        @media (min-width: 769px) {
          .dash-header { padding-top: max(28px, env(safe-area-inset-top)); }
        }
        .profile-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .greeting-date { font-size: 13px; color: var(--muted); font-weight: 400; margin-bottom: 4px; }
        .greeting-good { font-size: 21px; font-weight: 300; color: rgba(240,238,232,0.55); line-height: 1.2; }
        .greeting-name { font-size: 36px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; }
        .profile-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700; color: white;
          flex-shrink: 0; border: 2px solid rgba(255,255,255,0.1);
          cursor: pointer; position: relative; transition: transform 0.2s; margin-top: 4px;
        }
        .profile-avatar:hover { transform: scale(1.05); }
        .online-dot {
          position: absolute; bottom: 1px; right: 1px;
          width: 10px; height: 10px;
          background: var(--green); border-radius: 50%;
          border: 2px solid var(--bg);
        }

        /* ── SCROLL AREA ── */
        .dash-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 0 16px;
          padding-bottom: calc(var(--bottom-bar) + 12px + env(safe-area-inset-bottom));
          display: flex; flex-direction: column; gap: 10px;
          -webkit-overflow-scrolling: touch; scrollbar-width: none;
        }
        .dash-scroll::-webkit-scrollbar { display: none; }
        @media (min-width: 769px) { .dash-scroll { padding-bottom: 24px; } }

        /* ── BASE CARD ── */
        .card {
          border-radius: 18px; padding: 16px;
          border: 1px solid var(--border); background: var(--card);
          animation: cardRise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
          flex-shrink: 0;
        }
        @keyframes cardRise {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .card-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
        .card-link { font-size: 13px; font-weight: 500; color: var(--accent); text-decoration: none; }
        .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }

        /* ── WHAT'S ON TODAY ── */
        .whatson-card {
          background: linear-gradient(145deg, #141428 0%, #0e1a30 100%);
          border-color: rgba(96,165,250,0.15);
        }
        .whatson-card .eyebrow { color: var(--accent); }
        .event-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 0; border-bottom: 1px solid var(--border);
        }
        .event-row:first-of-type { padding-top: 0; }
        .event-row:last-of-type  { border-bottom: none; padding-bottom: 0; }
        .e-time { min-width: 40px; text-align: right; flex-shrink: 0; }
        .e-time .t  { font-size: 14px; font-weight: 700; line-height: 1.2; }
        .e-time .ap { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; }
        .e-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .e-info { flex: 1; min-width: 0; }
        .e-title { font-size: 15px; font-weight: 600; line-height: 1.3; }
        .e-sub { font-size: 13px; color: var(--muted); margin-top: 1px; }
        .e-chip { border-radius: 100px; padding: 3px 10px; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .chip-done  { background: rgba(74,222,128,0.12);  color: var(--green); }
        .chip-next  { background: rgba(96,165,250,0.15);  color: var(--accent); }
        .chip-later { background: rgba(255,255,255,0.06); color: var(--muted); }

        /* ── TASKS CARD ── */
        .tasks-card { background: var(--card); }
        .task-row {
          display: flex; align-items: center; gap: 11px;
          padding: 8px 0; border-bottom: 1px solid var(--border);
        }
        .task-row:first-of-type { padding-top: 0; }
        .task-row:last-of-type  { border-bottom: none; padding-bottom: 0; }
        .t-check {
          width: 22px; height: 22px; border-radius: 50%;
          border: 2px solid var(--faint); flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
        }
        .t-check.done { background: var(--green); border-color: var(--green); color: #0a0a0f; }
        .t-text { font-size: 15px; font-weight: 500; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .t-text.x { text-decoration: line-through; color: var(--muted); font-weight: 400; }

        /* ── QUOTE CARD ── */
        .quote-card { background: var(--card2); text-align: center; padding: 22px 18px; cursor: pointer; }
        .q-mark { font-size: 48px; font-weight: 700; line-height: 0.6; color: rgba(167,139,250,0.22); display: block; margin-bottom: 12px; letter-spacing: -0.05em; }
        .q-text { font-size: 17px; font-weight: 400; font-style: italic; line-height: 1.55; margin-bottom: 10px; }
        .q-author { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

        /* ── MOBILE ── */
        @media (max-width: 768px) {
          html, body { overflow: hidden; }
          .sidebar { display: none; }
          .app { flex-direction: column; }
          .greeting-name { font-size: 32px; }
          .greeting-good { font-size: 19px; }
        }

        /* ── QUOTE MODAL ── */
        @keyframes quoteModalIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .quote-modal-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .quote-modal-card {
          max-width: 340px; width: 100%;
          background: linear-gradient(135deg, rgba(96,165,250,0.12), rgba(167,139,250,0.08));
          border: 1px solid rgba(96,165,250,0.2);
          border-radius: 24px; padding: 32px 28px;
          position: relative; overflow: hidden;
          animation: quoteModalIn 0.2s ease-out;
        }
        .quote-modal-deco {
          position: absolute; top: -10px; left: 12px;
          font-size: 72px; font-weight: 800;
          color: rgba(96,165,250,0.15); line-height: 1;
          user-select: none; pointer-events: none; z-index: 0;
        }
        .quote-modal-close {
          position: absolute; top: 14px; right: 14px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 50%; width: 30px; height: 30px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(240,238,232,0.6); font-size: 16px; line-height: 1;
        }
        .quote-modal-body { position: relative; z-index: 1; text-align: center; }
        .quote-modal-sparkle { font-size: 28px; margin-bottom: 12px; }
        .quote-modal-text { font-size: 18px; font-weight: 700; color: #f0eee8; line-height: 1.5; text-align: center; }
        .quote-modal-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 20px 0; }
        .quote-modal-footer { font-size: 11px; color: var(--muted); text-align: center; }
        .quote-modal-badge {
          display: inline-block;
          background: rgba(96,165,250,0.1); color: var(--accent);
          font-size: 10px; font-weight: 700;
          padding: 4px 12px; border-radius: 20px; margin-top: 8px;
        }

        /* ── FAB ── */
        .fab-btn {
          display: none;
          position: fixed; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); right: 20px;
          width: 52px; height: 52px; border-radius: 50%;
          background: linear-gradient(135deg, #a78bfa, #7c3aed);
          box-shadow: 0 8px 24px rgba(124,58,237,0.45);
          z-index: 50; align-items: center; justify-content: center;
          cursor: pointer; border: none; padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .fab-btn-icon {
          font-size: 24px; font-weight: 300; color: white;
          line-height: 1; display: block; user-select: none;
          transition: transform 0.25s ease;
        }
        .fab-btn.open .fab-btn-icon { transform: rotate(45deg); }
        .fab-backdrop {
          display: none; position: fixed; inset: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
          z-index: 40; animation: fabBackdropIn 0.2s ease forwards;
        }
        .fab-backdrop.closing { animation: fabBackdropOut 0.15s ease forwards; }
        .fab-menu {
          display: none;
          position: fixed; bottom: calc(152px + env(safe-area-inset-bottom, 0px)); right: 20px;
          z-index: 50; flex-direction: column-reverse; gap: 10px; align-items: flex-end;
        }
        .fab-action {
          display: flex; align-items: center; gap: 10px;
          cursor: pointer; opacity: 0; animation: fabActionIn 0.2s ease forwards;
        }
        .fab-action.closing { animation: fabActionOut 0.15s ease forwards; }
        .fab-label-pill {
          background: rgba(19,19,26,0.95); border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px); border-radius: 20px; padding: 8px 14px;
          font-size: 13px; font-weight: 600; color: #f0eee8; white-space: nowrap;
        }
        .fab-icon-circle {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        @keyframes fabBackdropIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fabBackdropOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes fabActionIn    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fabActionOut   { from { opacity: 1; transform: translateY(0); }   to { opacity: 0; transform: translateY(10px); } }
        @media (max-width: 768px) {
          .fab-btn      { display: flex; }
          .fab-backdrop { display: block; }
          .fab-menu     { display: flex; }
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

            {/* ── HEADER ── */}
            <div className="dash-header">
              <div className="profile-row">
                <div>
                  <div className="greeting-date" suppressHydrationWarning>{headerDateLine}</div>
                  <div className="greeting-good" suppressHydrationWarning>{getGreeting()},</div>
                  <div className="greeting-name" suppressHydrationWarning>
                    {currentUser ? `${currentUser.name} 👋` : '👋'}
                  </div>
                </div>
                {currentUser && (
                  <div
                    className="profile-avatar"
                    style={{ background: AVATAR_GRADIENTS[currentUser.name] ?? 'linear-gradient(135deg,#6C8EFF,#A78BFA)' }}
                    onClick={handleSwitchUser}
                    title="Switch user"
                  >
                    {currentUser.name[0]}
                    <div className="online-dot" />
                  </div>
                )}
              </div>
            </div>

            {/* ── SCROLLABLE CONTENT ── */}
            <div className="dash-scroll">

              {/* 1. WHAT'S ON TODAY */}
              <div className="card whatson-card" style={{ animationDelay: '0.06s' }}>
                <div className="eyebrow">📅 What&apos;s On Today</div>
                {timeline.map(item => (
                  <div
                    className="event-row"
                    key={item.id}
                    onClick={item.calendarEvent ? () => setSelectedEvent(item.calendarEvent!) : undefined}
                    style={{ cursor: item.calendarEvent ? 'pointer' : 'default' }}
                  >
                    <div className="e-time">
                      <div className="t">{item.displayTime}</div>
                      <div className="ap">{item.ampm}</div>
                    </div>
                    <div className="e-dot" style={{ background: item.color }} />
                    <div className="e-info">
                      <div className="e-title">{item.title}</div>
                      {item.subtitle && <div className="e-sub">{item.subtitle}</div>}
                    </div>
                    <div className={`e-chip ${item.status === 'done' ? 'chip-done' : item.status === 'next' ? 'chip-next' : 'chip-later'}`}>
                      {item.status === 'done' ? 'Done ✓' : item.status === 'next' ? 'Next up ↑' : 'Later'}
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. TODAY AT SCHOOL */}
              <div style={{ animation: 'cardRise 0.45s cubic-bezier(0.22,1,0.36,1) 0.13s both', flexShrink: 0 }}>
                <TodayAtSchool />
              </div>

              {/* 3. WEATHER */}
              <div style={{ animation: 'cardRise 0.45s cubic-bezier(0.22,1,0.36,1) 0.20s both', flexShrink: 0 }}>
                <WeatherWidget />
              </div>

              {/* 4. YOUR TASKS */}
              <div className="card tasks-card" style={{ animationDelay: '0.27s' }}>
                <div className="card-header">
                  <div className="card-title">
                    ✅ Your Tasks
                    {remainingCount > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>
                        {remainingCount} left
                      </span>
                    )}
                  </div>
                  <Link href="/tasks" className="card-link">See all →</Link>
                </div>
                {displayTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--muted)', fontSize: 14 }}>
                    {todayTasks.length > 0 ? 'All done! 🎉' : 'Nothing on today 🎉'}
                  </div>
                ) : (
                  displayTasks.map(task => (
                    <div
                      className="task-row"
                      key={task.id}
                      onClick={() => handleToggleTask(task)}
                      style={{ cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="t-check" />
                      <div className="t-text">{task.title}</div>
                    </div>
                  ))
                )}
              </div>

              {/* 5. TONIGHT'S DINNER */}
              {tonightMeal && (
                <Link href="/meals" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card" style={{ animationDelay: '0.34s', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div className="eyebrow" style={{ marginBottom: 0, color: 'var(--pink)' }}>🍽 Tonight&apos;s Dinner</div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>See plan →</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ fontSize: 44, lineHeight: 1, flexShrink: 0 }}>{tonightMeal.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'var(--text)' }}>
                          {tonightMeal.meal_name}
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                          {tonightMeal.cook_time && (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>⏱ {tonightMeal.cook_time}</span>
                          )}
                          {tonightMeal.serves && (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>🍽 Serves {tonightMeal.serves}</span>
                          )}
                        </div>
                        {tonightMeal.cooked_by && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: COOKER_COLORS[tonightMeal.cooked_by] ?? '#6C8EFF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>
                              {tonightMeal.cooked_by[0]}
                            </div>
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{tonightMeal.cooked_by} cooking</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* 6. QUOTE OF THE DAY */}
              <div className="card quote-card" style={{ animationDelay: '0.41s' }} onClick={() => setQuoteOpen(true)}>
                <span className="q-mark">&ldquo;</span>
                <div className="q-text" suppressHydrationWarning>{dailyQuote}</div>
                <div className="q-author">Daily thought</div>
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Event modal (for calendar events in timeline) */}
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

      {/* ── FAB ── */}
      {fabOpen && (
        <>
          <div className={`fab-backdrop${fabClosing ? ' closing' : ''}`} onClick={closeFab} />
          <div className="fab-menu">
            {FAB_ACTIONS.map((action, i) => (
              <div
                key={i}
                className={`fab-action${fabClosing ? ' closing' : ''}`}
                style={!fabClosing ? { animationDelay: `${i * 60}ms` } : undefined}
                onClick={() => handleFabAction(action.action)}
              >
                <div className="fab-label-pill">{action.label}</div>
                <div className="fab-icon-circle" style={{ background: action.bg, boxShadow: `0 4px 12px ${action.shadow}` }}>
                  {action.icon}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <button className={`fab-btn${fabOpen ? ' open' : ''}`} onClick={handleFabToggle} aria-label="Quick add">
        <span className="fab-btn-icon">+</span>
      </button>

      {showFabTask && (
        <QuickAddTaskModal
          onClose={() => setShowFabTask(false)}
          onSave={() => setShowFabTask(false)}
        />
      )}

      {showFabEvent && (
        <EventModal
          event={null}
          onClose={() => setShowFabEvent(false)}
          onSave={saved => {
            setTodayEvents(prev =>
              [...prev, saved].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            )
            setShowFabEvent(false)
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
