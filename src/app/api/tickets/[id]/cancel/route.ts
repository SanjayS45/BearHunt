import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { claims: { where: { status: 'approved' } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'active') return NextResponse.json({ error: 'Ticket is not active' }, { status: 400 })
  if (ticket.claims.length > 0) return NextResponse.json({ error: 'Cannot cancel — a claim is already approved' }, { status: 400 })

  if (ticket.stripePaymentIntentId) {
    await stripe.refunds.create({ payment_intent: ticket.stripePaymentIntentId })
  }

  const updated = await prisma.ticket.update({
    where: { id: params.id },
    data: { status: 'cancelled' },
  })

  await createNotification(session.user.id, 'receipt_confirmed', 'Ticket cancelled', 'Your ticket has been cancelled and your bounty refunded.')

  return NextResponse.json({ ticket: updated })
}
