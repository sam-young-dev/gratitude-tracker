import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'
import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import newsreaderLatin from '@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url'
import { HydrationMarker } from '@/components/hydration-marker'
import { ServiceWorkerRegistration } from '@/components/service-worker'
import { Toaster } from '@/components/ui/sonner'
import { THEME_COLORS, themeColorOverrideSource } from '@/lib/theme-color'

// Runs before first paint so a dark-mode user never sees a light flash, and a
// collapsed sidebar never renders expanded first. It also
// records the saved choice on <html> so the Settings picker renders correctly,
// and points the status bar at a forced theme instead of the OS one.
// It also defines window.__setThemeColorOverride, which Settings reuses.
const themeScript = `(() => {
  window.__setThemeColorOverride = ${themeColorOverrideSource}
  try {
    const stored = localStorage.getItem('theme')
    const forced = stored === 'light' || stored === 'dark' ? stored : null
    const dark = forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.themePref = forced || 'system'
    window.__setThemeColorOverride(forced)
    document.documentElement.toggleAttribute(
      'data-sidebar-collapsed',
      localStorage.getItem('sidebar-collapsed') === '1',
    )
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
        content:
          'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
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
        content: THEME_COLORS.light,
        media: '(prefers-color-scheme: light)',
      },
      {
        name: 'theme-color',
        content: THEME_COLORS.dark,
        media: '(prefers-color-scheme: dark)',
      },
      // Installed-app (home screen) behavior, mainly for iOS Safari.
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Gratitude' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      // The latin subsets cover the app's copy; preloading them avoids a late swap.
      // Production only: the dev server serves fonts as no-cache and re-injects
      // the CSS after hydration, so the browser refetches them and Chrome warns
      // that the preloads went unused.
      ...(import.meta.env.PROD
        ? [interLatin, newsreaderLatin].map((href) => ({
            rel: 'preload',
            href,
            as: 'font',
            type: 'font/woff2',
            crossOrigin: 'anonymous' as const,
          }))
        : []),
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
        <ServiceWorkerRegistration />
        <Toaster
          position="bottom-center"
          mobileOffset={{
            bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
          }}
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
