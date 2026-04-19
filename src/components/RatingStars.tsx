'use client'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value?: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: number
}

export function RatingStars({ value = 0, onChange, readonly = false, size = 20 }: RatingStarsProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn('focus:outline-none', !readonly && 'hover:scale-110 transition-transform')}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={cn(
              star <= value ? 'fill-gold text-gold' : 'text-fog fill-none'
            )}
          />
        </button>
      ))}
    </div>
  )
}
