import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/utils'
import { format } from 'date-fns'
import { DisputeResolveButton } from '@/components/DisputeResolveButton'
import Link from 'next/link'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) redirect('/')

  const [disputes, recentTickets, userCount] = await Promise.all([
    prisma.dispute.findMany({
      where: { status: 'open' },
      include: {
        claim: {
          include: {
            ticket: { include: { owner: { select: { id: true, name: true, email: true } } } },
            finder: { select: { id: true, name: true, email: true } },
          },
        },
        openedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ticket.count({ where: { status: 'active' } }),
    prisma.user.count(),
  ])

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-2">Admin Panel</h1>
      <p className="text-fog text-sm mb-6">BearHunt admin — {session.user.email}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-mist p-4">
          <p className="text-2xl font-bold text-ink">{recentTickets}</p>
          <p className="text-xs text-fog mt-1">Active tickets</p>
        </div>
        <div className="bg-white rounded-xl border border-mist p-4">
          <p className="text-2xl font-bold text-ink">{userCount}</p>
          <p className="text-xs text-fog mt-1">Total users</p>
        </div>
        <div className="bg-white rounded-xl border border-mist p-4">
          <p className={`text-2xl font-bold ${disputes.length > 0 ? 'text-danger' : 'text-ink'}`}>{disputes.length}</p>
          <p className="text-xs text-fog mt-1">Open disputes</p>
        </div>
      </div>

      <h2 className="font-semibold mb-4">Open Disputes</h2>

      {disputes.length === 0 ? (
        <div className="text-center py-12 text-fog border border-mist rounded-xl">
          <p>No open disputes 🎉</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(dispute => (
            <div key={dispute.id} className="bg-white rounded-xl border border-danger/30 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{dispute.claim.ticket.description}</p>
                  <p className="text-xs text-fog">{format(new Date(dispute.createdAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <span className="text-xs bg-red-50 text-danger border border-red-200 px-2 py-0.5 rounded">Open</span>
              </div>

              <div className="text-sm text-slate space-y-1">
                <p><strong>Owner:</strong> {dispute.claim.ticket.owner.name} ({dispute.claim.ticket.owner.email})</p>
                <p><strong>Finder:</strong> {dispute.claim.finder.name} ({dispute.claim.finder.email})</p>
                <p><strong>Opened by:</strong> {dispute.openedBy.name}</p>
                <p><strong>Reason:</strong> {dispute.reason}</p>
              </div>

              <div className="flex gap-2">
                <Link href={`/messages`} className="text-xs text-berkeley-blue hover:underline">View thread</Link>
              </div>

              <DisputeResolveButton disputeId={dispute.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
