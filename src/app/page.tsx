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
  searchParams: { category?: string; area?: string; min?: string; max?: string; sort?: string; page?: string }
}) {
  const page = parseInt(searchParams.page ?? '1')
  const limit = 20
  const category = searchParams.category as ItemCategory | undefined
  const sort = searchParams.sort ?? 'newest'

  const where: Record<string, unknown> = { status: 'active' }
  if (category && CATEGORIES.includes(category)) where.category = category
  if (searchParams.area) where.generalArea = { contains: searchParams.area, mode: 'insensitive' }
  if (searchParams.min) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), gte: parseInt(searchParams.min) }
  if (searchParams.max) where.bountyAmountCents = { ...((where.bountyAmountCents as object) ?? {}), lte: parseInt(searchParams.max) }

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

      <TicketFilters />

      <div className="mt-4 space-y-3">
        {tickets.length === 0 ? (
          <div className="text-center py-16">
            <Search size={40} strokeWidth={1.5} className="mx-auto text-fog mb-3" />
            <p className="text-slate font-medium">No active bounties</p>
            <p className="text-fog text-sm mt-1">Be the first to post a lost item!</p>
          </div>
        ) : (
          tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
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
