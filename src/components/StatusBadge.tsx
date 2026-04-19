import { cn, statusLabel, statusColor } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
        statusColor(status),
        className
      )}
    >
      {statusLabel(status)}
    </span>
  )
}
