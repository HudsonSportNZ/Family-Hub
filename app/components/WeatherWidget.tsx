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
const CACHE_TTL = 15 * 60 * 1000
const REFRESH_INTERVAL = 15 * 60 * 1000
const API_URL = '/api/weather'

function getWeatherInfo(id: number): { label: string; emoji: string } {
  if (id === 800)               return { label: 'Clear Sky',     emoji: '☀️' }
  if (id === 801)               return { label: 'Mainly Clear',  emoji: '🌤️' }
  if (id === 802)               return { label: 'Partly Cloudy', emoji: '⛅' }
  if (id === 803 || id === 804) return { label: 'Overcast',      emoji: '☁️' }
  if (id >= 200 && id < 300)   return { label: 'Thunderstorm',  emoji: '⛈️' }
  if (id >= 300 && id < 400)   return { label: 'Drizzle',       emoji: '🌦️' }
  if (id >= 500 && id < 600)   return { label: 'Rain',          emoji: '🌧️' }
  if (id >= 600 && id < 700)   return { label: 'Snowfall',      emoji: '❄️' }
  if (id >= 700 && id < 800)   return { label: 'Foggy',         emoji: '🌫️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

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

const WS_STYLES = `
  .ws-strip {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 14px 14px 12px;
  }
  .ws-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .ws-left { display: flex; align-items: baseline; gap: 10px; }
  .ws-temp { font-size: 30px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
  .ws-cond { font-size: 13px; font-weight: 500; color: var(--text); }
  .ws-loc  { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .ws-right { text-align: right; flex-shrink: 0; }
  .ws-hilow { font-size: 12px; color: var(--muted); line-height: 1.6; }
  .ws-hilow strong { color: var(--text); font-weight: 600; }
  .ws-wind { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .ws-refresh {
    background: none; border: none; cursor: pointer; padding: 0;
    line-height: 1; margin-top: 4px; display: block; margin-left: auto;
    opacity: 0.35; transition: opacity 0.2s;
  }
  .ws-refresh:hover { opacity: 0.7; }
  .ws-forecast { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .ws-slot {
    background: var(--card2);
    border-radius: 10px;
    padding: 10px 6px 8px;
    text-align: center;
  }
  .ws-slot-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 4px;
  }
  .ws-slot-icon { font-size: 18px; display: block; margin-bottom: 4px; }
  .ws-slot-temp { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; }
  .ws-age { font-size: 9px; color: rgba(255,255,255,0.22); margin-top: 8px; text-align: right; }
  @keyframes wsSpin { to { transform: rotate(360deg); } }
  @keyframes wsSkeleton { 0%,100%{opacity:.4} 50%{opacity:.7} }
  .ws-skel { border-radius: 8px; background: rgba(255,255,255,0.1); animation: wsSkeleton 1.5s ease-in-out infinite; }
`

export default function WeatherWidget() {
  const [weather, setWeather]     = useState<OWMResponse | null>(_cache)
  const [loading, setLoading]     = useState(_cache === null)
  const [error, setError]         = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(_cache ? new Date(_cacheTs) : null)
  const [ageLabel, setAgeLabel]   = useState(_cache ? fmtAge(new Date(_cacheTs)) : '')
  const [spinning, setSpinning]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doFetch = useCallback((showSpinner = false) => {
    if (!showSpinner && _cache && Date.now() - _cacheTs < CACHE_TTL) {
      setWeather(_cache)
      setLoading(false)
      return { abort: () => {} }
    }
    if (showSpinner) setSpinning(true)
    const controller = new AbortController()
    fetch(API_URL, { signal: controller.signal })
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

  useEffect(() => {
    const controller = doFetch()
    timerRef.current = setInterval(() => doFetch(), REFRESH_INTERVAL)
    return () => {
      controller.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [doFetch])

  useEffect(() => {
    if (!fetchedAt) return
    const tick = setInterval(() => setAgeLabel(fmtAge(fetchedAt)), 60000)
    return () => clearInterval(tick)
  }, [fetchedAt])

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="ws-strip">
        <style>{WS_STYLES}</style>
        <div className="ws-top">
          <div className="ws-left">
            <div className="ws-skel" style={{ width: 64, height: 30 }} />
            <div>
              <div className="ws-skel" style={{ width: 90, height: 13, marginBottom: 5 }} />
              <div className="ws-skel" style={{ width: 70, height: 11 }} />
            </div>
          </div>
          <div>
            <div className="ws-skel" style={{ width: 60, height: 12, marginBottom: 5 }} />
            <div className="ws-skel" style={{ width: 70, height: 11 }} />
          </div>
        </div>
        <div className="ws-forecast">
          {[0, 1, 2].map(i => (
            <div key={i} className="ws-skel" style={{ height: 80, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    )
  }

  /* ── Error state ── */
  if (error || !weather) {
    return (
      <div className="ws-strip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 100 }}>
        <style>{WS_STYLES}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🌡️</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Weather unavailable</div>
          <button
            onClick={() => doFetch(true)}
            style={{
              marginTop: 10, padding: '5px 14px', borderRadius: 20,
              background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)',
              color: '#60a5fa', fontSize: 12, cursor: 'pointer',
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
  const wind = Math.round(current.wind_speed * 3.6)

  const timeSlots = [
    { label: 'Morning',   temp: Math.round(daily[0].temp.morn), icon: findSlotIcon(hourly, 8)  },
    { label: 'Afternoon', temp: Math.round(daily[0].temp.day),  icon: findSlotIcon(hourly, 13) },
    { label: 'Evening',   temp: Math.round(daily[0].temp.eve),  icon: findSlotIcon(hourly, 19) },
  ]

  return (
    <div className="ws-strip">
      <style>{WS_STYLES}</style>

      <div className="ws-top">
        <div className="ws-left">
          <div className="ws-temp">{temp}°</div>
          <div>
            <div className="ws-cond">{emoji} {label}</div>
            <div className="ws-loc">📍 Petone, NZ</div>
          </div>
        </div>
        <div className="ws-right">
          <div className="ws-hilow">H <strong>{high}°</strong> · L <strong>{low}°</strong></div>
          <div className="ws-wind">💨 {wind} km/h</div>
          <button
            className="ws-refresh"
            onClick={() => doFetch(true)}
            title="Refresh weather"
          >
            <span style={{
              fontSize: 14, display: 'inline-block',
              animation: spinning ? 'wsSpin 0.8s linear infinite' : 'none',
            }}>↻</span>
          </button>
        </div>
      </div>

      <div className="ws-forecast">
        {timeSlots.map(slot => (
          <div className="ws-slot" key={slot.label}>
            <div className="ws-slot-label">{slot.label}</div>
            <span className="ws-slot-icon">{slot.icon}</span>
            <div className="ws-slot-temp">{slot.temp}°</div>
          </div>
        ))}
      </div>

      {ageLabel && <div className="ws-age">Updated {ageLabel}</div>}
    </div>
  )
}
