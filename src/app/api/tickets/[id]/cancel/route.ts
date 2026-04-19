import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { claims: { where: { status: 'approved' } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'active') return NextResponse.json({ error: 'Ticket is not active' }, { status: 400 })
  if (ticket.claims.length > 0) return NextResponse.json({ error: 'Cannot cancel — a claim is already approved' }, { status: 400 })

  // Cancel the SetupIntent so the saved card authorization is released
  if (ticket.stripePaymentIntentId) {
    try {
      await stripe.setupIntents.cancel(ticket.stripePaymentIntentId)
    } catch { /* already cancelled or expired */ }
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: 'cancelled' },
  })

  await createNotification(session.user.id, 'receipt_confirmed', 'Ticket cancelled', 'Your ticket has been cancelled. No charge was made.')

  return NextResponse.json({ ticket: updated })
}
