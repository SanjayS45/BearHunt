import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notificationId } = await params
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } })
  if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notification.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  })

  return NextResponse.json({ notification: updated })
}
