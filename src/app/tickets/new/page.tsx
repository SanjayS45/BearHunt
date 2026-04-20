'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LocationInput } from '@/components/LocationInput'
import { toast } from '@/hooks/use-toast'
import { formatCents } from '@/lib/utils'

const PaymentForm = dynamic(
  () => import('@/components/PaymentForm').then(m => m.PaymentForm),
  { ssr: false, loading: () => <p className="text-sm text-fog">Loading payment form…</p> }
)

const CATEGORIES = [
  { value: 'water_bottle', label: 'Water Bottle' },
  { value: 'phone', label: 'Phone' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'keys', label: 'Keys' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'bag', label: 'Bag' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'book', label: 'Book' },
  { value: 'id_card', label: 'ID / Card' },
  { value: 'headphones', label: 'Headphones' },
  { value: 'charger', label: 'Charger' },
  { value: 'other', label: 'Other' },
]

const BOUNTY_SUGGESTIONS: Record<string, string> = {
  water_bottle: 'Most people offer $2–$5',
  phone: 'Most people offer $20–$50',
  wallet: 'Most people offer $10–$25',
  keys: 'Most people offer $5–$15',
  electronics: 'Most people offer $15–$50',
  headphones: 'Most people offer $10–$30',
  default: 'Minimum $2 — set what the item is worth to you',
}

export default function NewTicketPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [ticketId, setTicketId] = useState('')

  const [form, setForm] = useState({
    description: '',
    category: '',
    generalArea: '',
    lostAt: '',
    bountyAmountCents: 500,
    referencePhotoUrl: '',
  })

  useEffect(() => {
    setForm(f => ({ ...f, lostAt: new Date().toISOString().slice(0, 16) }))
  }, [])

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleNext() {
    if (step === 1) {
      if (!form.description || !form.category || !form.generalArea) {
        toast('Please fill in all required fields', 'error')
        return
      }
      if (form.description.length < 10) {
        toast('Description must be at least 10 characters', 'error')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (form.bountyAmountCents < 200) {
        toast('Minimum bounty is $2.00', 'error')
        return
      }
      setLoading(true)
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, lostAt: new Date(form.lostAt).toISOString() }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast((data as { error?: string }).error ?? 'Failed to create ticket', 'error')
          setLoading(false)
          return
        }
        setClientSecret(data.clientSecret)
        setTicketId(data.ticket.id)
        setStep(3)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Failed to create ticket', 'error')
      }
      setLoading(false)
    }
  }

  if (step === 3 && clientSecret) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-1">Save Payment Method</h1>
        <p className="text-slate text-sm mb-6">Your card will be saved but <strong>not charged</strong> until you confirm you&apos;ve received your item. Bounty: <strong>{formatCents(form.bountyAmountCents)}</strong>.</p>
        <div className="bg-white rounded-xl border border-mist p-5">
          <PaymentForm clientSecret={clientSecret} onSuccess={() => router.push(`/tickets/${ticketId}`)} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-1">Post a Lost Item</h1>
      <p className="text-slate text-sm mb-6">Step {step} of 3</p>

      <div className="bg-white rounded-xl border border-mist p-5 space-y-4">
        {step === 1 && (
          <>
            <div>
              <Label htmlFor="description">Item description <span className="text-danger">*</span></Label>
              <Textarea
                id="description"
                placeholder="e.g. Blue Hydro Flask with Cal Hiking Club sticker, dent on the bottom"
                value={form.description}
                onChange={e => set('description', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Category <span className="text-danger">*</span></Label>
              <select
                id="category"
                value={form.category}
                onChange={e => set('category', e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-mist bg-white px-3 text-sm text-ink focus:outline-none focus:border-berkeley-blue"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <LocationInput
              label="Where do you think you lost it? *"
              value={form.generalArea}
              onChange={v => set('generalArea', v)}
              placeholder="e.g. Dwinelle Hall"
            />

            <div>
              <Label htmlFor="lostAt">When did you lose it? <span className="text-danger">*</span></Label>
              <Input
                id="lostAt"
                type="datetime-local"
                value={form.lostAt}
                onChange={e => set('lostAt', e.target.value)}
                className="mt-1"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label htmlFor="bounty">Bounty amount <span className="text-danger">*</span></Label>
              <p className="text-xs text-fog mb-2">{BOUNTY_SUGGESTIONS[form.category] ?? BOUNTY_SUGGESTIONS.default}</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate font-medium">$</span>
                <Input
                  id="bounty"
                  type="number"
                  min="2"
                  step="0.5"
                  value={(form.bountyAmountCents / 100).toFixed(2)}
                  onChange={e => set('bountyAmountCents', Math.round(parseFloat(e.target.value) * 100))}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-fog mt-1">Minimum $2.00 · You decide what it&apos;s worth</p>
            </div>

            <div>
              <Label htmlFor="photo">Reference photo <span className="text-fog font-normal">(optional)</span></Label>
              <p className="text-xs text-fog mb-2">A photo of the item from before you lost it helps finders identify it</p>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                className="mt-1 cursor-pointer"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const fd = new FormData()
                  fd.append('files', file)
                  fd.append('bucket', 'reference-photos')
                  fd.append('ticketId', 'temp')
                  const res = await fetch('/api/upload', { method: 'POST', body: fd })
                  if (res.ok) {
                    const { paths } = await res.json()
                    set('referencePhotoUrl', paths[0])
                  }
                }}
              />
            </div>

            <div className="p-3 rounded-lg bg-snow border border-mist text-sm text-slate">
              <strong>Summary:</strong> {form.description} · {form.generalArea} · Bounty {formatCents(form.bountyAmountCents)}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        <Button onClick={handleNext} disabled={loading} className="flex-1">
          {loading ? 'Creating…' : step === 2 ? 'Continue to Payment' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
