import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

// VERCEL_PROJECT_PRODUCTION_URL is the canonical production domain (no protocol), always present on Vercel.
// Prefer it over NEXTAUTH_URL which may be set to http://localhost:3000 even in production.
const BASE_URL =
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000')

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

    if (!user.stripeAccountId) {
      return NextResponse.json({ error: 'Set up payouts first before cashing out' }, { status: 400 })
    }

    // Verify transfers capability is active before attempting any transfer.
    // If the account doesn't exist (e.g. created in test mode, now live), clear it and ask the user to re-onboard.
    let account: Awaited<ReturnType<typeof stripe.accounts.retrieve>>
    try {
      account = await stripe.accounts.retrieve(user.stripeAccountId)
    } catch (e: unknown) {
      const stripeErr = e as { code?: string; message?: string }
      if (stripeErr.code === 'resource_missing' || stripeErr.message?.includes('No such account')) {
        await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: null } })
        return NextResponse.json(
          { error: 'Your payout account is no longer valid (possibly created in test mode). Please set up payouts again.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: stripeErr.message ?? 'Failed to retrieve payout account' }, { status: 400 })
    }

    const transfersStatus = account.capabilities?.transfers
    if (transfersStatus !== 'active') {
      const accountLink = await stripe.accountLinks.create({
        account: user.stripeAccountId,
        refresh_url: `${BASE_URL}/dashboard/earnings?connect=refresh`,
        return_url: `${BASE_URL}/dashboard/earnings?connect=success`,
        type: 'account_onboarding',
      })
      return NextResponse.json(
        {
          error: 'Your payout account setup is incomplete. Finish Stripe onboarding to enable transfers.',
          onboardingUrl: accountLink.url,
          capabilityStatus: transfersStatus ?? 'inactive',
        },
        { status: 400 }
      )
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
      const stripeErr = e as { code?: string; message?: string }
      if (stripeErr.code === 'insufficient_funds' || stripeErr.message?.includes('insufficient')) {
        return NextResponse.json(
          { error: 'Funds are still settling (typically 1–2 business days after the bounty is confirmed). Please try again shortly.' },
          { status: 400 }
        )
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
  } catch (e: unknown) {
    const err = e as { message?: string }
    console.error('[cashout] unhandled error:', err)
    return NextResponse.json({ error: err.message ?? 'An unexpected error occurred' }, { status: 500 })
  }
}
