import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ profile }) {
      // if (!profile?.email?.endsWith('@berkeley.edu')) return false
      const existing = await prisma.user.findUnique({
        where: { email: profile.email },
        select: { isBanned: true },
      })
      if (existing?.isBanned) return false
      await prisma.user.upsert({
        where: { email: profile.email },
        update: {
          name: profile.name ?? profile.email,
          avatarUrl: (profile as { picture?: string }).picture ?? null,
        },
        create: {
          email: profile.email,
          name: profile.name ?? profile.email,
          avatarUrl: (profile as { picture?: string }).picture ?? null,
        },
      })
      return true
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const user = await prisma.user.findUnique({ where: { email: profile.email } })
        if (user) token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.userId) session.user.id = token.userId as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
