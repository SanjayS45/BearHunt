import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks (must be before the dynamic import) ---
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: mockAuth }))

const mockUserFindUniqueOrThrow = vi.fn()
const mockUserUpdateCashout = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockTransactionUpdate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUniqueOrThrow: mockUserFindUniqueOrThrow, update: mockUserUpdateCashout },
    transaction: { findMany: mockTransactionFindMany, update: mockTransactionUpdate },
  },
}))

const mockAccountsRetrieve = vi.fn()
const mockAccountLinksCreate = vi.fn()
const mockAccountsCreateLoginLink = vi.fn()
const mockTransfersCreate = vi.fn()
const mockUserUpdate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    accounts: {
      retrieve: mockAccountsRetrieve,
      createLoginLink: mockAccountsCreateLoginLink,
    },
    accountLinks: { create: mockAccountLinksCreate },
    transfers: { create: mockTransfersCreate },
  },
}))

// Next.js server module stub
vi.mock('next/server', async () => {
  const { NextResponse } = await import('next/server')
  return { NextResponse }
})

const { POST } = await import('../cashout/route')

// -------------------------------------------------------

function makeRequest() {
  return new Request('http://localhost/api/users/me/cashout', { method: 'POST' })
}

describe('POST /api/users/me/cashout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it('returns 400 when user has no stripeAccountId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: null })
    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/set up payouts/i)
  })

  it('returns 400 and clears stripeAccountId when account does not exist in Stripe (test-mode stale ID)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test_stale' })
    mockAccountsRetrieve.mockRejectedValue({ code: 'resource_missing', message: 'No such account: acct_test_stale' })
    mockUserUpdateCashout.mockResolvedValue({})

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no longer valid/i)
    expect(mockUserUpdateCashout).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { stripeAccountId: null } })
    )
  })

  it('returns 400 with onboardingUrl when transfers capability is not active', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'inactive' } })
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_test' })

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/incomplete/i)
    expect(body.onboardingUrl).toBe('https://connect.stripe.com/onboarding/acct_test')
    expect(body.capabilityStatus).toBe('inactive')
  })

  it('returns 400 with onboardingUrl when transfers capability is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: {} })
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_test' })

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.onboardingUrl).toBeDefined()
    expect(body.capabilityStatus).toBe('inactive')
  })

  it('returns 400 when no pending transactions', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'active' } })
    mockTransactionFindMany.mockResolvedValue([])

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no pending/i)
  })

  it('returns 200 and dashboardUrl on successful cashout', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'active' } })
    mockTransactionFindMany.mockResolvedValue([
      { id: 'txn-1', amountCents: 850, userId: 'user-1' },
      { id: 'txn-2', amountCents: 425, userId: 'user-1' },
    ])
    mockTransfersCreate
      .mockResolvedValueOnce({ id: 'tr_1' })
      .mockResolvedValueOnce({ id: 'tr_2' })
    mockTransactionUpdate.mockResolvedValue({})
    mockAccountsCreateLoginLink.mockResolvedValue({ url: 'https://dashboard.stripe.com/express/acct_test' })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.transferredCents).toBe(1275)
    expect(body.dashboardUrl).toBe('https://dashboard.stripe.com/express/acct_test')

    expect(mockTransfersCreate).toHaveBeenCalledTimes(2)
    expect(mockTransactionUpdate).toHaveBeenCalledTimes(2)
    expect(mockTransactionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'txn-1' }, data: { status: 'completed', stripeTransferId: 'tr_1' } })
    )
  })

  it('returns 400 with settling message on insufficient_funds error', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'active' } })
    mockTransactionFindMany.mockResolvedValue([{ id: 'txn-1', amountCents: 500 }])
    mockTransfersCreate.mockRejectedValue({ code: 'insufficient_funds', message: 'insufficient funds in platform account' })

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/settling/i)
  })

  it('returns 400 with stripe error message on other transfer failure', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'active' } })
    mockTransactionFindMany.mockResolvedValue([{ id: 'txn-1', amountCents: 500 }])
    mockTransfersCreate.mockRejectedValue({ message: 'Something went wrong' })

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Something went wrong')
  })

  it('does not mark transactions as completed if transfer fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', stripeAccountId: 'acct_test' })
    mockAccountsRetrieve.mockResolvedValue({ capabilities: { transfers: 'active' } })
    mockTransactionFindMany.mockResolvedValue([{ id: 'txn-1', amountCents: 500 }])
    mockTransfersCreate.mockRejectedValue({ message: 'Transfer failed' })

    await POST()
    expect(mockTransactionUpdate).not.toHaveBeenCalled()
  })
})
