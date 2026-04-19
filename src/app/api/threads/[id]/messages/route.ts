import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hasBlockedContent } from '@/lib/utils'
import { createNotification } from '@/lib/notifications'
import { sendMessageNotification } from '@/lib/email'
import { z } from 'zod'

const sendSchema = z.object({ body: z.string().min(1).max(2000) })

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thread = await prisma.messageThread.findUnique({ where: { id: params.id } })
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isParticipant = thread.ownerId === session.user.id || thread.finderId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50

  const messages = await prisma.message.findMany({
    where: { threadId: params.id },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  // Mark unread messages as read
  await prisma.message.updateMany({
    where: { threadId: params.id, senderId: { not: session.user.id }, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ messages })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const thread = await prisma.messageThread.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      finder: { select: { id: true, name: true, email: true } },
    },
  })
  if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (thread.status !== 'active') return NextResponse.json({ error: 'Thread is closed' }, { status: 400 })

  const isParticipant = thread.ownerId === session.user.id || thread.finderId === session.user.id
  if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (hasBlockedContent(parsed.data.body)) {
    return NextResponse.json({
      error: 'For your safety, please keep all communication on BearHunt. Phone numbers, links, and social handles are not allowed.',
    }, { status: 400 })
  }

  const message = await prisma.message.create({
    data: { threadId: params.id, senderId: session.user.id, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })

  const recipientId = session.user.id === thread.ownerId ? thread.finderId : thread.ownerId
  const recipient = session.user.id === thread.ownerId ? thread.finder : thread.owner
  const sender = session.user.id === thread.ownerId ? thread.owner : thread.finder

  await Promise.all([
    createNotification(recipientId, 'new_message', `Message from ${sender.name}`, parsed.data.body.slice(0, 100), { threadId: params.id }),
    sendMessageNotification(recipient.email, sender.name),
  ])

  return NextResponse.json({ message }, { status: 201 })
}
