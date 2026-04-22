import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'
import { formatCents } from '@/lib/utils'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      approvedClaim: { include: { finder: true } },
      owner: true,
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'found' || !ticket.approvedClaim) return NextResponse.json({ error: 'No approved claim to confirm' }, { status: 400 })
  if (!ticket.owner.stripeCustomerId) return NextResponse.json({ error: 'No payment method on file' }, { status: 400 })

  const finder = ticket.approvedClaim.finder
  const platformFee = Math.max(150, Math.floor(ticket.bountyAmountCents * 0.15))
  const finderPayout = ticket.bountyAmountCents - platformFee

  const setupIntent = await stripe.setupIntents.retrieve(ticket.stripePaymentIntentId!)
  const paymentMethodId = typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id

  if (!paymentMethodId) return NextResponse.json({ error: 'No saved payment method found' }, { status: 400 })

  // Charge the owner — money stays in platform account until finder cashes out
  const paymentIntent = await stripe.paymentIntents.create({
    amount: ticket.bountyAmountCents,
    currency: 'usd',
    customer: ticket.owner.stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    metadata: { type: 'bounty_capture', ticketId: ticket.id, claimId: ticket.approvedClaim.id },
  })

  const chargeId = typeof paymentIntent.latest_charge === 'string'
    ? paymentIntent.latest_charge
    : (paymentIntent.latest_charge?.id ?? null)

  await Promise.all([
    prisma.claim.update({ where: { id: ticket.approvedClaim.id }, data: { status: 'completed', completedAt: new Date() } }),
    prisma.ticket.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date() } }),
    prisma.transaction.createMany({
      data: [
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: finder.id, type: 'payout_finder', amountCents: finderPayout, status: 'pending', stripeChargeId: chargeId },
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: session.user.id, type: 'platform_fee', amountCents: platformFee, status: 'completed' },
      ],
    }),
    createNotification(finder.id, 'payout_sent', 'Bounty earned!', `${formatCents(finderPayout)} is ready to cash out in your earnings.`),
  ])

  return NextResponse.json({ success: true, payoutCents: finderPayout })
}
