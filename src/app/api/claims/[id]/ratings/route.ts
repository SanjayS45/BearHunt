import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const claim = await prisma.claim.findUnique({
    where: { id },
    include: { ticket: true },
  })
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (claim.status !== 'completed') return NextResponse.json({ error: 'Can only rate completed claims' }, { status: 400 })

  const isParticipant = claim.finderId === session.user.id || claim.ticket.ownerId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const ratedId = session.user.id === claim.finderId ? claim.ticket.ownerId : claim.finderId

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const rating = await prisma.rating.create({
    data: { claimId: id, raterId: session.user.id, ratedId, ...parsed.data },
  })

  const agg = await prisma.rating.aggregate({ where: { ratedId }, _avg: { score: true }, _count: true })
  await prisma.user.update({
    where: { id: ratedId },
    data: { ratingAvg: agg._avg.score ?? null, ratingCount: agg._count },
  })

  await prisma.notification.create({
    data: { userId: ratedId, type: 'rating_received', title: 'New rating received', body: `You received a ${parsed.data.score}-star rating.` },
  })

  return NextResponse.json({ rating }, { status: 201 })
}
