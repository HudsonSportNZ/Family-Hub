'use client'

import AddMealForm from './AddMealForm'

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  '🏆 Family fave': { bg: 'rgba(251,191,36,0.15)',  color: '#FBBF24' },
  '⏱ Quick':        { bg: 'rgba(52,211,153,0.15)',  color: '#34D399' },
  '❄️ Freezes well': { bg: 'rgba(34,211,238,0.12)', color: '#22D3EE' },
  '🌱 Veggie':      { bg: 'rgba(52,211,153,0.12)',  color: '#34D399' },
  '🌶️ Spicy':       { bg: 'rgba(248,113,113,0.15)', color: '#F87171' },
  '🍕 Takeaway':    { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA' },
}

const COOKER_COLORS: Record<string, string> = {
  'Mum':      '#6C8EFF',
  'Dad':      '#34D399',
  'Takeaway': '#A78BFA',
  'Easy':     '#FBBF24',
}

export interface MealPlan {
  id: string
  meal_date: string
  emoji: string
  meal_name: string
  cook_time?: string
  serves?: string
  cooked_by?: string
  adults_meal?: string
  kids_meal?: string
  same_for_all: boolean
  tags: string[]
}

interface MealPlanDayProps {
  date: string
  meal: MealPlan | null
  isToday: boolean
  isParent: boolean
  isEditing: boolean
  saving: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (data: Omit<MealPlan, 'id' | 'meal_date'>) => void
}

export default function MealPlanDay({
  date, meal, isToday, isParent, isEditing, saving, onEdit, onCancelEdit, onSave,
}: MealPlanDayProps) {
  const dayLabel  = new Date(date + 'T12:00:00').toLocaleDateString('en-NZ', { weekday: 'long' })
  const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  const cookerColor = meal?.cooked_by ? (COOKER_COLORS[meal.cooked_by] ?? '#6C8EFF') : '#6C8EFF'
  const visibleTags = meal?.tags?.filter(Boolean).slice(0, 3) ?? []

  return (
    <div style={{
      background: isToday ? 'rgba(108,142,255,0.05)' : 'var(--card)',
      border: `1px solid ${isToday ? 'rgba(108,142,255,0.25)' : 'var(--border)'}`,
      borderRadius: 20,
      transition: 'border-color 0.2s',
    }}>

      {/* ── Day header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px',
        borderBottom: (isEditing || meal) ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
            {dayLabel}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{dateLabel}</div>
          {isToday && (
            <div style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: 'rgba(108,142,255,0.2)', color: 'var(--accent)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Today
            </div>
          )}
        </div>
        {isParent && meal && !isEditing && (
          <button
            onClick={onEdit}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              background: 'rgba(108,142,255,0.1)', border: 'none',
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* ── Inline form ── */}
      {isEditing && (
        <div style={{ padding: 16, animation: 'mealFormIn 0.18s ease' }}>
          <style>{`@keyframes mealFormIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }`}</style>
          <AddMealForm
            initialData={meal ?? undefined}
            onSave={onSave}
            onCancel={onCancelEdit}
            saving={saving}
          />
        </div>
      )}

      {/* ── Meal content ── */}
      {!isEditing && meal && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Emoji + name + meta */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{meal.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18,
                color: 'var(--text)', lineHeight: 1.2,
              }}>
                {meal.meal_name}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                {meal.cook_time && <span style={{ fontSize: 12, color: 'var(--muted)' }}>⏱ {meal.cook_time}</span>}
                {meal.serves    && <span style={{ fontSize: 12, color: 'var(--muted)' }}>🍽 Serves {meal.serves}</span>}
              </div>
            </div>
          </div>

          {/* Who's cooking */}
          {meal.cooked_by && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: cookerColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif', flexShrink: 0,
              }}>
                {meal.cooked_by[0]}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{meal.cooked_by} cooking</span>
            </div>
          )}

          {/* Adults / kids split meals */}
          {!meal.same_for_all && (meal.adults_meal || meal.kids_meal) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {meal.adults_meal && (
                <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>Adults</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{meal.adults_meal}</div>
                </div>
              )}
              {meal.kids_meal && (
                <div style={{ background: 'var(--card2)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>Kids</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{meal.kids_meal}</div>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {visibleTags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {visibleTags.map(tag => {
                const s = TAG_COLORS[tag] ?? { bg: 'rgba(255,255,255,0.07)', color: 'var(--muted)' }
                return (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 9px',
                    borderRadius: 20, background: s.bg, color: s.color,
                  }}>
                    {tag}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!isEditing && !meal && (
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nothing planned</div>
          {isParent && (
            <button
              onClick={onEdit}
              style={{
                fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                background: 'rgba(108,142,255,0.1)', border: 'none',
                borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
              }}
            >
              + Add meal
            </button>
          )}
        </div>
      )}
    </div>
  )
}
