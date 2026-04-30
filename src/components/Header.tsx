import Link from 'next/link'
import Image from 'next/image'
import { auth } from '@/auth'
import { NotificationBell } from './NotificationBell'
import { SignInLink } from './SignInLink'

export async function Header() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-30 bg-berkeley-blue text-white shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="BearHunt" width={32} height={32} className="rounded" />
          <span className="font-bold text-lg tracking-tight">BearHunt</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/">Board</NavLink>
          <NavLink href="/tickets/new">Post Item</NavLink>
          <NavLink href="/messages">Messages</NavLink>
          <NavLink href="/dashboard">Dashboard</NavLink>
        </div>

        <div className="flex items-center gap-2">
          {session && <NotificationBell />}
          {session ? (
            <Link href="/settings" className="flex items-center gap-2">
              {session.user?.image ? (
                <img src={session.user.image} alt="" className="w-8 h-8 rounded-full border-2 border-white/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-ink text-sm font-bold">
                  {session.user?.name?.[0] ?? '?'}
                </div>
              )}
            </Link>
          ) : (
            <SignInLink />
          )}
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors">
      {children}
    </Link>
  )
}
