import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { checkTicketRateLimit } from '@/lib/ratelimit'
import { z } from 'zod'
import { addDays } from 'date-fns'
import type { ItemCategory } from '@prisma/client'
import { moderateText } from '@/lib/moderation'

const createSchema = z.object({
  description: z.string().min(1).max(500),
  category: z.enum(['water_bottle','phone','wallet','keys','clothing','bag','electronics','book','id_card','headphones','charger','other']),
  generalArea: z.string().min(2).max(100),
  lostAt: z.string().datetime(),
  bountyAmountCents: z.number().int().min(200),
  referencePhotoUrl: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') as ItemCategory | null
  const area = searchParams.get('area')
  const minBounty = searchParams.get('min_bounty')
  const maxBounty = searchParams.get('max_bounty')
  const sort = searchParams.get('sort') ?? 'newest'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  const where: Record<string, unknown> = { status: 'active' }
  if (category) where.category = category
  if (area) where.generalArea = { contains: area, mode: 'insensitive' }
  if (minBounty) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), gte: parseInt(minBounty) }
  if (maxBounty) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), lte: parseInt(maxBounty) }

  const orderBy = sort === 'highest_bounty'
    ? { bountyAmountCents: 'desc' as const }
    : { filedAt: 'desc' as const }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { owner: { select: { id: true, name: true, avatarUrl: true, ratingAvg: true, ratingCount: true } } },
    }),
    prisma.ticket.count({ where }),
  ])

  return NextResponse.json({ tickets, total, page, limit })
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allowed = await checkTicketRateLimit(session.user.id)
    if (!allowed) return NextResponse.json({ error: 'Rate limit: max 5 tickets per day' }, { status: 429 })

    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })

    const { description, category, generalArea, lostAt, bountyAmountCents, referencePhotoUrl } = parsed.data

    const moderation = await moderateText(description)
    if (!moderation.allowed) {
      return NextResponse.json({ error: moderation.reason ?? 'Inappropriate content.' }, { status: 400 })
    }

    // Ensure Stripe customer exists (clear stale test-mode IDs if needed)
    let user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
    if (user.stripeCustomerId) {
      try {
        await stripe.customers.retrieve(user.stripeCustomerId)
      } catch (e: unknown) {
        const stripeErr = e as { code?: string; message?: string }
        if (stripeErr.code === 'resource_missing' || stripeErr.message?.includes('No such customer')) {
          user = await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } })
        } else throw e
      }
    }
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined })
      user = await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } })
    }

    // SetupIntent: saves card for later charge, does NOT charge now
    const setupIntent = await stripe.setupIntents.create({
      customer: user.stripeCustomerId!,
      usage: 'off_session',
      metadata: { type: 'bounty_setup' },
    })

    const filedAt = new Date()
    const ticket = await prisma.ticket.create({
      data: {
        ownerId: session.user.id,
        category,
        description,
        generalArea,
        lostAt: new Date(lostAt),
        referencePhotoUrl: referencePhotoUrl || null,
        bountyAmountCents,
        stripePaymentIntentId: setupIntent.id,
        filedAt,
        expiresAt: addDays(filedAt, 30),
      },
    })

    return NextResponse.json({ ticket, clientSecret: setupIntent.client_secret }, { status: 201 })
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string }
    console.error('[POST /api/tickets]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to create ticket' }, { status: 500 })
  }
}
