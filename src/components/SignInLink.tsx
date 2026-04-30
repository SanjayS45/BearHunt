'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function SignInLink() {
  const pathname = usePathname()
  if (pathname === '/login') return null
  return (
    <Link
      href="/login"
      className="text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg"
    >
      Sign in
    </Link>
  )
}
