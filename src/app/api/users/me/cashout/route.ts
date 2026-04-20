import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

  if (!user.stripeAccountId) {
    return NextResponse.json({ error: 'Set up payouts first before cashing out' }, { status: 400 })
  }

  const pending = await prisma.transaction.findMany({
    where: { userId: session.user.id, type: 'payout_finder', status: 'pending' },
  })

  if (pending.length === 0) {
    return NextResponse.json({ error: 'No pending earnings to cash out' }, { status: 400 })
  }

  const totalCents = pending.reduce((s, t) => s + t.amountCents, 0)

  let transfers: { id: string }[]
  try {
    transfers = await Promise.all(
      pending.map(t =>
        stripe.transfers.create({
          amount: t.amountCents,
          currency: 'usd',
          destination: user.stripeAccountId!,
          metadata: { userId: user.id, transactionId: t.id },
        })
      )
    )
  } catch (e: unknown) {
    const stripeErr = e as { type?: string; code?: string; message?: string }
    if (stripeErr.code === 'insufficient_funds' || stripeErr.message?.includes('insufficient')) {
      return NextResponse.json({
        error: 'Funds are still settling (typically 1–2 business days after the bounty is confirmed). Please try again shortly.',
      }, { status: 400 })
    }
    return NextResponse.json({ error: stripeErr.message ?? 'Transfer failed' }, { status: 400 })
  }

  await Promise.all(
    pending.map((t, i) =>
      prisma.transaction.update({
        where: { id: t.id },
        data: { status: 'completed', stripeTransferId: transfers[i].id },
      })
    )
  )

  const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)

  return NextResponse.json({ success: true, transferredCents: totalCents, dashboardUrl: loginLink.url })
}
