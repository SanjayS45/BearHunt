import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'
import { sendPayoutNotification } from '@/lib/email'
import { formatCents } from '@/lib/utils'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      approvedClaim: { include: { finder: true } },
      owner: true,
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'found' || !ticket.approvedClaim) return NextResponse.json({ error: 'No approved claim to confirm' }, { status: 400 })

  const finder = ticket.approvedClaim.finder
  const finderPayout = Math.floor(ticket.bountyAmountCents * 0.85)
  const platformFee = ticket.bountyAmountCents - finderPayout

  if (!finder.stripeAccountId) {
    // Queue payout — finder must complete Connect onboarding
    await prisma.claim.update({
      where: { id: ticket.approvedClaim.id },
      data: { status: 'completed', completedAt: new Date() },
    })
    await prisma.ticket.update({
      where: { id: params.id },
      data: { status: 'resolved', resolvedAt: new Date() },
    })
    await createNotification(finder.id, 'payout_sent', 'Payout pending', 'Your payout is queued. Complete Stripe Connect setup to receive it.')
    return NextResponse.json({ queued: true, message: 'Payout queued — finder must complete Stripe Connect onboarding.' })
  }

  // Transfer 85% to finder via Stripe Connect
  const transfer = await stripe.transfers.create({
    amount: finderPayout,
    currency: 'usd',
    destination: finder.stripeAccountId,
    metadata: { ticketId: ticket.id, claimId: ticket.approvedClaim.id },
  })

  await Promise.all([
    prisma.claim.update({ where: { id: ticket.approvedClaim.id }, data: { status: 'completed', completedAt: new Date() } }),
    prisma.ticket.update({ where: { id: params.id }, data: { status: 'resolved', resolvedAt: new Date() } }),
    prisma.transaction.createMany({
      data: [
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: finder.id, type: 'payout_finder', amountCents: finderPayout, stripeTransferId: transfer.id, status: 'completed' },
        { ticketId: ticket.id, claimId: ticket.approvedClaim.id, userId: session.user.id, type: 'platform_fee', amountCents: platformFee, status: 'completed' },
      ],
    }),
    createNotification(finder.id, 'payout_sent', 'Payout incoming!', `${formatCents(finderPayout)} is on its way to your Stripe account.`),
    sendPayoutNotification(finder.email, formatCents(finderPayout)),
  ])

  return NextResponse.json({ success: true, payoutCents: finderPayout })
}
