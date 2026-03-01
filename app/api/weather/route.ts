import { NextResponse } from 'next/server'

const OWM_URL =
  'https://api.openweathermap.org/data/3.0/onecall' +
  '?lat=-41.2274&lon=174.8850' +
  '&exclude=minutely,alerts' +
  '&units=metric'

export async function GET() {
  const key = process.env.NEXT_PUBLIC_WEATHER_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const res = await fetch(`${OWM_URL}&appid=${key}`, {
    next: { revalidate: 900 }, // Vercel edge cache for 15 min
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'OWM request failed' }, { status: res.status })
  }

  return NextResponse.json(await res.json())
}
