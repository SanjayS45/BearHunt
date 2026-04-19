'use client'
import { useState } from 'react'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'

export function ConnectButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    const res = await fetch('/api/users/me/stripe-connect', { method: 'POST' })
    const data = await res.json()
    if (res.ok && data.url) {
      window.location.href = data.url
    } else {
      toast(data.error ?? 'Failed to start Connect onboarding', 'error')
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleConnect} disabled={loading} size="sm">
      {loading ? 'Redirecting…' : 'Set Up Payouts'}
    </Button>
  )
}
