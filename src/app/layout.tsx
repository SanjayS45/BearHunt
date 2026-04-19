import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'
import { BottomNav } from '@/components/BottomNav'
import { Toaster } from '@/components/Toaster'

export const metadata: Metadata = {
  title: 'BearHunt — UC Berkeley Lost & Found',
  description: 'Bounty-based lost and found for UC Berkeley students.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-6 pb-tab-bar md:pb-6">
          {children}
        </main>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  )
}
