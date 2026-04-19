import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const body = await request.text()
  const sig = (await headers()).get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      // Handle successful bounty capture (triggered from confirm-receipt)
      if (pi.metadata?.type === 'bounty_capture') {
        const ticketId = pi.metadata.ticketId
        const claimId = pi.metadata.claimId
        if (ticketId && claimId) {
          // Idempotent: only create if not already recorded
          const existing = await prisma.transaction.findFirst({
            where: { ticketId, type: 'escrow_hold' },
          })
          if (!existing) {
            const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
            if (ticket) {
              await prisma.transaction.create({
                data: {
                  ticketId,
                  claimId,
                  userId: ticket.ownerId,
                  type: 'escrow_hold',
                  amountCents: pi.amount,
                  status: 'completed',
                },
              })
            }
          }
        }
      }
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      if (pi.metadata?.type === 'bounty_capture') {
        const ticketId = pi.metadata.ticketId
        if (ticketId) {
          // Revert ticket back to found so owner can retry confirmation
          await prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'found' },
          })
        }
      }
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object
      const pi = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id
      if (pi) {
        const tx = await prisma.transaction.findFirst({
          where: { stripeTransferId: pi },
        })
        if (tx) {
          await prisma.transaction.create({
            data: {
              ticketId: tx.ticketId,
              userId: tx.userId,
              type: 'refund',
              amountCents: charge.amount_refunded,
              status: 'completed',
            },
          })
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
