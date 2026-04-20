'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Something went wrong</h2>
        <p style={{ color: '#666', margin: '0.5rem 0' }}>{error.message}</p>
        {error.digest && <p style={{ color: '#999', fontSize: '0.75rem' }}>ID: {error.digest}</p>}
        <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  )
}
