import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id, type: 'payout_finder', status: 'completed' },
    include: { ticket: { select: { id: true, description: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const total = transactions.reduce((sum, t) => sum + t.amountCents, 0)

  return NextResponse.json({ transactions, totalCents: total })
}
