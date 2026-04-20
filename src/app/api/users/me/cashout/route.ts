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

  const transfer = await stripe.transfers.create({
    amount: totalCents,
    currency: 'usd',
    destination: user.stripeAccountId,
    metadata: { userId: user.id },
  })

  await prisma.transaction.updateMany({
    where: { id: { in: pending.map(t => t.id) } },
    data: { status: 'completed', stripeTransferId: transfer.id },
  })

  return NextResponse.json({ success: true, transferredCents: totalCents })
}
