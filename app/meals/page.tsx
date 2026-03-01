'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import MealPlanDay, { type MealPlan } from '../components/meals/MealPlanDay'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NZ_TZ = 'Pacific/Auckland'

function getToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: NZ_TZ })
}

function getWeekDays(weekOffset: 0 | 1): string[] {
  const todayStr = getToday()
  const today = new Date(todayStr + 'T12:00:00')
  const dow = today.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString('en-CA')
  })
}

function weekLabel(days: string[]): string {
  const fmt = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  return `${fmt(days[0])} – ${fmt(days[6])}`
}

const thisWeekDays = getWeekDays(0)
const nextWeekDays = getWeekDays(1)
const allDays = [...thisWeekDays, ...nextWeekDays]

export default function MealsPage() {
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<0 | 1>(0)
  const [meals, setMeals] = useState<MealPlan[]>([])
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const today = getToday()
  const weekDays = selectedWeek === 0 ? thisWeekDays : nextWeekDays
  const isParent = currentUser?.role === 'parent'

  useEffect(() => {
    try {
      const stored = localStorage.getItem('familyUser')
      if (stored) setCurrentUser(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const fetchMeals = useCallback(async () => {
    const { data } = await supabase
      .from('meal_plan')
      .select('*')
      .gte('meal_date', allDays[0])
      .lte('meal_date', allDays[allDays.length - 1])
      .order('meal_date')
    setMeals((data as MealPlan[]) ?? [])
  }, [])

  useEffect(() => {
    fetchMeals()
    const ch = supabase
      .channel('meal-plan-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plan' }, fetchMeals)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchMeals])

  const getMealForDate = (date: string) => meals.find(m => m.meal_date === date) ?? null

  const handleSave = async (date: string, data: Omit<MealPlan, 'id' | 'meal_date'>) => {
    setSaving(true)
    const existing = getMealForDate(date)
    if (existing) {
      await supabase
        .from('meal_plan')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('meal_plan').insert({ ...data, meal_date: date })
    }
    await fetchMeals()
    setSaving(false)
    setEditingDate(null)
  }

  const handleHeaderAdd = () => {
    const firstUnplanned = weekDays.find(d => !getMealForDate(d))
    setEditingDate(firstUnplanned ?? weekDays[0])
    // Scroll to top on mobile after a tick so the card is visible
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  return (
    <>
      <style>{`
        .meals-page {
          background: #0D0F14;
          min-height: 100dvh;
          font-family: 'DM Sans', sans-serif;
        }
        .week-tabs {
          display: flex;
          gap: 8px;
          padding: 14px 20px 0;
          max-width: 560px;
          margin: 0 auto;
        }
        .week-tab {
          flex: 1;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: #181B24;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .week-tab.active {
          background: rgba(108,142,255,0.12);
          border-color: rgba(108,142,255,0.3);
        }
        .week-tab-label {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: #F0F2F8;
        }
        .week-tab-dates { font-size: 10px; color: rgba(240,242,248,0.4); margin-top: 2px; }
        .week-tab.active .week-tab-label { color: #6C8EFF; }
        .week-tab.active .week-tab-dates { color: rgba(108,142,255,0.7); }
        .meals-scroll {
          padding: 14px 20px;
          padding-bottom: calc(80px + env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 560px;
          margin: 0 auto;
        }
      `}</style>

      <div className="meals-page">

        {/* ── Standard header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#13151C',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F2F8', textDecoration: 'none',
            fontSize: 16, flexShrink: 0,
          }}>
            ←
          </Link>
          <img src="/icons/apple-touch-icon.png" alt="" style={{ width: 32, height: 32, borderRadius: 9, display: 'block', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 18,
            color: '#F0F2F8', flex: 1,
          }}>
            Meal Plan
          </span>
          {isParent && (
            <button
              onClick={handleHeaderAdd}
              style={{
                background: '#6C8EFF', color: 'white', border: 'none',
                borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}
            >
              + Add
            </button>
          )}
        </div>

        {/* Week tabs */}
        <div className="week-tabs">
          {([0, 1] as const).map(offset => {
            const days = offset === 0 ? thisWeekDays : nextWeekDays
            return (
              <div
                key={offset}
                className={`week-tab ${selectedWeek === offset ? 'active' : ''}`}
                onClick={() => { setSelectedWeek(offset); setEditingDate(null) }}
              >
                <div className="week-tab-label">{offset === 0 ? 'This Week' : 'Next Week'}</div>
                <div className="week-tab-dates">{weekLabel(days)}</div>
              </div>
            )
          })}
        </div>

        {/* Day cards */}
        <div className="meals-scroll">
          {weekDays.map(date => (
            <MealPlanDay
              key={date}
              date={date}
              meal={getMealForDate(date)}
              isToday={date === today}
              isParent={isParent}
              isEditing={editingDate === date}
              saving={saving}
              onEdit={() => setEditingDate(date)}
              onCancelEdit={() => setEditingDate(null)}
              onSave={(data) => handleSave(date, data)}
            />
          ))}
        </div>
      </div>
    </>
  )
}
