import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { getSession } from '@/lib/auth.functions'

// Everything inside this layout needs a signed-in user.
export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/sign-in' })
    return { user: session.user }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})
