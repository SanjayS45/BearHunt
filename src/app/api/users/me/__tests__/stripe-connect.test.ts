import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks ---
const mockAuth = vi.fn()
vi.mock('@/auth', () => ({ auth: mockAuth }))

const mockUserFindUniqueOrThrow = vi.fn()
const mockUserUpdate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUniqueOrThrow: mockUserFindUniqueOrThrow,
      update: mockUserUpdate,
    },
  },
}))

const mockAccountsCreate = vi.fn()
const mockAccountLinksCreate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  stripe: {
    accounts: { create: mockAccountsCreate },
    accountLinks: { create: mockAccountLinksCreate },
  },
}))

vi.mock('next/server', async () => {
  const { NextResponse } = await import('next/server')
  return { NextResponse }
})

const { POST } = await import('../stripe-connect/route')

// -------------------------------------------------------

describe('POST /api/users/me/stripe-connect', () => {
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

  it('creates a new Express account and returns onboarding URL for new user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'finder@test.com',
      stripeAccountId: null,
    })
    mockAccountsCreate.mockResolvedValue({ id: 'acct_new' })
    mockUserUpdate.mockResolvedValue({})
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_new' })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://connect.stripe.com/onboarding/acct_new')

    expect(mockAccountsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'express',
        email: 'finder@test.com',
        capabilities: { transfers: { requested: true } },
      })
    )
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { stripeAccountId: 'acct_new' } })
    )
  })

  it('reuses existing stripeAccountId without creating a new account', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'finder@test.com',
      stripeAccountId: 'acct_existing',
    })
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_existing' })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toBe('https://connect.stripe.com/onboarding/acct_existing')

    expect(mockAccountsCreate).not.toHaveBeenCalled()
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('includes correct return and refresh URLs in account link', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'finder@test.com',
      stripeAccountId: 'acct_existing',
    })
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/onboarding/acct_existing' })

    await POST()

    expect(mockAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        account: 'acct_existing',
        refresh_url: 'http://localhost:3000/dashboard/earnings?connect=refresh',
        return_url: 'http://localhost:3000/dashboard/earnings?connect=success',
        type: 'account_onboarding',
      })
    )
  })

  it('uses VERCEL_PROJECT_PRODUCTION_URL when available', async () => {
    delete process.env.NEXTAUTH_URL
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'bearhunt.vercel.app'

    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUserFindUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      email: 'finder@test.com',
      stripeAccountId: 'acct_existing',
    })
    mockAccountLinksCreate.mockResolvedValue({ url: 'https://connect.stripe.com/setup' })

    await POST()

    expect(mockAccountLinksCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh_url: 'https://bearhunt.vercel.app/dashboard/earnings?connect=refresh',
      })
    )

    delete process.env.VERCEL_PROJECT_PRODUCTION_URL
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })
})
