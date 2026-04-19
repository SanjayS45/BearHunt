import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { formatDistanceToNow } from 'date-fns'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { BountyBadge } from '@/components/BountyBadge'
import { ClaimActions } from '@/components/ClaimActions'

export default async function ClaimsReviewPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      claims: {
        include: {
          finder: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
        },
        orderBy: { foundAt: 'desc' },
      },
    },
  })

  if (!ticket) notFound()
  if (ticket.ownerId !== session.user.id) redirect(`/tickets/${params.id}`)

  const pendingClaims = ticket.claims.filter(c => c.status === 'pending_review')
  const otherClaims = ticket.claims.filter(c => c.status !== 'pending_review')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Review Claims</h1>
          <p className="text-slate text-sm">{ticket.description}</p>
        </div>
        <BountyBadge cents={ticket.bountyAmountCents} />
      </div>

      {pendingClaims.length === 0 && otherClaims.length === 0 && (
        <div className="text-center py-12 text-fog">
          <p className="font-medium text-slate">No claims yet</p>
          <p className="text-sm mt-1">Finders will appear here once they submit proof</p>
        </div>
      )}

      {pendingClaims.length > 0 && (
        <div className="space-y-4 mb-8">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-fog">Pending Review</h2>
          {pendingClaims.map(claim => (
            <Card key={claim.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-snow border border-mist flex items-center justify-center text-sm font-bold text-slate">
                      {claim.finder.name[0]}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{claim.finder.name}</p>
                      {claim.finder.ratingAvg && <p className="text-xs text-fog">⭐ {claim.finder.ratingAvg.toFixed(1)}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-fog">{formatDistanceToNow(new Date(claim.foundAt), { addSuffix: true })}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-slate">
                  <MapPin size={14} strokeWidth={1.5} className="text-fog" />
                  {claim.foundLocation}
                </div>

                {claim.finderNote && (
                  <p className="text-sm text-slate italic">&ldquo;{claim.finderNote}&rdquo;</p>
                )}

                {claim.proofPhotoUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {claim.proofPhotoUrls.map((url, i) => (
                      <img
                        key={i}
                        src={`/api/photo?path=${url}&bucket=proof-photos`}
                        alt=""
                        className="aspect-square object-cover rounded-lg border border-mist"
                      />
                    ))}
                  </div>
                )}

                <ClaimActions claimId={claim.id} ticketId={params.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {otherClaims.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-fog">Previous Claims</h2>
          {otherClaims.map(claim => (
            <div key={claim.id} className="flex items-center justify-between py-2 border-b border-mist">
              <span className="text-sm text-slate">{claim.finder.name}</span>
              <StatusBadge status={claim.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
