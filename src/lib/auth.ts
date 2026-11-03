import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '@/db'
import * as schema from '@/db/schema'
import { sendEmail } from '@/lib/email'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // TODO(before launch): turn on once email sending is configured (see PLAN.md).
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited, so response time doesn't reveal whether an account exists.
      void sendEmail({
        to: user.email,
        subject: 'Reset your Gratitude Tracker password',
        text: `Open this link to choose a new password:\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`,
      })
    },
  },
  // Deleting the user cascades to sessions, accounts, entries and tags (FK onDelete).
  user: { deleteUser: { enabled: true } },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    // Every server function checks the session; a signed cookie answers that
    // without a database round trip. A revoked session lasts at most this long.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Stored in the database so limits hold across serverless instances.
  rateLimit: {
    enabled: true,
    storage: 'database',
    customRules: {
      '/request-password-reset': { window: 60, max: 3 },
    },
  },
  plugins: [tanstackStartCookies()], // must be the last plugin
})
