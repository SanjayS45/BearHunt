'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <h2 className="text-xl font-bold text-ink mb-2">Something went wrong</h2>
      <p className="text-slate text-sm mb-1">{error.message}</p>
      {error.digest && <p className="text-xs text-fog mb-6">Error ID: {error.digest}</p>}
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
