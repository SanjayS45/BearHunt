import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addDays } from 'date-fns'

const updateSchema = z.object({
  bountyAmountCents: z.number().int().min(200).optional(),
  expiresAt: z.string().datetime().optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } },
      _count: { select: { claims: true } },
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ticket })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (ticket.status !== 'active') return NextResponse.json({ error: 'Ticket is not active' }, { status: 400 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const { bountyAmountCents, expiresAt } = parsed.data

  const data: Record<string, unknown> = {}
  if (bountyAmountCents && bountyAmountCents > ticket.bountyAmountCents) data.bountyAmountCents = bountyAmountCents
  if (expiresAt) data.expiresAt = addDays(new Date(), 30)

  const updated = await prisma.ticket.update({ where: { id }, data })
  return NextResponse.json({ ticket: updated })
}
