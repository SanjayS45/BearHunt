'use client'
import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { Label } from './ui/label'

interface Suggestion {
  mapbox_id: string
  name: string
  full_address: string
  place_formatted: string
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [retrieving, setRetrieving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const container = useRef<HTMLDivElement>(null)
  // Session token stays constant per component mount — required by Mapbox SearchBox API
  const session = useRef(typeof crypto !== 'undefined' ? crypto.randomUUID() : 'fallback-session')

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
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(text)}&session=${session.current}`)
        const data = await res.json()
        const items: Suggestion[] = data.suggestions ?? []
        setSuggestions(items)
        setOpen(items.length > 0)
      } catch { /* ignore */ }
    }, 300)
  }

  async function select(s: Suggestion) {
    setOpen(false)
    setSuggestions([])
    setRetrieving(true)
    onChange(s.full_address || s.name) // optimistic text update
    try {
      const res = await fetch(`/api/geocode/retrieve?id=${encodeURIComponent(s.mapbox_id)}&session=${session.current}`)
      const data = await res.json()
      if (data.lat && data.lng) {
        onChange(data.full_address || s.full_address || s.name, data.lat, data.lng)
      }
    } catch { /* ignore — text already set, just no coordinates */ }
    setRetrieving(false)
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
          disabled={retrieving}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-mist bg-white shadow-md max-h-52 overflow-y-auto">
            {suggestions.map(s => (
              <li
                key={s.mapbox_id}
                onMouseDown={() => select(s)}
                className="flex items-start gap-2 px-3 py-2.5 text-sm text-ink hover:bg-snow cursor-pointer border-b border-mist last:border-0"
              >
                <MapPin size={13} strokeWidth={1.5} className="text-fog mt-0.5 flex-shrink-0" />
                <div className="leading-tight">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-fog">{s.place_formatted}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-fog">Type to search Berkeley locations</p>
    </div>
  )
}
