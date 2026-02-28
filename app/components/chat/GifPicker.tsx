'use client'

import { useState, useEffect, useRef } from 'react'

const TENOR_KEY = 'LIVDSRZULELA'
const TENOR_BASE = 'https://tenor.googleapis.com/v2'

interface GifResult {
  id: string
  url: string
  preview: string
  title: string
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void
  onClose: () => void
}

export default function GifPicker({ onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchGifs = async (searchQuery: string) => {
    setLoading(true)
    try {
      const endpoint = searchQuery
        ? `${TENOR_BASE}/search?q=${encodeURIComponent(searchQuery)}&key=${TENOR_KEY}&limit=20&media_filter=gif`
        : `${TENOR_BASE}/featured?key=${TENOR_KEY}&limit=20&media_filter=gif`
      const res = await fetch(endpoint)
      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: GifResult[] = (data.results ?? []).map((r: any) => ({
        id: r.id,
        url: r.media_formats?.gif?.url ?? r.media_formats?.mediumgif?.url ?? '',
        preview: r.media_formats?.tinygif?.url ?? r.media_formats?.nanogif?.url ?? r.media_formats?.gif?.url ?? '',
        title: r.title ?? '',
      }))
      setGifs(results)
    } catch {
      setGifs([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGifs('')
  }, [])

  const handleSearch = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGifs(q), 400)
  }

  return (
    <div style={{
      background: '#1E2130',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      padding: 12,
      maxHeight: 300,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Search bar */}
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search GIFs..."
        style={{
          background: '#13151C',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '8px 14px',
          color: '#F0F2F8',
          fontSize: 14,
          outline: 'none',
          marginBottom: 10,
          flexShrink: 0,
          fontFamily: 'Inter, sans-serif',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      {/* GIF grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        alignContent: 'start',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}>
        {loading ? (
          <div style={{
            gridColumn: '1/-1', textAlign: 'center',
            padding: '24px 0', color: 'rgba(240,242,248,0.4)', fontSize: 13,
          }}>
            Loading GIFs...
          </div>
        ) : gifs.length === 0 ? (
          <div style={{
            gridColumn: '1/-1', textAlign: 'center',
            padding: '24px 0', color: 'rgba(240,242,248,0.4)', fontSize: 13,
          }}>
            No GIFs found
          </div>
        ) : (
          gifs.map(gif => (
            <div
              key={gif.id}
              onMouseDown={e => { e.preventDefault(); onSelect(gif.url) }}
              style={{
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                background: '#13151C',
                aspectRatio: '4/3',
                flexShrink: 0,
              }}
            >
              <img
                src={gif.preview}
                alt={gif.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            </div>
          ))
        )}
      </div>

      {/* Tenor attribution */}
      <div style={{
        textAlign: 'center', fontSize: 10,
        color: 'rgba(240,242,248,0.3)', marginTop: 8, flexShrink: 0,
      }}>
        Powered by Tenor
      </div>
    </div>
  )
}
