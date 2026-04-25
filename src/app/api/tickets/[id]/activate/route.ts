import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'pending_payment') return NextResponse.json({ ticket }) // already active, idempotent

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: 'active', expiresAt: addDays(new Date(), 30) },
  })

  return NextResponse.json({ ticket: updated })
}
