'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface WeatherData {
  current: {
    temperature_2m: number
    weathercode: number
    wind_speed_10m: number
  }
  daily: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
  }
}

function getWeatherInfo(code: number): { label: string; emoji: string } {
  if (code === 0)  return { label: 'Clear Sky',     emoji: '☀️' }
  if (code === 1)  return { label: 'Mainly Clear',  emoji: '🌤️' }
  if (code === 2)  return { label: 'Partly Cloudy', emoji: '⛅' }
  if (code === 3)  return { label: 'Overcast',      emoji: '☁️' }
  if (code <= 49)  return { label: 'Foggy',         emoji: '🌫️' }
  if (code <= 57)  return { label: 'Drizzle',       emoji: '🌦️' }
  if (code <= 67)  return { label: 'Rain',          emoji: '🌧️' }
  if (code <= 77)  return { label: 'Snowfall',      emoji: '❄️' }
  if (code <= 82)  return { label: 'Rain Showers',  emoji: '🌦️' }
  if (code <= 86)  return { label: 'Snow Showers',  emoji: '🌨️' }
  if (code <= 99)  return { label: 'Thunderstorm',  emoji: '⛈️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

function fmtAge(fetchedAt: Date): string {
  const mins = Math.floor((Date.now() - fetchedAt.getTime()) / 60000)
  if (mins < 1)  return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} mins ago`
}

const REFRESH_INTERVAL = 10 * 60 * 1000 // 10 minutes

const API_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=-41.2247&longitude=174.8775' +
  '&current=temperature_2m,weathercode,wind_speed_10m' +
  '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum' +
  '&timezone=Pacific/Auckland'

export default function WeatherWidget() {
  const [weather, setWeather]     = useState<WeatherData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  const [ageLabel, setAgeLabel]   = useState('')
  const [spinning, setSpinning]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doFetch = useCallback((showSpinner = false) => {
    if (showSpinner) setSpinning(true)
    const controller = new AbortController()
    fetch(API_URL, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('fetch failed')
        return r.json() as Promise<WeatherData>
      })
      .then(data => {
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

  /* Initial fetch + 10-min auto-refresh */
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

  const { current, daily } = weather
  const { label, emoji } = getWeatherInfo(current.weathercode)
  const temp  = Math.round(current.temperature_2m)
  const high  = Math.round(daily.temperature_2m_max[0])
  const low   = Math.round(daily.temperature_2m_min[0])
  const wind  = Math.round(current.wind_speed_10m)

  /* Derive time-of-day estimates from daily min/max */
  const range     = high - low
  const morning   = Math.round(low  + range * 0.15)
  const afternoon = high
  const evening   = Math.round(low  + range * 0.55)

  const timeSlots = [
    { label: 'Morning',   temp: morning,   icon: '🌅' },
    { label: 'Afternoon', temp: afternoon, icon: '☀️' },
    { label: 'Evening',   temp: evening,   icon: '🌆' },
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
