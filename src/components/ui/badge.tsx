import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-berkeley-blue text-white',
        secondary: 'border-mist bg-snow text-slate',
        success: 'border-green-200 bg-green-50 text-success',
        warning: 'border-amber-200 bg-amber-50 text-warning',
        danger: 'border-red-200 bg-red-50 text-danger',
        gold: 'border-yellow-300 bg-yellow-50 text-amber-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
