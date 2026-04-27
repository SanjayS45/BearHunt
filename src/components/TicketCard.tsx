'use client'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MapPin } from 'lucide-react'
import { BountyBadge } from './BountyBadge'
import { StatusBadge } from './StatusBadge'
import { CategoryIcon } from './CategoryIcon'
import { categoryLabel } from '@/lib/utils'
import type { TicketWithOwner } from '@/types'

export function TicketCard({ ticket }: { ticket: TicketWithOwner }) {
  return (
    <Link href={`/tickets/${ticket.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-mist overflow-hidden hover:shadow-md hover:border-berkeley-blue/30 transition-all">
        {/* Image area */}
        <div className="relative w-full aspect-square bg-snow flex items-center justify-center overflow-hidden">
          {ticket.referencePhotoUrl ? (
            <img
              src={`/api/photo?path=${ticket.referencePhotoUrl}&bucket=reference-photos`}
              alt={ticket.description}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-fog">
              <CategoryIcon category={ticket.category} size={40} />
              <span className="text-xs font-medium">{categoryLabel(ticket.category)}</span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <BountyBadge cents={ticket.bountyAmountCents} size="sm" />
          </div>
          {ticket.status !== 'active' && (
            <div className="absolute top-2 left-2">
              <StatusBadge status={ticket.status} />
            </div>
          )}
        </div>

        {/* Info area */}
        <div className="p-3">
          <p className="font-semibold text-sm text-ink line-clamp-2 leading-snug group-hover:text-berkeley-blue transition-colors">
            {ticket.description}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-fog">
            <MapPin size={11} strokeWidth={1.5} className="flex-shrink-0" />
            <span className="truncate">{ticket.generalArea}</span>
          </div>
          <p className="text-xs text-fog mt-0.5">
            {formatDistanceToNow(new Date(ticket.filedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Link>
  )
}
