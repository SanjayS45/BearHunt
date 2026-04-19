import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/RatingStars'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: {
      receivedRatings: {
        include: { rater: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      <div className="bg-white rounded-xl border border-mist p-5">
        <div className="flex items-center gap-4 mb-4">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-snow border border-mist flex items-center justify-center text-2xl font-bold text-slate">
              {user.name[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-ink">{user.name}</p>
            <p className="text-sm text-fog">{user.email}</p>
            {user.ratingAvg && (
              <div className="flex items-center gap-1.5 mt-1">
                <RatingStars value={Math.round(user.ratingAvg)} readonly size={14} />
                <span className="text-xs text-fog">{user.ratingAvg.toFixed(1)} ({user.ratingCount} ratings)</span>
              </div>
            )}
          </div>
        </div>

        <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
          <Button type="submit" variant="secondary" className="w-full">Sign Out</Button>
        </form>
      </div>

      {user.receivedRatings.length > 0 && (
        <div className="bg-white rounded-xl border border-mist p-5">
          <h2 className="font-semibold mb-4">Your Ratings</h2>
          <div className="space-y-3">
            {user.receivedRatings.map(r => (
              <div key={r.id} className="border-b border-mist pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate">{r.rater.name}</span>
                  <RatingStars value={r.score} readonly size={14} />
                </div>
                {r.comment && <p className="text-sm text-fog italic">&ldquo;{r.comment}&rdquo;</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
