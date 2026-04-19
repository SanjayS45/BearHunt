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
      if (pi.metadata?.type === 'bounty_escrow') {
        const ticket = await prisma.ticket.findFirst({ where: { stripePaymentIntentId: pi.id } })
        if (ticket) {
          await prisma.transaction.create({
            data: {
              ticketId: ticket.id,
              userId: ticket.ownerId,
              type: 'escrow_hold',
              amountCents: pi.amount,
              status: 'completed',
            },
          })
        }
      }
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      const ticket = await prisma.ticket.findFirst({ where: { stripePaymentIntentId: pi.id } })
      if (ticket && ticket.status === 'active') {
        await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'cancelled' } })
      }
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object
      const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      if (pi) {
        const ticket = await prisma.ticket.findFirst({ where: { stripePaymentIntentId: pi } })
        if (ticket) {
          await prisma.transaction.create({
            data: {
              ticketId: ticket.id,
              userId: ticket.ownerId,
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
