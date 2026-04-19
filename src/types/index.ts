import type { User, Ticket, Claim, MessageThread, Message, Notification, Transaction, Dispute, Rating, TicketStatus, ItemCategory, ClaimStatus } from '@prisma/client'

export type { User, Ticket, Claim, MessageThread, Message, Notification, Transaction, Dispute, Rating, TicketStatus, ItemCategory, ClaimStatus }

export type TicketWithOwner = Ticket & { owner: Pick<User, 'id' | 'name' | 'avatarUrl' | 'ratingAvg' | 'ratingCount'> }

export type ClaimWithFinder = Claim & { finder: Pick<User, 'id' | 'name' | 'avatarUrl' | 'ratingAvg' | 'ratingCount'> }

export type ThreadWithParticipants = MessageThread & {
  owner: Pick<User, 'id' | 'name' | 'avatarUrl'>
  finder: Pick<User, 'id' | 'name' | 'avatarUrl'>
  claim: Claim & { ticket: Pick<Ticket, 'id' | 'description' | 'bountyAmountCents' | 'category'> }
  messages: Message[]
}

export type ApiError = { error: string }
