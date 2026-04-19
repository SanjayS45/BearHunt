import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { MapPin, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BountyBadge } from '@/components/BountyBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { CategoryIcon } from '@/components/CategoryIcon'
import { categoryLabel } from '@/lib/utils'
import { TicketActions } from '@/components/TicketActions'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const [session, ticket] = await Promise.all([
    auth(),
    prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
        _count: { select: { claims: true } },
      },
    }),
  ])

  if (!ticket) notFound()

  const isOwner = session?.user?.id === ticket.ownerId
  const isLoggedIn = !!session?.user?.id

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-snow border border-mist flex items-center justify-center text-slate">
            <CategoryIcon category={ticket.category} size={24} />
          </div>
          <div>
            <p className="text-xs text-fog">{categoryLabel(ticket.category)}</p>
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        <BountyBadge cents={ticket.bountyAmountCents} size="lg" />
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-ink">{ticket.description}</h1>
          </div>

          <div className="space-y-2 text-sm text-slate">
            <div className="flex items-center gap-2">
              <MapPin size={15} strokeWidth={1.5} className="text-fog flex-shrink-0" />
              <span>Last seen near <strong>{ticket.generalArea}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={15} strokeWidth={1.5} className="text-fog flex-shrink-0" />
              <span>Lost {format(new Date(ticket.lostAt), 'EEEE, MMM d')} around {format(new Date(ticket.lostAt), 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={15} strokeWidth={1.5} className="text-fog flex-shrink-0" />
              <span>Posted {formatDistanceToNow(new Date(ticket.filedAt), { addSuffix: true })}</span>
            </div>
          </div>

          {ticket.referencePhotoUrl && (
            <div>
              <p className="text-xs text-fog mb-2 font-medium uppercase tracking-wide">Reference photo</p>
              <img
                src={`/api/photo?path=${ticket.referencePhotoUrl}&bucket=reference-photos`}
                alt="Reference"
                className="rounded-lg w-full max-h-64 object-cover border border-mist"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-fog">
        <div className="w-7 h-7 rounded-full bg-snow border border-mist flex items-center justify-center text-xs font-bold text-slate">
          {ticket.owner.name[0]}
        </div>
        <span>Posted by <strong className="text-slate">{ticket.owner.name}</strong></span>
        {ticket.owner.ratingAvg && (
          <span className="ml-1">· ⭐ {ticket.owner.ratingAvg.toFixed(1)}</span>
        )}
      </div>

      <TicketActions ticket={ticket} isOwner={isOwner} isLoggedIn={isLoggedIn} claimCount={ticket._count.claims} />
    </div>
  )
}
