import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import type { Metadata } from 'next'
import { DemoPostBounty } from './_demos/DemoPostBounty'
import { DemoClaimBounty } from './_demos/DemoClaimBounty'
import { DemoMeetup } from './_demos/DemoMeetup'

export const metadata: Metadata = {
  title: 'BearHunt — UC Berkeley Lost & Found',
  description: 'Bounty-based lost and found for UC Berkeley students.',
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

async function SignInButton({ label = 'Continue with Google' }: { label?: string }) {
  return (
    <form
      action={async () => {
        'use server'
        await signIn('google', { redirectTo: '/' })
      }}
    >
      <button
        type="submit"
        className="flex items-center justify-center gap-3 h-11 px-6 rounded-lg border border-mist bg-white hover:bg-snow transition-colors text-sm font-medium text-ink shadow-sm"
      >
        <GoogleIcon />
        {label}
      </button>
    </form>
  )
}

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/')

  return (
    <div className="max-w-4xl mx-auto">

      {/* Hero */}
      <section className="py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-3 py-1 text-xs font-semibold text-ink mb-6">
          🐻 UC Berkeley Lost &amp; Found
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight leading-tight">
          Lost something on campus?
          <br />
          <span className="text-berkeley-blue">Post a bounty. Get it back.</span>
        </h1>
        <p className="text-lg text-slate mt-5 max-w-lg mx-auto leading-relaxed">
          BearHunt turns finding lost items into a scavenger hunt — other students hunt for your item and earn a reward when they return it.
        </p>
        <div className="flex justify-center mt-8">
          <SignInButton />
        </div>
        <p className="text-xs text-fog mt-3">Only @berkeley.edu accounts · Free to join</p>
      </section>

      <hr className="border-mist" />

      {/* Step 1 */}
      <section className="py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-semibold text-berkeley-blue uppercase tracking-widest">Step 1</span>
          <h2 className="text-3xl font-bold text-ink mt-2 leading-tight">Post a bounty</h2>
          <p className="text-slate mt-4 leading-relaxed">
            Describe what you lost, where you think you lost it, and set a reward — $2 minimum, no cap. You decide what getting it back is worth to you.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Your card is saved but <span className="font-semibold text-ink">not charged</span> until you confirm you got your item back</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Higher bounties get found faster — set what it&apos;s really worth to you</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Bounty expires automatically after 30 days if unclaimed</span>
            </li>
          </ul>
        </div>
        <DemoPostBounty />
      </section>

      <hr className="border-mist" />

      {/* Step 2 */}
      <section className="py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="md:order-2">
          <span className="text-xs font-semibold text-berkeley-blue uppercase tracking-widest">Step 2</span>
          <h2 className="text-3xl font-bold text-ink mt-2 leading-tight">Finders hunt &amp; claim</h2>
          <p className="text-slate mt-4 leading-relaxed">
            Every Berkeley student is a potential finder. They browse active bounties, spot a match, and claim it by submitting a photo and location as proof.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Finders search by description — &ldquo;blue backpack near Wheeler&rdquo; works</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Up to 5 proof photos submitted per claim</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>You review the proof and approve or reject — you&apos;re always in control</span>
            </li>
          </ul>
        </div>
        <DemoClaimBounty />
      </section>

      <hr className="border-mist" />

      {/* Step 3 */}
      <section className="py-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs font-semibold text-berkeley-blue uppercase tracking-widest">Step 3</span>
          <h2 className="text-3xl font-bold text-ink mt-2 leading-tight">Meet up &amp; collect</h2>
          <p className="text-slate mt-4 leading-relaxed">
            Once you approve a claim, an in-app message thread opens so you can coordinate the handoff safely. Confirm receipt and the bounty is released automatically.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm text-slate">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span><span className="font-semibold text-ink">85%</span> of the bounty goes directly to the finder</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Secure Stripe payouts to any bank account</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
              <span>Built-in dispute system if something goes wrong</span>
            </li>
          </ul>
        </div>
        <DemoMeetup />
      </section>

      <hr className="border-mist" />

      {/* Bottom CTA */}
      <section className="py-20 text-center">
        <h2 className="text-2xl font-bold text-ink">Ready to find your stuff?</h2>
        <p className="text-slate mt-2">Join Berkeley students already using BearHunt.</p>
        <div className="flex justify-center mt-8">
          <div className="bg-white rounded-xl border border-mist p-6 shadow-sm w-full max-w-sm">
            <p className="text-sm text-slate text-center mb-5">
              Sign in with your <span className="font-semibold text-ink">@berkeley.edu</span> Google account to continue.
            </p>
            <div className="flex justify-center">
              <SignInButton label="Continue with Google" />
            </div>
            <p className="text-xs text-fog text-center mt-3">Only @berkeley.edu accounts are allowed.</p>
          </div>
        </div>
      </section>

    </div>
  )
}
