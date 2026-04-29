'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { categoryLabel } from '@/lib/utils'
import type { ItemCategory } from '@prisma/client'

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'water_bottle', label: 'Water Bottle' },
  { value: 'phone', label: 'Phone' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'keys', label: 'Keys' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'bag', label: 'Bag' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'book', label: 'Book' },
  { value: 'id_card', label: 'ID / Card' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'charger', label: 'Charger' },
  { value: 'other', label: 'Other' },
]

export function TicketFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    sp.delete('page')
    router.push(`?${sp.toString()}`)
  }

  const activeCategory = params.get('category')

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => update('category', '')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${!activeCategory ? 'bg-berkeley-blue text-white border-berkeley-blue' : 'border-mist text-slate hover:border-slate'}`}
        >
          All
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => update('category', activeCategory === c.value ? '' : c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors ${activeCategory === c.value ? 'bg-berkeley-blue text-white border-berkeley-blue' : 'border-mist text-slate hover:border-slate'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          key={params.get('q') ?? ''}
          placeholder="Describe what you found..."
          defaultValue={params.get('q') ?? ''}
          onBlur={e => update('q', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') update('q', (e.target as HTMLInputElement).value) }}
          className="flex-1 h-9 rounded-lg border border-mist bg-white px-3 text-sm text-ink placeholder:text-fog focus:outline-none focus:border-berkeley-blue"
        />

        <select
          value={params.get('sort') ?? 'newest'}
          onChange={e => update('sort', e.target.value)}
          className="h-9 rounded-lg border border-mist bg-white px-3 text-sm text-ink focus:outline-none focus:border-berkeley-blue"
        >
          <option value="newest">Newest</option>
          <option value="highest_bounty">Highest bounty</option>
        </select>
      </div>
    </div>
  )
}
