'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface OWMResponse {
  current: {
    temp: number
    weather: { id: number; description: string }[]
    wind_speed: number // m/s
  }
  hourly: { dt: number; weather: { id: number }[] }[]
  daily: { temp: { min: number; max: number; morn: number; day: number; eve: number } }[]
}

// Module-level cache — survives component remounts within the same session
let _cache: OWMResponse | null = null
let _cacheTs = 0
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes
const REFRESH_INTERVAL = 15 * 60 * 1000

const API_URL = '/api/weather'

function getWeatherInfo(id: number): { label: string; emoji: string } {
  if (id === 800)              return { label: 'Clear Sky',     emoji: '☀️' }
  if (id === 801)              return { label: 'Mainly Clear',  emoji: '🌤️' }
  if (id === 802)              return { label: 'Partly Cloudy', emoji: '⛅' }
  if (id === 803 || id === 804) return { label: 'Overcast',    emoji: '☁️' }
  if (id >= 200 && id < 300)  return { label: 'Thunderstorm',  emoji: '⛈️' }
  if (id >= 300 && id < 400)  return { label: 'Drizzle',       emoji: '🌦️' }
  if (id >= 500 && id < 600)  return { label: 'Rain',          emoji: '🌧️' }
  if (id >= 600 && id < 700)  return { label: 'Snowfall',      emoji: '❄️' }
  if (id >= 700 && id < 800)  return { label: 'Foggy',         emoji: '🌫️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

// Find the emoji for a time slot: match today's NZ date + target hour in hourly data.
// Falls back to current conditions (hourly[0]) if that hour has already passed.
function findSlotIcon(hourly: OWMResponse['hourly'], targetHour: number): string {
  const todayNZ = new Date().toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })
  const match = hourly.find(h => {
    const dateNZ = new Date(h.dt * 1000).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Auckland' })
    const hour   = parseInt(new Date(h.dt * 1000).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', hour12: false }), 10)
    return dateNZ === todayNZ && hour === targetHour
  })
  return getWeatherInfo((match ?? hourly[0]).weather[0].id).emoji
}

function fmtAge(fetchedAt: Date): string {
  const mins = Math.floor((Date.now() - fetchedAt.getTime()) / 60000)
  if (mins < 1)   return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} mins ago`
}

export default function WeatherWidget() {
  const [weather, setWeather]     = useState<OWMResponse | null>(_cache)
  const [loading, setLoading]     = useState(_cache === null)
  const [error, setError]         = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(_cache ? new Date(_cacheTs) : null)
  const [ageLabel, setAgeLabel]   = useState(_cache ? fmtAge(new Date(_cacheTs)) : '')
  const [spinning, setSpinning]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doFetch = useCallback((showSpinner = false) => {
    // Use cache if fresh and not manually triggered
    if (!showSpinner && _cache && Date.now() - _cacheTs < CACHE_TTL) {
      setWeather(_cache)
      setLoading(false)
      return { abort: () => {} }
    }

    const url = API_URL
    if (showSpinner) setSpinning(true)
    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`)
        return r.json() as Promise<OWMResponse>
      })
      .then(data => {
        _cache = data
        _cacheTs = Date.now()
        setWeather(data)
        setError(false)
        setLoading(false)
        const now = new Date()
        setFetchedAt(now)
        setAgeLabel(fmtAge(now))
        if (showSpinner) setSpinning(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(true)
          setLoading(false)
          if (showSpinner) setSpinning(false)
        }
      })
    return controller
  }, [])

  /* Initial fetch + 15-min auto-refresh */
  useEffect(() => {
    const controller = doFetch()
    timerRef.current = setInterval(() => doFetch(), REFRESH_INTERVAL)
    return () => {
      controller.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [doFetch])

  /* Tick the "X mins ago" label every minute */
  useEffect(() => {
    if (!fetchedAt) return
    const tick = setInterval(() => setAgeLabel(fmtAge(fetchedAt)), 60000)
    return () => clearInterval(tick)
  }, [fetchedAt])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="weather-hero">
        <style>{`
          @keyframes wSkeleton { 0%,100%{opacity:.4} 50%{opacity:.7} }
          .wskel { border-radius: 8px; background: rgba(255,255,255,0.1); animation: wSkeleton 1.5s ease-in-out infinite; }
        `}</style>
        <div className="weather-top">
          <div>
            <div className="wskel" style={{ width: 76, height: 52, marginBottom: 8 }} />
            <div className="wskel" style={{ width: 120, height: 13, marginBottom: 6 }} />
            <div className="wskel" style={{ width: 80, height: 11, marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="wskel" style={{ width: 36, height: 30 }} />
              <div className="wskel" style={{ width: 36, height: 30 }} />
              <div className="wskel" style={{ width: 52, height: 30 }} />
            </div>
          </div>
          <div className="wskel" style={{ width: 64, height: 64, borderRadius: 12 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="wskel" style={{ flex: 1, height: 66, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (error || !weather) {
    return (
      <div className="weather-hero" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌡️</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Weather unavailable</div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 4 }}>Check your connection</div>
          <button
            onClick={() => doFetch(true)}
            style={{
              marginTop: 12, padding: '6px 16px', borderRadius: 20,
              background: 'rgba(108,142,255,0.15)', border: '1px solid rgba(108,142,255,0.3)',
              color: '#6C8EFF', fontSize: 12, cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const { current, hourly, daily } = weather
  const { label, emoji } = getWeatherInfo(current.weather[0].id)
  const temp = Math.round(current.temp)
  const high = Math.round(daily[0].temp.max)
  const low  = Math.round(daily[0].temp.min)
  const wind = Math.round(current.wind_speed * 3.6) // m/s → km/h

  const timeSlots = [
    { label: 'Morning',   temp: Math.round(daily[0].temp.morn), icon: findSlotIcon(hourly, 8)  },
    { label: 'Afternoon', temp: Math.round(daily[0].temp.day),  icon: findSlotIcon(hourly, 13) },
    { label: 'Evening',   temp: Math.round(daily[0].temp.eve),  icon: findSlotIcon(hourly, 19) },
  ]

  return (
    <div className="weather-hero">
      {/* Main row */}
      <div className="weather-top">
        <div>
          <div className="weather-temp">{temp}°</div>
          <div className="weather-desc">{label}</div>
          <div className="weather-loc">📍 Petone, NZ</div>
          <div className="weather-stats">
            <div>
              <div className="wstat-val">{high}°</div>
              <div className="wstat-lbl">High</div>
            </div>
            <div>
              <div className="wstat-val">{low}°</div>
              <div className="wstat-lbl">Low</div>
            </div>
            <div>
              <div className="wstat-val">{wind} km/h</div>
              <div className="wstat-lbl">Wind</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="weather-icon-big">{emoji}</div>
          {/* Tap to refresh */}
          <button
            onClick={() => doFetch(true)}
            title="Refresh weather"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, lineHeight: 1,
              opacity: spinning ? 1 : 0.35,
              transition: 'opacity 0.2s',
            }}
          >
            <span style={{
              fontSize: 14,
              display: 'inline-block',
              animation: spinning ? 'wSpin 0.8s linear infinite' : 'none',
            }}>↻</span>
          </button>
        </div>
      </div>

      {/* Time-of-day forecast */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {timeSlots.map(slot => (
          <div
            key={slot.label}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '10px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 5 }}>{slot.icon}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'white' }}>
              {slot.temp}°
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 3 }}>
              {slot.label}
            </div>
          </div>
        ))}
      </div>

      {/* Last updated */}
      {ageLabel && (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 10, textAlign: 'right' }}>
          Updated {ageLabel}
        </div>
      )}

      <style>{`
        @keyframes wSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
