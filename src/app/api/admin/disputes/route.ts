import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const disputes = await prisma.dispute.findMany({
    where: { status: 'open' },
    include: {
      claim: {
        include: {
          ticket: { include: { owner: { select: { id: true, name: true, email: true } } } },
          finder: { select: { id: true, name: true, email: true } },
        },
      },
      openedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ disputes })
}
