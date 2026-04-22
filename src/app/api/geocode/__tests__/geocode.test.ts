import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── unit tests (mocked fetch) ─────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token'

const { GET: suggest } = await import('../route')

function req(params: Record<string, string>) {
  const url = new URL('http://localhost/api/geocode')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

const SAMPLE_SUGGESTION = {
  mapbox_id: 'poi.abc123',
  name: 'Dwinelle Hall',
  full_address: 'South Dr, Berkeley, California 94720, United States',
  place_formatted: 'Berkeley, California 94720, United States',
  feature_type: 'poi',
}

describe('GET /api/geocode (suggest)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty when q is missing', async () => {
    const res = await suggest(req({}))
    expect((await res.json()).suggestions).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns empty when q is 1 character', async () => {
    const res = await suggest(req({ q: 'D' }))
    expect((await res.json()).suggestions).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('calls Mapbox SearchBox suggest endpoint', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ suggestions: [SAMPLE_SUGGESTION] }) })
    const res = await suggest(req({ q: 'Dwinelle', session: 'sess-1' }))
    const body = await res.json()

    expect(body.suggestions).toHaveLength(1)
    expect(body.suggestions[0].name).toBe('Dwinelle Hall')

    const url: string = mockFetch.mock.calls[0][0]
    expect(url).toContain('searchbox/v1/suggest')
    expect(url).toContain('q=Dwinelle')
    expect(url).toContain('session_token=sess-1')
    expect(url).toContain('access_token=test-token')
    expect(url).toContain('proximity=')
  })

  it('returns empty when Mapbox returns no suggestions', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ suggestions: [] }) })
    const res = await suggest(req({ q: 'xyznotaplace' }))
    expect((await res.json()).suggestions).toHaveLength(0)
  })

  it('returns empty (no crash) when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const res = await suggest(req({ q: 'Dwinelle' }))
    expect(res.status).toBe(200)
    expect((await res.json()).suggestions).toHaveLength(0)
  })
})

// ── retrieve unit tests ───────────────────────────────────────────────────

const { GET: retrieve } = await import('../retrieve/route')

function retrieveReq(params: Record<string, string>) {
  const url = new URL('http://localhost/api/geocode/retrieve')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url.toString())
}

describe('GET /api/geocode/retrieve', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when id is missing', async () => {
    const res = await retrieve(retrieveReq({}))
    expect(res.status).toBe(400)
  })

  it('returns lat/lng/name for a valid mapbox_id', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        features: [{
          geometry: { type: 'Point', coordinates: [-122.2595, 37.8719] },
          properties: { name: 'Dwinelle Hall', full_address: 'South Dr, Berkeley, CA 94720' },
        }],
      }),
    })
    const res = await retrieve(retrieveReq({ id: 'poi.abc123', session: 'sess-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lat).toBeCloseTo(37.8719)
    expect(body.lng).toBeCloseTo(-122.2595)
    expect(body.full_address).toBe('South Dr, Berkeley, CA 94720')

    const url: string = mockFetch.mock.calls[0][0]
    expect(url).toContain('searchbox/v1/retrieve/poi.abc123')
    expect(url).toContain('session_token=sess-1')
  })

  it('returns 404 when Mapbox returns no features', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ features: [] }) })
    const res = await retrieve(retrieveReq({ id: 'bad-id' }))
    expect(res.status).toBe(404)
  })

  it('returns 500 (no crash) when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network error'))
    const res = await retrieve(retrieveReq({ id: 'poi.abc123' }))
    expect(res.status).toBe(500)
  })
})

// ── live integration test (skipped unless MAPBOX_TOKEN_REAL is set) ───────

const REAL_TOKEN = process.env.MAPBOX_TOKEN_REAL
describe.skipIf(!REAL_TOKEN)('Mapbox SearchBox API — live', () => {
  it('suggest returns Dwinelle Hall for "Dwinelle"', async () => {
    vi.unstubAllGlobals()
    const session = 'test-session-' + Date.now()
    const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=Dwinelle&proximity=-122.2595,37.8719&country=US&language=en&limit=6&session_token=${session}&access_token=${REAL_TOKEN}`
    const res = await fetch(url)
    const data = await res.json()
    console.log('[live] suggest results:', data.suggestions?.slice(0, 3).map((s: { name: string }) => s.name))
    expect(res.ok).toBe(true)
    expect(data.suggestions?.length).toBeGreaterThan(0)
    expect(data.suggestions[0].name).toContain('Dwinelle')
    vi.stubGlobal('fetch', mockFetch)
  })

  it('retrieve returns coordinates for a Dwinelle Hall mapbox_id', async () => {
    vi.unstubAllGlobals()
    const session = 'test-session-' + Date.now()
    // First get the mapbox_id from suggest
    const suggestUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=Dwinelle+Hall&proximity=-122.2595,37.8719&country=US&session_token=${session}&access_token=${REAL_TOKEN}`
    const sr = await fetch(suggestUrl)
    const sd = await sr.json()
    const id = sd.suggestions?.[0]?.mapbox_id
    expect(id).toBeTruthy()

    const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(id)}?session_token=${session}&access_token=${REAL_TOKEN}`
    const rr = await fetch(retrieveUrl)
    const rd = await rr.json()
    const coords = rd.features?.[0]?.geometry?.coordinates
    console.log('[live] Dwinelle Hall coordinates:', coords)
    expect(coords).toHaveLength(2)
    // Should be near UC Berkeley (~37.87, ~-122.26)
    expect(coords[0]).toBeCloseTo(-122.26, 0)
    expect(coords[1]).toBeCloseTo(37.87, 0)
    vi.stubGlobal('fetch', mockFetch)
  })
})
