'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type Member = 'M' | 'D' | 'I' | 'J'
type Recurrence = 'once' | 'daily' | 'weekly' | 'monthly'
type Priority = 'low' | 'normal' | 'high'
type PriorityFilter = 'all' | 'high' | 'normal' | 'low'

interface Task {
  id: string
  title: string
  description?: string
  assigned_to: Member[]
  recurrence: Recurrence
  recurrence_days?: number[]
  recurrence_day_of_month?: number
  due_date?: string
  due_time?: string
  start_date: string
  is_active: boolean
  priority: Priority
  category: string
  icon: string
  created_at: string
}

interface TaskCompletion {
  id: string
  task_id: string
  completed_by: Member
  completed_for_date: string
  completed_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MEMBERS: { id: Member; name: string; color: string; bg: string }[] = [
  { id: 'M', name: 'Mum',    color: '#818CF8', bg: 'rgba(129,140,248,0.15)' },
  { id: 'D', name: 'Dad',    color: '#34D399', bg: 'rgba(52,211,153,0.15)'  },
  { id: 'I', name: 'Isabel', color: '#F472B6', bg: 'rgba(244,114,182,0.15)' },
  { id: 'J', name: 'James',  color: '#FBBF24', bg: 'rgba(251,191,36,0.15)'  },
]

const CATEGORIES = [
  { value: 'general',     label: 'General',     icon: '📋' },
  { value: 'maintenance', label: 'Maintenance',  icon: '🔧' },
  { value: 'chores',      label: 'Chores',       icon: '🧹' },
  { value: 'food',        label: 'Food',         icon: '🍽️' },
  { value: 'school',      label: 'School',       icon: '🎒' },
  { value: 'cleaning',    label: 'Cleaning',     icon: '✨' },
  { value: 'errands',     label: 'Errands',      icon: '🛒' },
  { value: 'hobbies',     label: 'Hobbies',      icon: '🎨' },
]

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMember(id: Member) {
  return MEMBERS.find(m => m.id === id)!
}

function isTaskDueOnDate(task: Task, date: Date): boolean {
  if (!task.is_active) return false
  const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Pacific/Auckland' })
  const dayOfWeek = date.getDay()
  const dayOfMonth = date.getDate()
  switch (task.recurrence) {
    case 'daily':   return true
    case 'weekly':
      if (!task.recurrence_days || task.recurrence_days.length === 0) return true
      return task.recurrence_days.includes(dayOfWeek)
    case 'monthly':
      if (!task.recurrence_day_of_month) return dayOfMonth === 1
      return task.recurrence_day_of_month === dayOfMonth
    case 'once':    return task.due_date === dateStr
    default:        return false
  }
}

function isTaskDueToday(task: Task): boolean {
  return isTaskDueOnDate(task, new Date())
}

function isTaskDueThisWeek(task: Task): boolean {
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    if (isTaskDueOnDate(task, d)) return true
  }
  return false
}

function recurrenceLabel(task: Task): string {
  switch (task.recurrence) {
    case 'once':    return task.due_date ? `Due ${task.due_date}` : 'One-off'
    case 'daily':   return 'Every day'
    case 'weekly': {
      const days = (task.recurrence_days ?? []).map(d => DAYS_SHORT[d]).join(', ')
      return days ? `Weekly · ${days}` : 'Every week'
    }
    case 'monthly':
      return task.recurrence_day_of_month
        ? `Monthly · ${ordinal(task.recurrence_day_of_month)}`
        : 'Monthly'
    default:        return 'Recurring'
  }
}

function ordinal(n: number): string {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function priorityColor(p: Priority) {
  return p === 'high' ? '#F87171' : p === 'low' ? '#6B7280' : '#6C8EFF'
}

function blankTask(): Partial<Task> {
  return {
    title: '',
    description: '',
    assigned_to: [],
    recurrence: 'once',
    recurrence_days: [],
    recurrence_day_of_month: undefined,
    due_date: getToday(),
    due_time: '',
    start_date: getToday(),
    is_active: true,
    priority: 'normal',
    category: 'general',
    icon: '✓',
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TasksModule() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'today' | 'week'>('today')
  const [showCompleted, setShowCompleted] = useState(false)
  const [filterMember, setFilterMember] = useState<Member | null>(null)
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<Partial<Task>>(blankTask())
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  const hasLoaded = useRef(false)

  const fetchData = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true)
    const [{ data: taskData, error: taskError }, { data: completionData }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('task_completions').select('*').eq('completed_for_date', getToday()),
    ])
    if (taskError) console.error('Task fetch error:', taskError)
    setTasks((taskData as Task[]) ?? [])
    setCompletions((completionData as TaskCompletion[]) ?? [])
    hasLoaded.current = true
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const isCompleted = (taskId: string) => completions.some(c => c.task_id === taskId)
  const getCompletedBy = (taskId: string) => completions.find(c => c.task_id === taskId)?.completed_by

  const toggleComplete = async (task: Task, member: Member) => {
    const existing = completions.find(c => c.task_id === task.id)
    if (existing) {
      await supabase.from('task_completions').delete().eq('id', existing.id)
      setCompletions(prev => prev.filter(c => c.id !== existing.id))
    } else {
      const { data } = await supabase
        .from('task_completions')
        .insert({ task_id: task.id, completed_by: member, completed_for_date: getToday() })
        .select()
        .single()
      if (data) setCompletions(prev => [...prev, data as TaskCompletion])
    }
  }

  const handleSave = async () => {
    if (!form.title?.trim()) return
    setSaving(true)
    setError(null)

    const assignedTo = (form.assigned_to ?? []).filter(Boolean)

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      assigned_to: assignedTo,
      recurrence: form.recurrence ?? 'once',
      recurrence_days: form.recurrence === 'weekly' ? (form.recurrence_days ?? []) : null,
      recurrence_day_of_month: form.recurrence === 'monthly' ? (form.recurrence_day_of_month ?? null) : null,
      due_date: form.recurrence === 'once' ? (form.due_date ?? getToday()) : null,
      due_time: form.due_time?.trim() || null,
      start_date: form.start_date ?? getToday(),
      is_active: true,
      priority: form.priority ?? 'normal',
      category: form.category ?? 'general',
      icon: form.icon ?? '✓',
    }

    if (editingTask) {
      const { data, error: updateError } = await supabase
        .from('tasks').update(payload).eq('id', editingTask.id).select().single()
      if (updateError) {
        setError(`Save failed: ${updateError.message}`)
      } else if (data) {
        setTasks(prev => prev.map(t => t.id === editingTask.id ? data as Task : t))
        closeForm()
      }
    } else {
      const { data, error: insertError } = await supabase
        .from('tasks').insert(payload).select().single()
      if (insertError) {
        setError(`Save failed: ${insertError.message}`)
      } else if (data) {
        setTasks(prev => [data as Task, ...prev])
        closeForm()
      }
    }

    setSaving(false)
  }

  const handleDelete = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleArchive = async (task: Task) => {
    const { data } = await supabase
      .from('tasks').update({ is_active: !task.is_active }).eq('id', task.id).select().single()
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data as Task : t))
  }

  const openNew = () => {
    setEditingTask(null)
    setForm(blankTask())
    setError(null)
    setShowForm(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setForm({ ...task })
    setError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setForm(blankTask())
    setError(null)
  }

  const toggleFormMember = (m: Member) => {
    setForm(prev => {
      const current = prev.assigned_to ?? []
      const already = current.includes(m)
      return {
        ...prev,
        assigned_to: already ? current.filter(x => x !== m) : [...current, m],
      }
    })
  }

  const toggleFormDay = (d: number) => {
    setForm(prev => {
      const current = prev.recurrence_days ?? []
      const already = current.includes(d)
      return {
        ...prev,
        recurrence_days: already ? current.filter(x => x !== d) : [...current, d],
      }
    })
  }

  const todayTasks = tasks.filter(isTaskDueToday)
  const weekTasks = tasks.filter(isTaskDueThisWeek)
  const basePool = view === 'today' ? todayTasks : weekTasks

  const PRIORITY_ORDER: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

  const filteredTasks = basePool
    .filter(t => {
      const done = isCompleted(t.id)
      if (showCompleted !== done) return false
      if (filterMember && !t.assigned_to.includes(filterMember)) return false
      if (activeCategory !== 'all' && t.category !== activeCategory) return false
      if (!showCompleted && filterPriority !== 'all' && t.priority !== filterPriority) return false
      return true
    })
    .sort((a, b) => {
      if (showCompleted) return 0
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  const completedCount = todayTasks.filter(t => isCompleted(t.id)).length

  return (
    <div style={{ fontFamily: "'Syne', 'Inter', sans-serif", color: '#F1F5F9', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Tasks</h1>
          <p style={{ margin: '4px 0 0', color: '#94A3B8', fontSize: 14 }}>
            {completedCount}/{todayTasks.length} done today
          </p>
        </div>
        <button onClick={openNew} style={styles.addBtn}>+ Add Task</button>
      </div>

      {/* Progress bar */}
      {todayTasks.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(completedCount / todayTasks.length) * 100}%`,
              background: 'linear-gradient(90deg, #6C8EFF, #34D399)',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* View tabs + Completed toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['today', 'week'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ ...styles.tab, ...(view === v ? styles.tabActive : {}) }}>
            {v === 'today' ? '📅 Today' : '📆 This Week'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          style={{
            ...styles.tab,
            ...(showCompleted ? { border: '1.5px solid #34D399', background: 'rgba(52,211,153,0.1)', color: '#34D399' } : {}),
          }}
        >
          ✓ Completed
        </button>
      </div>

      {/* Priority filter */}
      {!showCompleted && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['all', 'high', 'normal', 'low'] as PriorityFilter[]).map(p => {
            const isActive = filterPriority === p
            const col = p === 'all' ? '#6C8EFF' : priorityColor(p as Priority)
            return (
              <button key={p} onClick={() => setFilterPriority(p)} style={{
                ...styles.chip,
                ...(isActive ? { border: `1.5px solid ${col}`, background: `${col}20`, color: col } : {}),
              }}>
                {p === 'all' ? 'All' : p === 'high' ? '🔴 High' : p === 'normal' ? '🔵 Normal' : '⚫ Low'}
              </button>
            )
          })}
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <button onClick={() => setActiveCategory('all')} style={{ ...styles.chip, ...(activeCategory === 'all' ? styles.chipActive : {}) }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setActiveCategory(c.value)} style={{ ...styles.chip, ...(activeCategory === c.value ? styles.chipActive : {}) }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {/* Member filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterMember(null)}
          style={{
            padding: '6px 14px', borderRadius: 99,
            border: `2px solid ${filterMember === null ? '#6C8EFF' : 'rgba(255,255,255,0.1)'}`,
            background: filterMember === null ? 'rgba(108,142,255,0.15)' : 'transparent',
            color: filterMember === null ? '#6C8EFF' : '#94A3B8',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          Everyone
        </button>
        {MEMBERS.map(m => (
          <button key={m.id} onClick={() => setFilterMember(filterMember === m.id ? null : m.id)} style={{
            padding: '6px 14px', borderRadius: 99,
            border: `2px solid ${filterMember === m.id ? m.color : 'rgba(255,255,255,0.1)'}`,
            background: filterMember === m.id ? m.bg : 'transparent',
            color: filterMember === m.id ? m.color : '#94A3B8',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          }}>
            {m.name}
          </button>
        ))}
      </div>

      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#475569', paddingTop: 48 }}>Loading tasks…</div>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{showCompleted ? '🎉' : '✨'}</div>
          <p style={{ color: '#475569', margin: 0 }}>
            {showCompleted
              ? 'No completed tasks yet.'
              : view === 'today' ? 'Nothing due today!' : 'Nothing coming up this week!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              completed={isCompleted(task.id)}
              completedBy={getCompletedBy(task.id)}
              onToggle={toggleComplete}
              onEdit={openEdit}
              onDelete={handleDelete}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TaskForm
          form={form}
          setForm={setForm}
          editing={!!editingTask}
          saving={saving}
          error={error}
          onSave={handleSave}
          onClose={closeForm}
          onToggleMember={toggleFormMember}
          onToggleDay={toggleFormDay}
        />
      )}
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, completed, completedBy, onToggle, onEdit, onDelete, onArchive }: {
  task: Task
  completed: boolean
  completedBy?: Member
  onToggle: (task: Task, member: Member) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onArchive: (task: Task) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const primaryMember = task.assigned_to[0] as Member | undefined

  return (
    <div style={{
      background: completed ? 'rgba(52,211,153,0.06)' : task.is_active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${completed ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 14,
      overflow: 'hidden',
      opacity: task.is_active ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <button
          onClick={() => onToggle(task, primaryMember ?? 'M')}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `2px solid ${completed ? '#34D399' : 'rgba(255,255,255,0.2)'}`,
            background: completed ? '#34D399' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s', fontSize: 13,
          }}
        >
          {completed && <span style={{ color: '#0F172A', fontWeight: 900 }}>✓</span>}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{task.icon}</span>
            <span style={{
              fontWeight: 700, fontSize: 15,
              textDecoration: completed ? 'line-through' : 'none',
              color: completed ? '#475569' : '#F1F5F9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.title}
            </span>
            {task.priority === 'high' && !completed && (
              <span style={{ fontSize: 10, color: '#F87171', fontWeight: 700, flexShrink: 0 }}>●</span>
            )}
          </div>
          {task.description && (
            <div style={{
              fontSize: 11, color: '#64748B', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {task.description}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>{recurrenceLabel(task)}</span>
            {completed && completedBy && (
              <span style={{ fontSize: 11, color: '#34D399' }}>✓ {getMember(completedBy).name}</span>
            )}
          </div>
        </div>

        {/* Member avatars */}
        <div style={{ display: 'flex', flexShrink: 0 }}>
          {task.assigned_to.slice(0, 3).map((m, i) => {
            const mem = getMember(m as Member)
            if (!mem) return null
            return (
              <div key={`${m}-${i}`} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: mem.bg, border: `2px solid ${mem.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: mem.color,
                marginLeft: i > 0 ? -6 : 0, zIndex: 3 - i, position: 'relative',
              }}>
                {m}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setShowActions(!showActions)}
          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, fontSize: 18, lineHeight: 1 }}
        >
          ⋯
        </button>
      </div>

      {showActions && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '10px 16px',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <span style={{ fontSize: 11, color: '#64748B', alignSelf: 'center' }}>Mark done by:</span>
          {task.assigned_to.map(m => {
            const mem = getMember(m as Member)
            if (!mem) return null
            return (
              <button key={m} onClick={() => { onToggle(task, m as Member); setShowActions(false) }} style={{
                padding: '4px 10px', borderRadius: 99,
                border: `1.5px solid ${mem.color}`, background: mem.bg,
                color: mem.color, cursor: 'pointer', fontSize: 12, fontWeight: 700,
              }}>
                {mem.name}
              </button>
            )
          })}
          <div style={{ flex: 1 }} />
          <button onClick={() => { onEdit(task); setShowActions(false) }} style={styles.actionBtn}>✏️ Edit</button>
          <button onClick={() => { onArchive(task); setShowActions(false) }} style={styles.actionBtn}>
            {task.is_active ? '📦 Archive' : '♻️ Restore'}
          </button>
          <button onClick={() => { if (confirm(`Delete "${task.title}"?`)) onDelete(task.id) }} style={{ ...styles.actionBtn, color: '#F87171' }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Task Form ────────────────────────────────────────────────────────────────
function TaskForm({ form, setForm, editing, saving, error, onSave, onClose, onToggleMember, onToggleDay }: {
  form: Partial<Task>
  setForm: React.Dispatch<React.SetStateAction<Partial<Task>>>
  editing: boolean
  saving: boolean
  error: string | null
  onSave: () => void
  onClose: () => void
  onToggleMember: (m: Member) => void
  onToggleDay: (d: number) => void
}) {
  const f = (field: keyof Task, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const ICONS = ['✓', '🧹', '🎒', '🛒', '💡', '🍽️', '🐱', '❤️', '📚', '🚗', '💊', '🏃', '🌱', '📞', '🔧']

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet — position: fixed directly so iOS knows the exact bounds */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
        background: '#0F172A',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        height: '88vh',
      }}>
        {/* Scrollable content — minHeight:0 is the critical iOS Safari scroll fix */}
        <div style={{
          flex: 1, minHeight: 0,
          overflowY: 'scroll', overflowX: 'hidden',
          padding: '24px 20px 0',
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{editing ? 'Edit Task' : 'New Task'}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: '#F87171', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Title */}
          <label style={styles.label}>Task title *</label>
          <input
            value={form.title ?? ''}
            onChange={e => f('title', e.target.value)}
            placeholder="e.g. Take bins out"
            style={styles.input}
            autoFocus
          />

          {/* Icon */}
          <label style={styles.label}>Icon</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {ICONS.map(icon => (
              <button key={icon} onClick={() => f('icon', icon)} style={{
                width: 36, height: 36, borderRadius: 8, fontSize: 18,
                border: `2px solid ${form.icon === icon ? '#6C8EFF' : 'rgba(255,255,255,0.1)'}`,
                background: form.icon === icon ? 'rgba(108,142,255,0.15)' : 'transparent',
                cursor: 'pointer',
              }}>
                {icon}
              </button>
            ))}
          </div>

          {/* Notes */}
          <label style={styles.label}>Notes (optional)</label>
          <textarea
            value={form.description ?? ''}
            onChange={e => f('description', e.target.value)}
            placeholder="Any extra notes…"
            rows={3}
            style={{ ...styles.input, resize: 'none', lineHeight: '1.5' }}
          />

          {/* Assign to */}
          <label style={styles.label}>Assign to</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {MEMBERS.map(m => {
              const isSelected = (form.assigned_to ?? []).includes(m.id)
              return (
                <button key={m.id} onClick={() => onToggleMember(m.id)} style={{
                  flex: 1, padding: '10px 4px', borderRadius: 10,
                  border: `2px solid ${isSelected ? m.color : 'rgba(255,255,255,0.1)'}`,
                  background: isSelected ? m.bg : 'transparent',
                  color: isSelected ? m.color : '#64748B',
                  cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  transition: 'all 0.15s',
                }}>
                  {isSelected ? '✓ ' : ''}{m.name}
                </button>
              )
            })}
          </div>

          {/* Category */}
          <label style={styles.label}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => f('category', c.value)} style={{
                ...styles.chip, ...(form.category === c.value ? styles.chipActive : {}),
              }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Priority */}
          <label style={styles.label}>Priority</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['low', 'normal', 'high'] as Priority[]).map(p => (
              <button key={p} onClick={() => f('priority', p)} style={{
                flex: 1, padding: '8px', borderRadius: 10,
                border: `2px solid ${form.priority === p ? priorityColor(p) : 'rgba(255,255,255,0.1)'}`,
                background: form.priority === p ? `${priorityColor(p)}20` : 'transparent',
                color: form.priority === p ? priorityColor(p) : '#64748B',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, textTransform: 'capitalize',
              }}>
                {p}
              </button>
            ))}
          </div>

          {/* Recurrence */}
          <label style={styles.label}>Repeats</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {(['once', 'daily', 'weekly', 'monthly'] as Recurrence[]).map(r => (
              <button key={r} onClick={() => f('recurrence', r)} style={{
                ...styles.chip, ...(form.recurrence === r ? styles.chipActive : {}),
              }}>
                {r === 'once' ? '1️⃣ Once' : r === 'daily' ? '☀️ Daily' : r === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}
              </button>
            ))}
          </div>

          {form.recurrence === 'once' && (
            <>
              <label style={styles.label}>Due date</label>
              <input type="date" value={form.due_date ?? getToday()} onChange={e => f('due_date', e.target.value)} style={styles.input} />
            </>
          )}

          {form.recurrence === 'weekly' && (
            <>
              <label style={styles.label}>Which days? (leave blank for every day)</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {DAYS_SHORT.map((day, i) => (
                  <button key={i} onClick={() => onToggleDay(i)} style={{
                    flex: 1, padding: '8px 2px', borderRadius: 8,
                    border: `2px solid ${(form.recurrence_days ?? []).includes(i) ? '#6C8EFF' : 'rgba(255,255,255,0.1)'}`,
                    background: (form.recurrence_days ?? []).includes(i) ? 'rgba(108,142,255,0.15)' : 'transparent',
                    color: (form.recurrence_days ?? []).includes(i) ? '#6C8EFF' : '#64748B',
                    cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  }}>
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}

          {form.recurrence === 'monthly' && (
            <>
              <label style={styles.label}>Day of month</label>
              <input
                type="number" min={1} max={31}
                value={form.recurrence_day_of_month ?? ''}
                onChange={e => f('recurrence_day_of_month', parseInt(e.target.value) || undefined)}
                placeholder="e.g. 15"
                style={styles.input}
              />
            </>
          )}

          <label style={styles.label}>Time (optional)</label>
          <input type="time" value={form.due_time ?? ''} onChange={e => f('due_time', e.target.value)} style={styles.input} />
        </div>

        {/* Sticky action buttons */}
        <div style={{
          padding: '14px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0F172A',
          display: 'flex', gap: 10, flexShrink: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <button onClick={onClose} style={{ flex: 1, ...styles.secondaryBtn }}>Cancel</button>
          <button onClick={onSave} disabled={saving || !form.title?.trim()} style={{
            flex: 1, padding: '14px', borderRadius: 12, border: 'none',
            background: saving || !form.title?.trim() ? 'rgba(108,142,255,0.3)' : 'linear-gradient(135deg, #6C8EFF, #818CF8)',
            color: '#fff', fontWeight: 800, fontSize: 15,
            cursor: saving || !form.title?.trim() ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const styles = {
  addBtn: {
    padding: '10px 18px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #6C8EFF, #818CF8)',
    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  tab: {
    padding: '8px 16px', borderRadius: 99,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#64748B',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  tabActive: {
    border: '1.5px solid #6C8EFF',
    background: 'rgba(108,142,255,0.12)',
    color: '#6C8EFF',
  },
  chip: {
    padding: '6px 12px', borderRadius: 99,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#64748B',
    cursor: 'pointer', fontSize: 12, fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  chipActive: {
    border: '1.5px solid #6C8EFF',
    background: 'rgba(108,142,255,0.12)',
    color: '#6C8EFF',
  },
  actionBtn: {
    padding: '6px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: '#94A3B8', cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
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
    boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit',
  },
  secondaryBtn: {
    padding: '14px', borderRadius: 12,
    border: '1.5px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#94A3B8',
    fontWeight: 700, fontSize: 15, cursor: 'pointer',
  },
}
