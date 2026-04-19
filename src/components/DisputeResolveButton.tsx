'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'

export function DisputeResolveButton({ disputeId }: { disputeId: string }) {
  const [loading, setLoading] = useState(false)

  async function resolve(resolution: 'upheld' | 'reversed' | 'cancelled') {
    const notes = prompt(`Notes for "${resolution}" resolution (optional):`) ?? ''
    setLoading(true)
    const res = await fetch(`/api/admin/disputes/${disputeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, notes }),
    })
    if (res.ok) {
      toast('Dispute resolved', 'success')
      window.location.reload()
    } else {
      const data = await res.json()
      toast(data.error ?? 'Error', 'error')
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" onClick={() => resolve('upheld')} disabled={loading} className="flex-1">
        Release to Finder
      </Button>
      <Button size="sm" variant="secondary" onClick={() => resolve('reversed')} disabled={loading} className="flex-1">
        Refund Owner
      </Button>
      <Button size="sm" variant="ghost" onClick={() => resolve('cancelled')} disabled={loading} className="text-fog">
        Reopen Ticket
      </Button>
    </div>
  )
}
