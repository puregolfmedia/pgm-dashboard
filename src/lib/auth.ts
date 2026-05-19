import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { authConfig } from '@/auth.config'
import { checkLoginRateLimit, recordLoginFailure, clearLoginFailures } from './rateLimit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username as string
        const { allowed } = checkLoginRateLimit(username)

        if (!allowed) {
          throw new Error('Too many failed attempts. Try again in 15 minutes.')
        }

        const user = await prisma.user.findUnique({ where: { username } })
        if (!user) {
          recordLoginFailure(username)
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) {
          recordLoginFailure(username)
          return null
        }

        clearLoginFailures(username)

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          name: user.username,
          username: user.username,
          role: user.role,
          clientId: user.clientId,
          passwordResetRequired: user.passwordResetRequired,
        }
      },
    }),
  ],
})
