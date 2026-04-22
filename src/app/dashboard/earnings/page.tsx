'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { formatCents, categoryLabel } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface Transaction {
  id: string
  amountCents: number
  status: string
  createdAt: string
  ticket: { id: string; description: string; category: string }
}

interface Data {
  user: { stripeAccountId: string | null }
  pending: Transaction[]
  completed: Transaction[]
  pendingCents: number
  completedCents: number
  fundsAvailableAt: string | null
  bankArrivalAt: string | null
}

export default function EarningsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [cashoutLoading, setCashoutLoading] = useState(false)

  async function load() {
    const res = await fetch('/api/users/me/earnings', { cache: 'no-store' })
    if (res.ok) {
      setData(await res.json())
    } else {
      const d = await res.json().catch(() => ({}))
      toast(d.error ?? `Failed to load earnings (${res.status})`, 'error')
    }
  }

  useEffect(() => { load() }, [])

  async function handleConnect() {
    setConnectLoading(true)
    try {
      const res = await fetch('/api/users/me/stripe-connect', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.url) {
        window.location.href = d.url
        return
      }
      toast(d.error ?? `Setup failed (${res.status})`, 'error')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Network error', 'error')
    }
    setConnectLoading(false)
  }

  async function handleCashout() {
    setCashoutLoading(true)
    try {
      const res = await fetch('/api/users/me/cashout', { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        toast(`${formatCents(d.transferredCents)} sent! Opening Stripe…`, 'success')
        if (d.dashboardUrl) {
          window.location.href = d.dashboardUrl
          return
        }
        load()
      } else {
        toast(d.error ?? 'Cash out failed', 'error')
        // Redirect to Stripe onboarding if capability is incomplete
        if (d.onboardingUrl) {
          window.location.href = d.onboardingUrl
          return
        }
        // Reload so if stripeAccountId was cleared server-side, the setup button appears
        await load()
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Network error', 'error')
    }
    setCashoutLoading(false)
  }

  if (!data) return <div className="max-w-2xl mx-auto py-12 text-center text-fog">Loading…</div>

  const { user, pending, completed, pendingCents, completedCents, fundsAvailableAt, bankArrivalAt } = data
  const hasPending = pendingCents > 0

  const fundsReadyAt = fundsAvailableAt ? new Date(fundsAvailableAt) : null
  const fundsReady = fundsReadyAt ? new Date() >= fundsReadyAt : false
  const bankArrivalDate = bankArrivalAt ? new Date(bankArrivalAt) : null

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Earnings</h1>

      {/* Payout setup banner */}
      {!user.stripeAccountId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-warning mb-1">Set up payouts to cash out your earnings</p>
          <p className="text-xs text-slate mb-3">Connect your bank account via Stripe. Takes ~2 minutes.</p>
          <Button size="sm" onClick={handleConnect} disabled={connectLoading}>
            {connectLoading ? 'Redirecting…' : 'Set Up Payouts'}
          </Button>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-berkeley-blue text-white rounded-xl p-5">
          <p className="text-sm text-white/70">Available to cash out</p>
          <p className="text-3xl font-bold mt-1">{formatCents(pendingCents)}</p>
          {hasPending && !user.stripeAccountId && (
            <Button
              className="mt-3 bg-white text-berkeley-blue hover:bg-white/90 text-sm h-8 px-3"
              onClick={handleConnect}
              disabled={connectLoading}
            >
              {connectLoading ? 'Redirecting…' : 'Set Up Payouts'}
            </Button>
          )}
          {hasPending && user.stripeAccountId && !fundsReady && fundsReadyAt && (
            <p className="mt-3 text-xs text-white/80">
              Cash out available {format(fundsReadyAt, 'MMM d')}
            </p>
          )}
          {hasPending && user.stripeAccountId && fundsReady && (
            <>
              <Button
                className="mt-3 bg-white text-berkeley-blue hover:bg-white/90 text-sm h-8 px-3"
                onClick={handleCashout}
                disabled={cashoutLoading}
              >
                {cashoutLoading ? 'Processing…' : 'Cash Out'}
              </Button>
              <p className="mt-2 text-xs text-white/60">Takes 1–3 minutes to process</p>
            </>
          )}
        </div>
        <div className="bg-white border border-mist rounded-xl p-5">
          <p className="text-sm text-fog">Total paid out</p>
          <p className="text-3xl font-bold mt-1 text-ink">{formatCents(completedCents)}</p>
        </div>
      </div>

      {/* Pending earnings */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-fog mb-3">Pending (ready to cash out)</h2>
          <div className="bg-white rounded-xl border border-mist overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-mist">
                {pending.map(t => (
                  <tr key={t.id} className="hover:bg-snow transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink truncate max-w-[200px]">{t.ticket.description}</p>
                      <p className="text-xs text-fog">{categoryLabel(t.ticket.category)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate">{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{formatCents(t.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed earnings */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-fog mb-3">Paid Out</h2>
          <div className="bg-white rounded-xl border border-mist overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-mist">
                {completed.map(t => (
                  <tr key={t.id} className="hover:bg-snow transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink truncate max-w-[200px]">{t.ticket.description}</p>
                      <p className="text-xs text-fog">{categoryLabel(t.ticket.category)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate">{format(new Date(t.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-right font-bold text-success">{formatCents(t.amountCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pending.length === 0 && completed.length === 0 && (
        <div className="text-center py-12 text-fog">
          <p className="text-slate font-medium">No earnings yet</p>
          <p className="text-sm mt-1">Browse the bounty board to start finding items</p>
        </div>
      )}
    </div>
  )
}
