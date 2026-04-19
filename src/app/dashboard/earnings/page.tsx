import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { formatCents, categoryLabel } from '@/lib/utils'
import { ConnectButton } from '@/components/ConnectButton'

export default async function EarningsPage({ searchParams }: { searchParams: { connect?: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, transactions] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, type: 'payout_finder', status: 'completed' },
      include: { ticket: { select: { id: true, description: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const total = transactions.reduce((s, t) => s + t.amountCents, 0)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Earnings</h1>

      {!user.stripeAccountId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-warning mb-2">Set up payouts to receive bounty earnings</p>
          <p className="text-xs text-slate mb-3">Connect your bank account via Stripe to receive payouts when you return items.</p>
          <ConnectButton />
        </div>
      )}

      {searchParams.connect === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-success font-medium">Stripe Connect set up successfully! You can now receive payouts.</p>
        </div>
      )}

      <div className="bg-berkeley-blue text-white rounded-xl p-5 mb-6">
        <p className="text-sm text-white/70">Total earned</p>
        <p className="text-3xl font-bold mt-1">{formatCents(total)}</p>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-12 text-fog">
          <p className="text-slate font-medium">No earnings yet</p>
          <p className="text-sm mt-1">Browse the bounty board to start finding items</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-mist overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-snow border-b border-mist">
              <tr>
                <th className="text-left px-4 py-3 text-fog font-medium">Item</th>
                <th className="text-left px-4 py-3 text-fog font-medium">Date</th>
                <th className="text-right px-4 py-3 text-fog font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-snow transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink truncate max-w-[200px]">{t.ticket.description}</p>
                    <p className="text-xs text-fog">{categoryLabel(t.ticket.category)}</p>
                  </td>
                  <td className="px-4 py-3 text-slate">{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-right font-bold text-success">{formatCents(t.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
