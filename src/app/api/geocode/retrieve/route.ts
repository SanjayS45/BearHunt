import { NextRequest, NextResponse } from 'next/server'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Retrieve endpoint — fetches full coordinates for a selected suggestion.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const session = req.nextUrl.searchParams.get('session') ?? 'default'
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(id)}?session_token=${session}&access_token=${TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      name: feature.properties?.name ?? '',
      full_address: feature.properties?.full_address ?? feature.properties?.name ?? '',
      lng: feature.geometry.coordinates[0] as number,
      lat: feature.geometry.coordinates[1] as number,
    })
  } catch {
    return NextResponse.json({ error: 'Retrieve failed' }, { status: 500 })
  }
}
