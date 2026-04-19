import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendClaimApprovedNotification, sendClaimRejectedNotification } from '@/lib/email'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { ticket: { include: { owner: true } }, finder: true },
  })
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (claim.ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (claim.status !== 'pending_review') return NextResponse.json({ error: 'Claim is not pending review' }, { status: 400 })
  if (claim.ticket.status !== 'active') return NextResponse.json({ error: 'Ticket is not active' }, { status: 400 })

  const [updatedClaim] = await prisma.$transaction([
    prisma.claim.update({ where: { id }, data: { status: 'approved', approvedAt: new Date() } }),
    prisma.claim.updateMany({
      where: { ticketId: claim.ticketId, id: { not: id }, status: 'pending_review' },
      data: { status: 'rejected' },
    }),
    prisma.ticket.update({
      where: { id: claim.ticketId },
      data: { status: 'found', approvedClaimId: id },
    }),
    prisma.messageThread.create({
      data: { claimId: id, ownerId: session.user.id, finderId: claim.finderId },
    }),
  ])

  const rejectedClaims = await prisma.claim.findMany({
    where: { ticketId: claim.ticketId, id: { not: id }, status: 'rejected' },
    include: { finder: true },
  })

  await Promise.all([
    createNotification(claim.finderId, 'claim_approved', 'Your claim was approved!', `The owner confirmed your find. Open the chat to coordinate the handoff.`, { ticketId: claim.ticketId, claimId: id }),
    sendClaimApprovedNotification(claim.finder.email, claim.ticket.description),
    ...rejectedClaims.map(rc =>
      Promise.all([
        createNotification(rc.finderId, 'claim_rejected', 'The owner approved a different claim', 'Thanks for looking! The owner went with another finder.', { ticketId: claim.ticketId }),
        sendClaimRejectedNotification(rc.finder.email, claim.ticket.description),
      ])
    ),
  ])

  return NextResponse.json({ claim: updatedClaim })
}
