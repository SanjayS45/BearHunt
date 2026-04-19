'use client'
import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { Label } from './ui/label'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
const PROXIMITY = '-122.2595,37.8719'
const BBOX = '-122.2720,37.8650,-122.2470,37.8820'

interface Feature {
  id: string
  place_name: string
  center: [number, number]
}

interface LocationInputProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  label?: string
  placeholder?: string
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  placeholder = 'e.g. Dwinelle Hall, Room 155',
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<Feature[]>([])
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (container.current && !container.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(text: string) {
    onChange(text)
    if (debounce.current) clearTimeout(debounce.current)
    if (text.length < 2) { setSuggestions([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?proximity=${PROXIMITY}&bbox=${BBOX}&types=poi,address,neighborhood,place&access_token=${MAPBOX_TOKEN}`
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(data.features ?? [])
        setOpen(true)
      } catch { /* ignore */ }
    }, 300)
  }

  function select(feature: Feature) {
    const [lng, lat] = feature.center
    onChange(feature.place_name, lat, lng)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div className="space-y-1" ref={container}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <MapPin size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog pointer-events-none z-10" />
        <input
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-lg border border-mist bg-white pl-9 pr-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:border-berkeley-blue"
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-mist bg-white shadow-md max-h-52 overflow-y-auto">
            {suggestions.map(f => (
              <li
                key={f.id}
                onMouseDown={() => select(f)}
                className="flex items-start gap-2 px-3 py-2.5 text-sm text-ink hover:bg-snow cursor-pointer border-b border-mist last:border-0"
              >
                <MapPin size={13} strokeWidth={1.5} className="text-fog mt-0.5 flex-shrink-0" />
                <span className="leading-tight">{f.place_name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-fog">Type to search Berkeley locations</p>
    </div>
  )
}
