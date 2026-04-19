interface MapViewProps {
  lat: number
  lng: number
  label?: string
  className?: string
}

export function MapView({ lat, lng, label, className = '' }: MapViewProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null

  const pin = `pin-s+003262(${lng},${lat})`
  const src = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${pin}/${lng},${lat},15,0/480x200@2x?access_token=${token}`

  return (
    <div className={`rounded-lg overflow-hidden border border-mist ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label ?? 'Map location'} className="w-full object-cover" />
      {label && (
        <div className="px-3 py-2 bg-snow text-xs text-slate flex items-center gap-1.5">
          <span>📍</span> {label}
        </div>
      )}
    </div>
  )
}
