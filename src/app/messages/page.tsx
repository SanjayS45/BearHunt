import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'
import { BountyBadge } from '@/components/BountyBadge'

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const threads = await prisma.messageThread.findMany({
    where: { OR: [{ ownerId: userId }, { finderId: userId }] },
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

  // Group threads by the other participant; keep the most-recent-message thread first
  type Thread = typeof threads[number]
  const grouped = new Map<string, { other: Thread['owner']; threads: Thread[] }>()
  for (const t of threads) {
    const other = userId === t.ownerId ? t.finder : t.owner
    if (!grouped.has(other.id)) grouped.set(other.id, { other, threads: [] })
    grouped.get(other.id)!.threads.push(t)
  }
  // Sort each group so most-recently-messaged thread is first
  for (const g of grouped.values()) {
    g.threads.sort((a, b) => {
      const aTime = a.messages[0] ? new Date(a.messages[0].createdAt).getTime() : new Date(a.createdAt).getTime()
      const bTime = b.messages[0] ? new Date(b.messages[0].createdAt).getTime() : new Date(b.createdAt).getTime()
      return bTime - aTime
    })
  }
  const conversations = [...grouped.values()].sort((a, b) => {
    const aTop = a.threads[0]
    const bTop = b.threads[0]
    const aTime = aTop.messages[0] ? new Date(aTop.messages[0].createdAt).getTime() : new Date(aTop.createdAt).getTime()
    const bTime = bTop.messages[0] ? new Date(bTop.messages[0].createdAt).getTime() : new Date(bTop.createdAt).getTime()
    return bTime - aTime
  })

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={40} strokeWidth={1.5} className="mx-auto text-fog mb-3" />
          <p className="text-slate font-medium">No conversations yet</p>
          <p className="text-fog text-sm mt-1">Threads open when an owner approves a claim</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(({ other, threads: personThreads }) => {
            const topThread = personThreads[0]
            const lastMsg = topThread.messages[0]
            const isMe = lastMsg?.senderId === userId
            const extraCount = personThreads.length - 1

            return (
              <div key={other.id} className="bg-white rounded-xl border border-mist overflow-hidden">
                {/* Most recent thread — main tap target */}
                <Link href={`/messages/${topThread.id}`} className="block p-4 hover:bg-snow transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-snow border border-mist flex items-center justify-center text-sm font-bold text-slate flex-shrink-0">
                      {other.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-medium text-sm text-ink truncate">{other.name}</p>
                        <BountyBadge cents={topThread.claim.ticket.bountyAmountCents} size="sm" />
                      </div>
                      <p className="text-xs text-fog truncate">{topThread.claim.ticket.description}</p>
                      {lastMsg && (
                        <p className="text-xs text-fog mt-1 truncate">
                          {isMe ? 'You: ' : ''}{lastMsg.body}
                          <span className="ml-2">· {formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: true })}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Older threads with this person */}
                {extraCount > 0 && (
                  <div className="border-t border-mist divide-y divide-mist">
                    {personThreads.slice(1).map(t => (
                      <Link key={t.id} href={`/messages/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-snow transition-colors">
                        <p className="text-xs text-slate truncate flex-1">{t.claim.ticket.description}</p>
                        <BountyBadge cents={t.claim.ticket.bountyAmountCents} size="sm" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
