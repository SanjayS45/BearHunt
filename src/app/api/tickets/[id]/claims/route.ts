import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendClaimNotification } from '@/lib/email'
import { checkClaimRateLimit } from '@/lib/ratelimit'
import { z } from 'zod'
import { moderateText } from '@/lib/moderation'

const createSchema = z.object({
  proofPhotoUrls: z.array(z.string()).min(1).max(5),
  foundLocation: z.string().min(2).max(200),
  foundLocationLat: z.number().optional(),
  foundLocationLng: z.number().optional(),
  finderNote: z.string().max(500).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.ownerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const claims = await prisma.claim.findMany({
    where: { ticketId: id },
    include: { finder: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } } },
    orderBy: { foundAt: 'desc' },
  })

  return NextResponse.json({ claims })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: { owner: true } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.status !== 'active') return NextResponse.json({ error: 'Ticket is not active' }, { status: 400 })
  if (ticket.ownerId === session.user.id) return NextResponse.json({ error: 'Cannot claim your own ticket' }, { status: 400 })

  const allowed = await checkClaimRateLimit(session.user.id)
  if (!allowed) return NextResponse.json({ error: 'Rate limit: max 10 claims per day' }, { status: 429 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

  const textToCheck = [parsed.data.finderNote, parsed.data.foundLocation].filter(Boolean).join(' ')
  const moderation = await moderateText(textToCheck)
  if (!moderation.allowed) return NextResponse.json({ error: moderation.reason ?? 'Inappropriate content.' }, { status: 400 })

  const claim = await prisma.claim.create({
    data: { ticketId: id, finderId: session.user.id, ...parsed.data },
  })

  await Promise.all([
    createNotification(ticket.ownerId, 'new_claim', 'Someone found your item!', `A finder submitted proof for your "${ticket.description}" ticket.`, { ticketId: ticket.id, claimId: claim.id }),
    sendClaimNotification(ticket.owner.email, ticket.description),
  ])

  return NextResponse.json({ claim }, { status: 201 })
}
