'use client'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from './ui/button'
import { toast } from '@/hooks/use-toast'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

function PaymentStep({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })
    if (error) {
      toast(error.message ?? 'Card setup failed', 'error')
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={loading || !stripe}>
        {loading ? 'Saving…' : 'Save Card & Post Ticket'}
      </Button>
    </form>
  )
}

export function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  if (!stripePromise) {
    return <p className="text-danger text-sm">Stripe is not configured. Contact support.</p>
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentStep onSuccess={onSuccess} />
    </Elements>
  )
}
