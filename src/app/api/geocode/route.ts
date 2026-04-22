import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const PROXIMITY = '-122.2595,37.8719'

// Suggest endpoint — returns name suggestions for autocomplete.
// Uses Mapbox SearchBox API which has good Berkeley POI coverage.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const session = req.nextUrl.searchParams.get('session') ?? 'default'
  if (!q || q.length < 2) return NextResponse.json({ suggestions: [] })

  try {
    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(q)}&proximity=${PROXIMITY}&country=US&language=en&limit=6&session_token=${session}&access_token=${TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json({ suggestions: data.suggestions ?? [] })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
