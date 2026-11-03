import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await auth.api.getSession({ headers: getRequestHeaders() })
  },
)

type Session = Awaited<ReturnType<typeof getSession>>

// The layouts check the session before every navigation, including a search
// change like picking a heat map day. The browser reuses the last answer for a
// few minutes so those checks don't each wait on the server. Every server
// function still checks the real session, so this only decides where to route.
const SESSION_REUSE_MS = 5 * 60 * 1000
let lastSession: { value: Session; at: number } | undefined

export async function loadSession() {
  if (typeof window === 'undefined') return getSession()
  if (lastSession && Date.now() - lastSession.at < SESSION_REUSE_MS) {
    return lastSession.value
  }
  const value = await getSession()
  lastSession = { value, at: Date.now() }
  return value
}

/** Call after signing in, out or deleting the account. */
export function forgetSession() {
  lastSession = undefined
}
