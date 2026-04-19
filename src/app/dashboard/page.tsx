import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { TicketCard } from '@/components/TicketCard'
import { StatusBadge } from '@/components/StatusBadge'
import { BountyBadge } from '@/components/BountyBadge'
import { categoryLabel } from '@/lib/utils'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { tab: tabParam } = await searchParams
  const tab = tabParam ?? 'tickets'

  const [myTickets, myClaims, earnings] = await Promise.all([
    prisma.ticket.findMany({
      where: { ownerId: session.user.id },
      include: { owner: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } } },
      orderBy: { filedAt: 'desc' },
    }),
    prisma.claim.findMany({
      where: { finderId: session.user.id },
      include: {
        ticket: { select: { id: true, description: true, bountyAmountCents: true, category: true, generalArea: true } },
      },
      orderBy: { foundAt: 'desc' },
    }),
    prisma.transaction.aggregate({
      where: { userId: session.user.id, type: 'payout_finder', status: 'completed' },
      _sum: { amountCents: true },
    }),
  ])

  const tabs = [
    { id: 'tickets', label: `My Tickets (${myTickets.length})` },
    { id: 'claims', label: `My Claims (${myClaims.length})` },
    { id: 'earnings', label: 'Earnings' },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Dashboard</h1>

      <div className="flex gap-1 border-b border-mist mb-6">
        {tabs.map(t => (
          <Link
            key={t.id}
            href={`/dashboard?tab=${t.id}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-berkeley-blue text-berkeley-blue'
                : 'border-transparent text-fog hover:text-slate'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'tickets' && (
        <div className="space-y-3">
          {myTickets.length === 0 ? (
            <div className="text-center py-12 text-fog">
              <p className="text-slate font-medium">No tickets yet</p>
              <Link href="/tickets/new" className="mt-3 inline-block text-sm text-berkeley-blue hover:underline">Post your first ticket →</Link>
            </div>
          ) : (
            myTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
          )}
        </div>
      )}

      {tab === 'claims' && (
        <div className="space-y-3">
          {myClaims.length === 0 ? (
            <div className="text-center py-12 text-fog">
              <p className="text-slate font-medium">No claims yet</p>
              <Link href="/" className="mt-3 inline-block text-sm text-berkeley-blue hover:underline">Browse the bounty board →</Link>
            </div>
          ) : (
            myClaims.map(claim => (
              <Link key={claim.id} href={`/tickets/${claim.ticket.id}`} className="block">
                <div className="bg-white rounded-xl border border-mist p-4 hover:border-berkeley-blue/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-ink truncate">{claim.ticket.description}</p>
                      <p className="text-xs text-fog mt-0.5">{claim.ticket.generalArea}</p>
                      <p className="text-xs text-fog">{formatDistanceToNow(new Date(claim.foundAt), { addSuffix: true })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <BountyBadge cents={claim.ticket.bountyAmountCents} size="sm" />
                      <StatusBadge status={claim.status} />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'earnings' && (
        <div>
          <div className="bg-berkeley-blue text-white rounded-xl p-5 mb-6">
            <p className="text-sm text-white/70">Total earnings</p>
            <p className="text-3xl font-bold mt-1">${((earnings._sum.amountCents ?? 0) / 100).toFixed(2)}</p>
          </div>
          <Link href="/dashboard/earnings">
            <div className="bg-white rounded-xl border border-mist p-4 hover:border-berkeley-blue/40 transition-colors text-sm font-medium text-berkeley-blue">
              View full earnings history & payouts →
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
