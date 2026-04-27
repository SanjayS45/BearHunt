import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MapPin } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { BountyBadge } from './BountyBadge'
import { StatusBadge } from './StatusBadge'
import { CategoryIcon } from './CategoryIcon'
import { categoryLabel } from '@/lib/utils'
import type { TicketWithOwner } from '@/types'

interface TicketCardProps {
  ticket: TicketWithOwner
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="block group">
      <Card className="hover:border-berkeley-blue/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {ticket.referencePhotoUrl ? (
              <img
                src={`/api/photo?path=${ticket.referencePhotoUrl}&bucket=reference-photos`}
                alt="Reference"
                className="flex-shrink-0 w-14 h-14 rounded-lg object-cover border border-mist"
              />
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-snow border border-mist flex items-center justify-center text-slate">
                <CategoryIcon category={ticket.category} size={20} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-ink text-sm leading-snug line-clamp-2 group-hover:text-berkeley-blue transition-colors">
                  {ticket.description}
                </p>
                <BountyBadge cents={ticket.bountyAmountCents} size="sm" className="flex-shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fog mt-2">
                <span className="flex items-center gap-1">
                  <MapPin size={12} strokeWidth={1.5} />
                  {ticket.generalArea}
                </span>
                <span>{categoryLabel(ticket.category)}</span>
                <span>{formatDistanceToNow(new Date(ticket.filedAt), { addSuffix: true })}</span>
              </div>

              {ticket.status !== 'active' && (
                <div className="mt-2">
                  <StatusBadge status={ticket.status} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
