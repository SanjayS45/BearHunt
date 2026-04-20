'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'
import { formatCents } from '@/lib/utils'
import type { Ticket } from '@/types'

interface TicketActionsProps {
  ticket: Ticket
  isOwner: boolean
  isLoggedIn: boolean
  claimCount: number
  userClaim?: { id: string; status: string; threadId: string | null } | null
}

export function TicketActions({ ticket, isOwner, isLoggedIn, claimCount, userClaim }: TicketActionsProps) {
  const [cancelling, setCancelling] = useState(false)
  const [extending, setExtending] = useState(false)
  const [showBountyForm, setShowBountyForm] = useState(false)
  const [newBounty, setNewBounty] = useState((ticket.bountyAmountCents / 100).toFixed(2))
  const [updatingBounty, setUpdatingBounty] = useState(false)

  const daysUntilExpiry = Math.ceil((new Date(ticket.expiresAt).getTime() - Date.now()) / 86400000)
  const isExpiringSoon = daysUntilExpiry <= 5

  async function handleCancel() {
    if (!confirm('Cancel this ticket? No charge will be made.')) return
    setCancelling(true)
    const res = await fetch(`/api/tickets/${ticket.id}/cancel`, { method: 'POST' })
    if (res.ok) {
      toast('Ticket cancelled.', 'success')
      window.location.reload()
    } else {
      const data = await res.json()
      toast(data.error ?? 'Failed to cancel', 'error')
    }
    setCancelling(false)
  }

  async function handleExtend() {
    setExtending(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresAt: new Date().toISOString() }),
    })
    if (res.ok) {
      toast('Ticket extended 30 days.', 'success')
      window.location.reload()
    } else {
      const data = await res.json()
      toast(data.error ?? 'Failed to extend', 'error')
    }
    setExtending(false)
  }

  async function handleBountyIncrease() {
    const cents = Math.round(parseFloat(newBounty) * 100)
    if (cents <= ticket.bountyAmountCents) {
      toast('New bounty must be higher than current amount', 'error')
      return
    }
    setUpdatingBounty(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bountyAmountCents: cents }),
    })
    if (res.ok) {
      toast(`Bounty increased to ${formatCents(cents)}`, 'success')
      window.location.reload()
    } else {
      const data = await res.json()
      toast(data.error ?? 'Failed to update bounty', 'error')
    }
    setUpdatingBounty(false)
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

            {isExpiringSoon && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-warning">
                Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.{' '}
                <button onClick={handleExtend} disabled={extending} className="font-semibold underline">
                  {extending ? 'Extending…' : 'Extend 30 days'}
                </button>
              </div>
            )}

            {!isExpiringSoon && (
              <Button variant="secondary" className="w-full" onClick={handleExtend} disabled={extending}>
                {extending ? 'Extending…' : `Extend Ticket (${daysUntilExpiry}d left)`}
              </Button>
            )}

            {!showBountyForm ? (
              <Button variant="ghost" className="w-full text-slate" onClick={() => setShowBountyForm(true)}>
                Increase Bounty (currently {formatCents(ticket.bountyAmountCents)})
              </Button>
            ) : (
              <div className="rounded-lg border border-mist p-3 space-y-2">
                <p className="text-xs text-fog font-medium">New bounty amount</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm font-medium">$</span>
                    <input
                      type="number"
                      min={(ticket.bountyAmountCents / 100 + 0.01).toFixed(2)}
                      step="0.50"
                      value={newBounty}
                      onChange={e => setNewBounty(e.target.value)}
                      className="w-full h-9 pl-7 pr-3 rounded-lg border border-mist text-sm focus:outline-none focus:border-berkeley-blue"
                    />
                  </div>
                  <Button onClick={handleBountyIncrease} disabled={updatingBounty} className="h-9 px-3 text-sm">
                    {updatingBounty ? 'Saving…' : 'Update'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowBountyForm(false)} className="h-9 px-3 text-sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Button variant="ghost" className="w-full text-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Ticket'}
            </Button>
          </>
        )}
        {ticket.status === 'found' && (
          <Link href="/messages" className="block">
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

  if (userClaim) {
    if (userClaim.status === 'approved' && userClaim.threadId) {
      return (
        <Link href={`/messages/${userClaim.threadId}`} className="block">
          <Button className="w-full">Open Chat with Owner →</Button>
        </Link>
      )
    }
    const label =
      userClaim.status === 'pending_review' ? 'Claim submitted — awaiting review' :
      userClaim.status === 'approved' ? 'Claim approved' :
      userClaim.status === 'rejected' ? 'Claim rejected' :
      userClaim.status === 'completed' ? 'Claim completed' :
      userClaim.status === 'disputed' ? 'Claim in dispute' :
      'Claim submitted'
    return (
      <Button className="w-full" disabled>
        {label}
      </Button>
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
