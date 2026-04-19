import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function bountyColor(cents: number): string {
  if (cents <= 500) return 'text-success bg-green-50 border-green-200'
  if (cents <= 1500) return 'text-warning bg-amber-50 border-amber-200'
  return 'text-amber-600 bg-yellow-50 border-yellow-300'
}

export function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    water_bottle: 'Water Bottle',
    phone: 'Phone',
    wallet: 'Wallet',
    keys: 'Keys',
    clothing: 'Clothing',
    bag: 'Bag',
    electronics: 'Electronics',
    book: 'Book',
    id_card: 'ID / Card',
    headphones: 'Headphones',
    charger: 'Charger',
    other: 'Other',
  }
  return labels[category] ?? category
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    found: 'Found — Pending Pickup',
    resolved: 'Resolved',
    expired: 'Expired',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
    pending_review: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
  }
  return labels[status] ?? status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-berkeley-blue bg-blue-50 border-blue-200',
    found: 'text-warning bg-amber-50 border-amber-200',
    resolved: 'text-success bg-green-50 border-green-200',
    expired: 'text-fog bg-gray-50 border-gray-200',
    cancelled: 'text-fog bg-gray-50 border-gray-200',
    disputed: 'text-danger bg-red-50 border-red-200',
    pending_review: 'text-warning bg-amber-50 border-amber-200',
    approved: 'text-success bg-green-50 border-green-200',
    rejected: 'text-danger bg-red-50 border-red-200',
    completed: 'text-success bg-green-50 border-green-200',
  }
  return colors[status] ?? 'text-slate bg-gray-50 border-gray-200'
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
}

export function isAdmin(email: string): boolean {
  return getAdminEmails().includes(email)
}

const BLOCK_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  /(https?:\/\/|www\.)\S+/i,
  /@[a-zA-Z0-9._]{2,}/,
  /\b(instagram|snapchat|venmo|zelle|cashapp|telegram|whatsapp|discord)\b/i,
]

export function hasBlockedContent(text: string): boolean {
  return BLOCK_PATTERNS.some(p => p.test(text))
}
