import { prisma } from './prisma'
import { startOfDay } from 'date-fns'

export async function checkClaimRateLimit(finderId: string): Promise<boolean> {
  const today = startOfDay(new Date())
  const count = await prisma.claim.count({
    where: {
      finderId,
      createdAt: { gte: today },
    },
  })
  return count < 10
}

export async function checkTicketRateLimit(ownerId: string): Promise<boolean> {
  const today = startOfDay(new Date())
  const count = await prisma.ticket.count({
    where: {
      ownerId,
      createdAt: { gte: today },
    },
  })
  return count < 5
}
