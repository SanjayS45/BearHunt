import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatWindow } from '@/components/ChatWindow'

export default async function ChatPage({ params }: { params: { threadId: string } }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const thread = await prisma.messageThread.findUnique({
    where: { id: params.threadId },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      finder: { select: { id: true, name: true, avatarUrl: true } },
      claim: {
        include: {
          ticket: { select: { id: true, description: true, bountyAmountCents: true, category: true, status: true } },
        },
      },
      messages: {
        include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread) notFound()

  const isParticipant = thread.ownerId === session.user.id || thread.finderId === session.user.id
  if (!isParticipant) redirect('/messages')

  return (
    <ChatWindow
      thread={thread}
      currentUserId={session.user.id!}
      initialMessages={thread.messages}
    />
  )
}
