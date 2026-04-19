'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'
import type { Ticket } from '@/types'

interface TicketActionsProps {
  ticket: Ticket
  isOwner: boolean
  isLoggedIn: boolean
  claimCount: number
}

export function TicketActions({ ticket, isOwner, isLoggedIn, claimCount }: TicketActionsProps) {
  const [cancelling, setCancelling] = useState(false)

  async function handleCancel() {
    if (!confirm('Cancel this ticket? Your bounty will be refunded.')) return
    setCancelling(true)
    const res = await fetch(`/api/tickets/${ticket.id}/cancel`, { method: 'POST' })
    if (res.ok) {
      toast('Ticket cancelled. Bounty refunded.', 'success')
      window.location.reload()
    } else {
      const data = await res.json()
      toast(data.error ?? 'Failed to cancel', 'error')
    }
    setCancelling(false)
  }

  if (isOwner) {
    return (
      <div className="space-y-2">
        {ticket.status === 'active' && (
          <>
            <Link href={`/tickets/${ticket.id}/claims`} className="block">
              <Button className="w-full" variant="default">
                Review Claims {claimCount > 0 && `(${claimCount})`}
              </Button>
            </Link>
            <Button variant="ghost" className="w-full text-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Ticket'}
            </Button>
          </>
        )}
        {ticket.status === 'found' && (
          <Link href={`/messages`} className="block">
            <Button className="w-full">Open Chat →</Button>
          </Link>
        )}
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <Link href="/login">
        <Button className="w-full">Sign in to Claim Bounty</Button>
      </Link>
    )
  }

  if (ticket.status !== 'active') {
    return (
      <Button className="w-full" disabled>
        {ticket.status === 'found' ? 'Item Found' : 'Ticket Closed'}
      </Button>
    )
  }

  return (
    <Link href={`/tickets/${ticket.id}/claim`} className="block">
      <Button className="w-full" variant="gold">Claim Bounty</Button>
    </Link>
  )
}
