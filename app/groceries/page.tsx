'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GroceryItem {
  id: string
  name: string
  checked: boolean
  created_at: string
}

export default function GroceriesPage() {
  const [items, setItems]     = useState<GroceryItem[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState(false)

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('groceries')
      .select('*')
      .order('created_at')
    setItems((data as GroceryItem[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
    const ch = supabase
      .channel('groceries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groceries' }, fetchItems)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchItems])

  const addItem = async () => {
    const name = newName.trim()
    if (!name || adding) return
    setAdding(true)
    setNewName('')
    const { error } = await supabase.from('groceries').insert({ name })
    if (!error) await fetchItems()
    setAdding(false)
  }

  const toggleItem = async (item: GroceryItem) => {
    const checked = !item.checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked } : i))
    await supabase.from('groceries').update({ checked }).eq('id', item.id)
  }

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('groceries').delete().eq('id', id)
  }

  const clearCompleted = async () => {
    const ids = items.filter(i => i.checked).map(i => i.id)
    if (!ids.length) return
    setItems(prev => prev.filter(i => !i.checked))
    await supabase.from('groceries').delete().in('id', ids)
  }

  const unchecked = items.filter(i => !i.checked)
  const checked   = items.filter(i => i.checked)

  return (
    <div style={{ background: '#0D0F14', minHeight: '100dvh', fontFamily: "'Inter', sans-serif", width: '100%', overflowX: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#13151C',
        position: 'sticky',
        top: 0,
        zIndex: 10,
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
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18,
          color: '#F0F2F8', flex: 1,
        }}>
          Groceries
        </span>
        {checked.length > 0 && (
          <button
            onClick={clearCompleted}
            style={{
              fontSize: 12, fontWeight: 600, color: 'rgba(240,242,248,0.5)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Clear {checked.length} done
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{
        width: '100%', maxWidth: 560, margin: '0 auto',
        padding: '16px 20px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column', gap: 12,
        boxSizing: 'border-box',
      }}>

        {/* Add form */}
        <div style={{
          background: '#181B24', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 18, padding: 14,
          display: 'flex', gap: 8,
        }}>
          <input
            placeholder="Add item…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            style={{
              flex: 1, minWidth: 0, background: '#1E2130',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '11px 14px',
              color: '#F0F2F8', fontSize: 15,
              fontFamily: "'Inter', sans-serif",
              outline: 'none', WebkitAppearance: 'none',
            }}
          />
          <button
            onClick={addItem}
            disabled={!newName.trim() || adding}
            style={{
              background: newName.trim() && !adding ? '#6C8EFF' : 'rgba(108,142,255,0.3)',
              border: 'none', borderRadius: 12, padding: '11px 20px',
              color: 'white', fontSize: 15, fontWeight: 700,
              fontFamily: "'Syne', sans-serif",
              cursor: newName.trim() && !adding ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            Add
          </button>
        </div>

        {/* Empty state */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(240,242,248,0.4)', padding: 40, fontSize: 14 }}>
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🛒</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(240,242,248,0.4)' }}>Your list is empty</div>
            <div style={{ fontSize: 13, color: 'rgba(240,242,248,0.25)', marginTop: 6 }}>Type above to add your first item</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

            {/* Unchecked items */}
            {unchecked.map(item => (
              <GroceryRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
            ))}

            {/* Divider before checked items */}
            {unchecked.length > 0 && checked.length > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            )}

            {/* Checked items */}
            {checked.map(item => (
              <GroceryRow key={item.id} item={item} onToggle={toggleItem} onDelete={deleteItem} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GroceryRow({
  item,
  onToggle,
  onDelete,
}: {
  item: GroceryItem
  onToggle: (item: GroceryItem) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(item)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: '#181B24', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14, padding: '13px 14px',
        cursor: 'pointer',
        opacity: item.checked ? 0.5 : 1,
        transition: 'opacity 0.2s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Check circle */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        border: item.checked ? 'none' : '2px solid rgba(255,255,255,0.2)',
        background: item.checked ? '#34D399' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
      }}>
        {item.checked && (
          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Name */}
      <span style={{
        flex: 1, fontSize: 15, fontWeight: 500, color: '#F0F2F8',
        textDecoration: item.checked ? 'line-through' : 'none',
      }}>
        {item.name}
      </span>

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(item.id) }}
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'transparent', border: 'none',
          color: 'rgba(240,242,248,0.3)', fontSize: 18,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
