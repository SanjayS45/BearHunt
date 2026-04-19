import { cn, formatCents, bountyColor } from '@/lib/utils'

interface BountyBadgeProps {
  cents: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BountyBadge({ cents, size = 'md', className }: BountyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold border rounded px-2',
        bountyColor(cents),
        size === 'sm' && 'text-sm py-0.5',
        size === 'md' && 'text-base py-1',
        size === 'lg' && 'text-2xl py-1 px-3',
        className
      )}
    >
      {formatCents(cents)}
    </span>
  )
}
