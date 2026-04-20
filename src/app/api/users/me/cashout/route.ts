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

  // Backfill any missing stripeChargeId by searching Stripe for the matching
  // bounty_capture PaymentIntent. This lets older transactions (created before
  // we captured the charge ID) use source_transaction, avoiding the 2-day
  // settlement hold on available balance.
  const resolved = await Promise.all(
    pending.map(async t => {
      if (t.stripeChargeId) return t
      const pis = await stripe.paymentIntents.search({
        query: `metadata['type']:'bounty_capture' AND metadata['ticketId']:'${t.ticketId}'`,
      })
      const pi = pis.data.find(p => p.status === 'succeeded')
      const chargeId = typeof pi?.latest_charge === 'string' ? pi.latest_charge : pi?.latest_charge?.id ?? null
      if (chargeId) {
        await prisma.transaction.update({ where: { id: t.id }, data: { stripeChargeId: chargeId } })
        return { ...t, stripeChargeId: chargeId }
      }
      return t
    })
  )

  const totalCents = resolved.reduce((s, t) => s + t.amountCents, 0)

  let transfers: { id: string }[]
  try {
    transfers = await Promise.all(
      resolved.map(t =>
        stripe.transfers.create({
          amount: t.amountCents,
          currency: 'usd',
          destination: user.stripeAccountId!,
          ...(t.stripeChargeId ? { source_transaction: t.stripeChargeId } : {}),
          metadata: { userId: user.id, transactionId: t.id },
        })
      )
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Transfer failed'
    return NextResponse.json({ error: `Stripe: ${msg}` }, { status: 400 })
  }

  await Promise.all(
    resolved.map((t, i) =>
      prisma.transaction.update({
        where: { id: t.id },
        data: { status: 'completed', stripeTransferId: transfers[i].id },
      })
    )
  )

  const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)

  return NextResponse.json({ success: true, transferredCents: totalCents, dashboardUrl: loginLink.url })
}
