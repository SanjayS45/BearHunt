import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, pending, completed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { stripeAccountId: true } }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, type: 'payout_finder', status: 'pending' },
      include: { ticket: { select: { id: true, description: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: session.user.id, type: 'payout_finder', status: 'completed' },
      include: { ticket: { select: { id: true, description: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    user,
    pending,
    completed,
    pendingCents: pending.reduce((s, t) => s + t.amountCents, 0),
    completedCents: completed.reduce((s, t) => s + t.amountCents, 0),
  })
}
