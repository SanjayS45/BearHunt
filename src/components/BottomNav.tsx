'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, MessageCircle, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', icon: Home, label: 'Board' },
  { href: '/tickets/new', icon: PlusCircle, label: 'Post' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-mist md:hidden">
      <div className="flex h-16">
        {tabs.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                active ? 'text-berkeley-blue' : 'text-fog hover:text-slate'
              )}
            >
              <tab.icon size={20} strokeWidth={1.5} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
