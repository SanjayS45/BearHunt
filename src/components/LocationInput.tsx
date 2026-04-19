'use client'
import { MapPin } from 'lucide-react'
import { Input } from './ui/input'
import { Label } from './ui/label'

const CAMPUS_LOCATIONS = [
  'Dwinelle Hall', 'Moffitt Library', 'Main Stacks Library', 'Sather Gate',
  'Sproul Plaza', 'Memorial Glade', 'Evans Hall', 'Doe Library',
  'Haas Pavilion', 'RSF (Recreational Sports Facility)', 'Eshleman Hall',
  'Wheeler Hall', 'Hearst Memorial Mining Building', 'Cory Hall',
  'Soda Hall', 'Stanley Hall', 'Li Ka Shing Center', 'Barrows Hall',
  'Kroeber Hall', 'Valley Life Sciences Building', 'Campanile / Sather Tower',
  'Lower Sproul', 'Upper Sproul', 'Unit 1 / 2 / 3 Dorms', 'Clark Kerr Campus',
  'Foothill Student Housing', 'Crossroads', 'Café 3', 'Other / Freeform',
]

interface LocationInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
}

export function LocationInput({
  value,
  onChange,
  label = 'Location',
  placeholder = 'e.g. Dwinelle Hall, Room 155',
}: LocationInputProps) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <MapPin size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          list="campus-locations"
          className="pl-9"
        />
      </div>
      <datalist id="campus-locations">
        {CAMPUS_LOCATIONS.map(loc => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
      <p className="text-xs text-fog">Start typing or pick a campus location</p>
    </div>
  )
}
