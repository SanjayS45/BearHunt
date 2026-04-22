interface MapViewProps {
  lat: number
  lng: number
  label?: string
  className?: string
}

export function MapView({ lat, lng, label, className = '' }: MapViewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  // Zoom 13 = ~1 mile view. No pin marker — exact location is intentionally hidden.
  const src = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${lng},${lat},13,0/480x220@2x?access_token=${token}`

  return (
    <div className={`rounded-lg overflow-hidden border border-mist ${className}`}>
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="General area" className="w-full object-cover" />

        {/* Radar overlay — centered on the map image which is centered on lat/lng */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Outermost pulse ring */}
          <div className="absolute w-28 h-28 rounded-full bg-berkeley-blue/10 animate-ping" style={{ animationDuration: '2s' }} />
          {/* Outer static ring */}
          <div className="absolute w-24 h-24 rounded-full bg-berkeley-blue/10 border border-berkeley-blue/20" />
          {/* Middle ring */}
          <div className="absolute w-14 h-14 rounded-full bg-berkeley-blue/15 border border-berkeley-blue/30" />
          {/* Inner ring */}
          <div className="absolute w-7 h-7 rounded-full bg-berkeley-blue/25 border border-berkeley-blue/40" />
          {/* Center dot */}
          <div className="w-3 h-3 rounded-full bg-berkeley-blue border-2 border-white shadow" />
        </div>
      </div>

      <div className="px-3 py-2 bg-snow text-xs text-slate flex items-center gap-1.5">
        <span>📍</span>
        <span>{label ? `Near ${label}` : 'General area shown'}</span>
        <span className="ml-auto text-fog italic">Exact location hidden</span>
      </div>
    </div>
  )
}
