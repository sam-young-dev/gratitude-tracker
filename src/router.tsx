import {
  Link,
  createRouter as createTanStackRouter,
} from '@tanstack/react-router'
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

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
