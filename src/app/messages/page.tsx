import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { BountyBadge } from '@/components/BountyBadge'
import { categoryLabel } from '@/lib/utils'

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const threads = await prisma.messageThread.findMany({
    where: {
      OR: [{ ownerId: session.user.id }, { finderId: session.user.id }],
    },
    include: {
      owner: { select: { id: true, name: true, avatarUrl: true } },
      finder: { select: { id: true, name: true, avatarUrl: true } },
      claim: {
        include: {
          ticket: { select: { id: true, description: true, bountyAmountCents: true, category: true } },
        },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Messages</h1>

      {threads.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={40} strokeWidth={1.5} className="mx-auto text-fog mb-3" />
          <p className="text-slate font-medium">No conversations yet</p>
          <p className="text-fog text-sm mt-1">Threads open when an owner approves a claim</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map(thread => {
            const other = session.user!.id === thread.ownerId ? thread.finder : thread.owner
            const lastMsg = thread.messages[0]
            const isMe = lastMsg?.senderId === session.user!.id
            return (
              <Link key={thread.id} href={`/messages/${thread.id}`} className="block">
                <div className="bg-white rounded-xl border border-mist p-4 hover:border-berkeley-blue/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-snow border border-mist flex items-center justify-center text-sm font-bold text-slate flex-shrink-0">
                      {other.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-medium text-sm text-ink truncate">{other.name}</p>
                        <BountyBadge cents={thread.claim.ticket.bountyAmountCents} size="sm" />
                      </div>
                      <p className="text-xs text-fog truncate line-clamp-1">
                        {thread.claim.ticket.description}
                      </p>
                      {lastMsg && (
                        <p className="text-xs text-fog mt-1 truncate">
                          {isMe ? 'You: ' : ''}{lastMsg.body}
                          <span className="ml-2">· {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
