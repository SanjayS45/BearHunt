import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, type: { in: ['escrow_hold', 'refund'] } },
    include: { ticket: { select: { id: true, description: true, category: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ transactions })
}
