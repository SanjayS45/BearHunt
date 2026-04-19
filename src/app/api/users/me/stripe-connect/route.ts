import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })

  let accountId = user.stripeAccountId
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: { transfers: { requested: true } },
    })
    accountId = account.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } })
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXTAUTH_URL}/dashboard/earnings?connect=refresh`,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/earnings?connect=success`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
