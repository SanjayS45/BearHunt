import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

  if (!user.stripeAccountId) {
    return NextResponse.json({ error: 'Set up payouts first before cashing out' }, { status: 400 })
  }

  const pending = await prisma.transaction.findMany({
    where: { userId: session.user.id, type: 'payout_finder', status: 'pending' },
  })

  if (pending.length === 0) {
    return NextResponse.json({ error: 'No pending earnings to cash out' }, { status: 400 })
  }

  const totalCents = pending.reduce((s, t) => s + t.amountCents, 0)

  // One transfer per pending transaction, using source_transaction to bypass
  // Stripe's 2-day settlement hold when the charge ID is available
  const transfers = await Promise.all(
    pending.map(t =>
      stripe.transfers.create({
        amount: t.amountCents,
        currency: 'usd',
        destination: user.stripeAccountId!,
        ...(t.stripeChargeId ? { source_transaction: t.stripeChargeId } : {}),
        metadata: { userId: user.id, transactionId: t.id },
      })
    )
  )

  await Promise.all(
    pending.map((t, i) =>
      prisma.transaction.update({
        where: { id: t.id },
        data: { status: 'completed', stripeTransferId: transfers[i].id },
      })
    )
  )

  return NextResponse.json({ success: true, transferredCents: totalCents })
}
