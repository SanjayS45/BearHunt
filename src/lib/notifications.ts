import { prisma } from './prisma'

export type NotificationType =
  | 'new_claim'
  | 'claim_approved'
  | 'claim_rejected'
  | 'new_message'
  | 'payout_sent'
  | 'ticket_expiring'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'rating_received'
  | 'receipt_confirmed'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  metadata?: Record<string, string | number | boolean | null>
) {
  return prisma.notification.create({
    data: { userId, type, title, body, metadata },
  })
}
