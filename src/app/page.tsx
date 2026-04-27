import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import { TicketCard } from '@/components/TicketCard'
import { TicketFilters } from '@/components/TicketFilters'
import { categoryLabel } from '@/lib/utils'
import type { ItemCategory } from '@prisma/client'
import { Search } from 'lucide-react'

const CATEGORIES: ItemCategory[] = [
  'water_bottle','phone','wallet','keys','clothing','bag',
  'electronics','book','id_card','headphones','charger','other',
]

export default async function BountyBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; area?: string; min?: string; max?: string; sort?: string; page?: string }>
}) {
  const sp = await searchParams
  const page = parseInt(sp.page ?? '1')
  const limit = 20
  const category = sp.category as ItemCategory | undefined
  const sort = sp.sort ?? 'newest'

  const where: Record<string, unknown> = { status: 'active' }
  if (category && CATEGORIES.includes(category)) where.category = category
  if (sp.area) where.generalArea = { contains: sp.area, mode: 'insensitive' }
  if (sp.min) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), gte: parseInt(sp.min) }
  if (sp.max) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), lte: parseInt(sp.max) }

  const orderBy = sort === 'highest_bounty' ? { bountyAmountCents: 'desc' as const } : { filedAt: 'desc' as const }

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Bounty Board</h1>
        <p className="text-slate text-sm mt-1">{total} active {total === 1 ? 'item' : 'items'} lost on campus</p>
      </div>

      <Suspense fallback={null}>
        <TicketFilters />
      </Suspense>

      <div className="mt-4">
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} strokeWidth={1.5} className="mx-auto text-fog mb-3" />
            <p className="text-slate font-medium">No active bounties</p>
            <p className="text-fog text-sm mt-1">Be the first to post a lost item!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <a href={`?page=${page - 1}`} className="px-4 py-2 rounded-lg border border-mist text-sm hover:bg-snow transition-colors">
              Previous
            </a>
          )}
          {page * limit < total && (
            <a href={`?page=${page + 1}`} className="px-4 py-2 rounded-lg border border-mist text-sm hover:bg-snow transition-colors">
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
