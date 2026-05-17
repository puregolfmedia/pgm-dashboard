import type { NextAuthConfig } from 'next-auth'

// Edge-compatible auth config — no Node.js built-ins, no DB imports.
// Used by middleware to validate JWT sessions without touching Prisma/pg.
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as any).username
        token.role = (user as any).role
        token.clientId = (user as any).clientId
        token.passwordResetRequired = (user as any).passwordResetRequired
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as string,
        username: token.username as string,
        role: token.role as 'ADMIN' | 'CLIENT',
        clientId: token.clientId as string | null,
        passwordResetRequired: token.passwordResetRequired as boolean,
      } as any
      return session
    },
    authorized({ auth }) {
      return !!auth
    },
  },
}
