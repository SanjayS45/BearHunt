import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const claim = await prisma.claim.findUnique({
    where: { id: params.id },
    include: {
      finder: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
      ticket: { include: { owner: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } } } },
    },
  })
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isParticipant = claim.finderId === session.user.id || claim.ticket.ownerId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ claim })
}
