import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const PROXIMITY = '-122.2595,37.8719'
const BBOX = '-122.2720,37.8650,-122.2470,37.8820'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) return NextResponse.json({ features: [] })

  try {
    const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(q)}&proximity=${PROXIMITY}&bbox=${BBOX}&types=poi,address,neighborhood,place&access_token=${TOKEN}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()
    return NextResponse.json({ features: data.features ?? [] })
  } catch {
    return NextResponse.json({ features: [] })
  }
}
