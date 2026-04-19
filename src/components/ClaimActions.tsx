'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'

export function ClaimActions({ claimId, ticketId }: { claimId: string; ticketId: string }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    const res = await fetch(`/api/claims/${claimId}/${action}`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast(action === 'approve' ? 'Claim approved! Chat is now open.' : 'Claim rejected.', 'success')
      window.location.href = action === 'approve' ? '/messages' : `/tickets/${ticketId}/claims`
    } else {
      toast(data.error ?? 'Error', 'error')
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2 pt-1">
      <Button
        variant="default"
        className="flex-1"
        onClick={() => handle('approve')}
        disabled={!!loading}
      >
        {loading === 'approve' ? 'Approving…' : "Yes, that's mine!"}
      </Button>
      <Button
        variant="secondary"
        className="flex-1 text-danger border-red-200 hover:bg-red-50"
        onClick={() => handle('reject')}
        disabled={!!loading}
      >
        {loading === 'reject' ? 'Rejecting…' : 'Not my item'}
      </Button>
    </div>
  )
}
