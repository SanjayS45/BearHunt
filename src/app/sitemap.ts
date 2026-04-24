import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tickets = await prisma.ticket.findMany({
    where: { status: 'active' },
    select: { id: true, filedAt: true },
    orderBy: { filedAt: 'desc' },
    take: 1000,
  })

  const ticketUrls: MetadataRoute.Sitemap = tickets.map(t => ({
    url: `https://bearhunt.online/tickets/${t.id}`,
    lastModified: t.filedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    { url: 'https://bearhunt.online', lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: 'https://bearhunt.online/login', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    ...ticketUrls,
  ]
}
