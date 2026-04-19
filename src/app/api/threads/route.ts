import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threads = await prisma.messageThread.findMany({
    where: {
      OR: [{ ownerId: session.user.id }, { finderId: session.user.id }],
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      finder: { select: { id: true, name: true, avatarUrl: true } },
      claim: {
        include: {
          ticket: { select: { id: true, description: true, bountyAmountCents: true, category: true } },
        },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ threads })
}
