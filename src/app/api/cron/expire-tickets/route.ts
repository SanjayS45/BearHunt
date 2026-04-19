import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { sendTicketExpiryNotification } from '@/lib/email'
import { createNotification } from '@/lib/notifications'
import { addDays, subDays } from 'date-fns'

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Expire tickets past their expiry date
  const expiredTickets = await prisma.ticket.findMany({
    where: { status: 'active', expiresAt: { lt: now } },
    include: { owner: true },
  })

  for (const ticket of expiredTickets) {
    if (ticket.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({ payment_intent: ticket.stripePaymentIntentId })
      } catch { /* already refunded or captured */ }
    }
    await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'expired' } })
    await createNotification(ticket.ownerId, 'ticket_expiring', 'Ticket expired', `Your ticket for "${ticket.description}" expired and your bounty has been refunded.`)
  }

  // Warn owners 3 days before expiry
  const warningDate = addDays(now, 3)
  const expiringTickets = await prisma.ticket.findMany({
    where: { status: 'active', expiresAt: { gte: now, lte: warningDate } },
    include: { owner: true },
  })

  for (const ticket of expiringTickets) {
    await Promise.all([
      createNotification(ticket.ownerId, 'ticket_expiring', 'Ticket expiring in 3 days', `Your ticket for "${ticket.description}" expires in 3 days. Log in to extend it.`),
      sendTicketExpiryNotification(ticket.owner.email, ticket.description),
    ])
  }

  return NextResponse.json({ expired: expiredTickets.length, warned: expiringTickets.length })
}
