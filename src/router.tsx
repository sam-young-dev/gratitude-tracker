import {
  Link,
  createRouter as createTanStackRouter,
} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { routeTree } from './routeTree.gen'

function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        We couldn&rsquo;t find that page
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        The link may be old or mistyped. Your moments are safe.
      </p>
      <Link
        to="/"
        className="min-h-11 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Go to Home
      </Link>
    </div>
  )
}

function ErrorFallback({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 p-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        That didn&rsquo;t load. Your moments are safe. Try again, and if it
        keeps happening, come back in a little while.
      </p>
      <Button type="button" variant="link" onClick={reset} className="px-0">
        Try again
      </Button>
    </div>
  )
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: ErrorFallback,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Data only changes through this app, and every save or delete calls
    // router.invalidate(), so revisits and hover preloads can reuse recent loads.
    defaultStaleTime: 30_000,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
