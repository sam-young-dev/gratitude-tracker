import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'
import { HydrationMarker } from '@/components/hydration-marker'
import { Toaster } from '@/components/ui/sonner'

// Runs before first paint so a dark-mode user never sees a light flash. It also
// records the saved choice on <html> so the Settings picker renders correctly.
const themeScript = `(() => {
  try {
    const stored = localStorage.getItem('theme')
    const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.themePref = stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {}
})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Gratitude Tracker',
      },
      {
        name: 'description',
        content: 'A private journal of the moments you saw God working.',
      },
      {
        name: 'color-scheme',
        content: 'light dark',
      },
      {
        name: 'theme-color',
        content: '#f3ead8',
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: '#26221e',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <HydrationMarker />
        <Toaster
          position="bottom-center"
          mobileOffset={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
        />
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
