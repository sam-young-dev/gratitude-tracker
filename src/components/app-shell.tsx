import { Link } from '@tanstack/react-router'
import { BookOpen, ChartNoAxesColumn, House, Settings, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  to: '/' | '/moments' | '/insights' | '/tags' | '/settings'
  label: string
  icon: LucideIcon
}

const primaryNav: Array<NavItem> = [
  { to: '/', label: 'Home', icon: House },
  { to: '/moments', label: 'Moments', icon: BookOpen },
  { to: '/insights', label: 'Insights', icon: ChartNoAxesColumn },
]

const secondaryNav: Array<NavItem> = [
  { to: '/tags', label: 'Tags', icon: Tag },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Mobile gets the three destinations used daily plus Settings; Tags lives under Settings there.
const mobileNav: Array<NavItem> = [...primaryNav, secondaryNav[1]]

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground'
const linkActive = 'bg-muted text-foreground'

function RailLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === '/' }}
      className={cn(linkBase, 'min-h-11')}
      activeProps={{ className: linkActive, 'aria-current': 'page' }}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === '/' }}
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
      activeProps={{
        className: 'text-primary hover:text-primary',
        'aria-current': 'page',
      }}
    >
      <Icon className="size-5" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-popover"
      >
        Skip to content
      </a>

      <aside className="hidden border-r md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-8 md:px-4 md:py-6">
        <p className="px-3 font-serif text-xl font-semibold tracking-tight">
          Gratitude Graph
        </p>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {primaryNav.map((item) => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>
        <nav aria-label="Account" className="mt-auto flex flex-col gap-1">
          {secondaryNav.map((item) => (
            <RailLink key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <main
        id="main"
        className="mx-auto w-full max-w-4xl px-4 pt-8 pb-28 md:px-10 md:pt-12 md:pb-16"
      >
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {mobileNav.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  )
}
