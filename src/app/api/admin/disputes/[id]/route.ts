import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { isAdmin } from '@/lib/utils'
import { z } from 'zod'

const schema = z.object({
  resolution: z.enum(['upheld', 'reversed', 'cancelled']),
  notes: z.string().max(1000).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      claim: {
        include: {
          ticket: { include: { owner: true } },
          finder: true,
        },
      },
    },
  })
  if (!dispute) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { resolution, notes } = parsed.data
  const statusMap = {
    upheld: 'resolved_upheld',
    reversed: 'resolved_reversed',
    cancelled: 'resolved_cancelled',
  } as const

  await prisma.dispute.update({
    where: { id },
    data: { status: statusMap[resolution], resolution: notes, resolvedAt: new Date() },
  })

  if (resolution === 'reversed') {
    // Find the capture PaymentIntent from transaction records (stripeTransferId stores the PI id)
    const captureTx = await prisma.transaction.findFirst({
      where: { ticketId: dispute.claim.ticketId, type: 'payout_finder', status: 'completed' },
    })
    if (captureTx?.stripeTransferId) {
      try {
        await stripe.refunds.create({ payment_intent: captureTx.stripeTransferId })
      } catch { /* may already be refunded */ }
    }
    await prisma.ticket.update({ where: { id: dispute.claim.ticketId }, data: { status: 'cancelled' } })
  } else if (resolution === 'cancelled') {
    await prisma.ticket.update({ where: { id: dispute.claim.ticketId }, data: { status: 'active', approvedClaimId: null } })
    await prisma.claim.update({ where: { id: dispute.claimId }, data: { status: 'cancelled' } })
  }

  await Promise.all([
    prisma.notification.create({ data: { userId: dispute.claim.ticket.ownerId, type: 'dispute_resolved', title: 'Dispute resolved', body: `Admin has resolved the dispute on your ticket.` } }),
    prisma.notification.create({ data: { userId: dispute.claim.finderId, type: 'dispute_resolved', title: 'Dispute resolved', body: `Admin has resolved the dispute on your claim.` } }),
  ])

  return NextResponse.json({ success: true })
}
