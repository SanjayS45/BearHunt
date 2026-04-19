import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendDisputeNotification } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({ reason: z.string().min(10).max(1000) })

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { ticket: { include: { owner: true } }, finder: true },
  })
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isParticipant = claim.finderId === session.user.id || claim.ticket.ownerId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const dispute = await prisma.dispute.create({
    data: { claimId: id, openedById: session.user.id, reason: parsed.data.reason },
  })

  await Promise.all([
    prisma.claim.update({ where: { id }, data: { status: 'disputed' } }),
    prisma.ticket.update({ where: { id: claim.ticketId }, data: { status: 'disputed' } }),
    createNotification(claim.ticket.ownerId, 'dispute_opened', 'A dispute has been opened', 'Admin will review and reach out shortly.', { claimId: id }),
    createNotification(claim.finderId, 'dispute_opened', 'A dispute has been opened', 'Admin will review and reach out shortly.', { claimId: id }),
    sendDisputeNotification(claim.ticket.owner.email, 'owner'),
    sendDisputeNotification(claim.finder.email, 'finder'),
  ])

  return NextResponse.json({ dispute }, { status: 201 })
}
