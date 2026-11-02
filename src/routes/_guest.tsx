import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@/lib/auth.functions'

// Sign-in, sign-up and forgot-password: signed-in users go straight home.
export const Route = createFileRoute('/_guest')({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' })
  },
  component: Outlet,
})
