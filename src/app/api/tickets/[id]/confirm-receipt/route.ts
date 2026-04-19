import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'
import { sendPayoutNotification } from '@/lib/email'
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
  const finderPayout = Math.floor(ticket.bountyAmountCents * 0.85)
  const platformFee = ticket.bountyAmountCents - finderPayout

  // Retrieve the SetupIntent to get the saved payment method
  const setupIntent = await stripe.setupIntents.retrieve(ticket.stripePaymentIntentId!)
  const paymentMethodId = typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id

  if (!paymentMethodId) return NextResponse.json({ error: 'No saved payment method found' }, { status: 400 })

  if (!finder.stripeAccountId) {
    // Charge card but queue payout — finder must complete Connect onboarding first
    await stripe.paymentIntents.create({
      amount: ticket.bountyAmountCents,
      currency: 'usd',
      customer: ticket.owner.stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: { type: 'bounty_capture', ticketId: ticket.id, claimId: ticket.approvedClaim.id },
    })

    await Promise.all([
      prisma.claim.update({ where: { id: ticket.approvedClaim.id }, data: { status: 'completed', completedAt: new Date() } }),
      prisma.ticket.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date() } }),
      prisma.transaction.create({
        data: { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: finder.id, type: 'payout_finder', amountCents: finderPayout, status: 'pending' },
      }),
      createNotification(finder.id, 'payout_sent', 'Payout pending', 'Your payout is queued. Complete Stripe Connect setup to receive it.'),
    ])
    return NextResponse.json({ queued: true, message: 'Payout queued — finder must complete Stripe Connect onboarding.' })
  }

  // Charge card and immediately transfer 85% to finder via destination charge
  const pi = await stripe.paymentIntents.create({
    amount: ticket.bountyAmountCents,
    currency: 'usd',
    customer: ticket.owner.stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,
    off_session: true,
    transfer_data: {
      destination: finder.stripeAccountId,
      amount: finderPayout,
    },
    metadata: { type: 'bounty_capture', ticketId: ticket.id, claimId: ticket.approvedClaim.id },
  })

  await Promise.all([
    prisma.claim.update({ where: { id: ticket.approvedClaim.id }, data: { status: 'completed', completedAt: new Date() } }),
    prisma.ticket.update({ where: { id }, data: { status: 'resolved', resolvedAt: new Date() } }),
    prisma.transaction.createMany({
      data: [
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: finder.id, type: 'payout_finder', amountCents: finderPayout, stripeTransferId: pi.id, status: 'completed' },
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: session.user.id, type: 'platform_fee', amountCents: platformFee, status: 'completed' },
      ],
    }),
    createNotification(finder.id, 'payout_sent', 'Payout incoming!', `${formatCents(finderPayout)} is on its way to your Stripe account.`),
    sendPayoutNotification(finder.email, formatCents(finderPayout)),
  ])

  return NextResponse.json({ success: true, payoutCents: finderPayout })
}
