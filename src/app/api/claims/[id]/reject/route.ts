import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendClaimRejectedNotification } from '@/lib/email'

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claim = await prisma.claim.findUnique({
    where: { id: params.id },
    include: { ticket: true, finder: true },
  })
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (claim.ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (claim.status !== 'pending_review') return NextResponse.json({ error: 'Claim is not pending review' }, { status: 400 })

  const updated = await prisma.claim.update({ where: { id: params.id }, data: { status: 'rejected' } })

  await Promise.all([
    createNotification(claim.finderId, 'claim_rejected', 'Claim not approved', `The owner said this isn't their item. Thanks for looking!`, { ticketId: claim.ticketId }),
    sendClaimRejectedNotification(claim.finder.email, claim.ticket.description),
  ])

  return NextResponse.json({ claim: updated })
}
