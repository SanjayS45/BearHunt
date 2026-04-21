import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, pending, completed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { stripeAccountId: true } }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, type: 'payout_finder', status: 'pending' },
      include: { ticket: { select: { id: true, description: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, type: 'payout_finder', status: 'completed' },
      include: { ticket: { select: { id: true, description: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Get real available_on dates from Stripe balance transactions.
  // fundsAvailableAt is the latest date across all pending transactions —
  // cashout is only possible once all funds have settled.
  let fundsAvailableAt: string | null = null
  if (pending.length > 0) {
    const availableDates = await Promise.all(
      pending.map(async t => {
        if (t.stripeChargeId) {
          try {
            const charge = await stripe.charges.retrieve(t.stripeChargeId, {
              expand: ['balance_transaction'],
            })
            const bt = charge.balance_transaction
            if (bt && typeof bt === 'object' && 'available_on' in bt) {
              return new Date((bt as { available_on: number }).available_on * 1000)
            }
          } catch {
            // fall through to createdAt-based fallback
          }
        }
        // Fallback when no stripeChargeId: 2 days after creation
        return new Date(new Date(t.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000)
      })
    )
    const maxDate = availableDates.reduce((a, b) => (a > b ? a : b))
    fundsAvailableAt = maxDate.toISOString()
  }

  return NextResponse.json({
    user,
    pending,
    completed,
    pendingCents: pending.reduce((s, t) => s + t.amountCents, 0),
    completedCents: completed.reduce((s, t) => s + t.amountCents, 0),
    fundsAvailableAt,
  })
}
