import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  BookOpen,
  ChartNoAxesColumn,
  House,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Tag,
} from 'lucide-react'
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

const COLLAPSED_KEY = 'sidebar-collapsed'

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false)

  // The layout is styled from <html data-sidebar-collapsed>, which the pre-paint
  // script in __root.tsx sets, so it is right on first paint. This state only
  // keeps the toggle's label, aria-expanded and tooltips in sync.
  useEffect(() => {
    setCollapsed(document.documentElement.hasAttribute('data-sidebar-collapsed'))
  }, [])

  const toggle = () => {
    const next = !collapsed
    document.documentElement.toggleAttribute('data-sidebar-collapsed', next)
    setCollapsed(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  return [collapsed, toggle] as const
}

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 select-none [-webkit-touch-callout:none] hover:bg-muted hover:text-foreground active:bg-muted'
const linkActive = 'bg-muted text-foreground'

function RailLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      title={collapsed ? item.label : undefined}
      activeOptions={{ exact: item.to === '/' }}
      className={cn(linkBase, 'min-h-11 overflow-hidden whitespace-nowrap')}
      activeProps={{ className: linkActive, 'aria-current': 'page' }}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span className="transition-opacity duration-150 motion-reduce:transition-none sidebar-collapsed:opacity-0">
        {item.label}
      </span>
    </Link>
  )
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === '/' }}
      className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[0.6875rem] leading-none font-medium text-muted-foreground transition-colors duration-150 select-none [-webkit-touch-callout:none] hover:text-foreground active:bg-muted"
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
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const loading = useRouterState({ select: (state) => state.isLoading })

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr] md:transition-[grid-template-columns] md:duration-200 md:ease-out motion-reduce:transition-none md:sidebar-collapsed:grid-cols-[4.5rem_1fr]">
      {/* A slow page load gets a bar; a fast one (most, thanks to preloading)
          finishes inside the delay and shows nothing. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-primary transition-opacity duration-150',
          loading ? 'opacity-100 delay-300 motion-safe:animate-pulse' : 'opacity-0',
        )}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-popover"
      >
        Skip to content
      </a>

      <aside className="hidden overflow-hidden border-r md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-8 md:pt-[calc(1.5rem+env(safe-area-inset-top))] md:pr-4 md:pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pl-[max(1rem,env(safe-area-inset-left))]">
        <div className="flex min-h-11 items-center justify-between">
          <p
            className="px-3 font-serif text-xl font-semibold tracking-tight whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none sidebar-collapsed:pointer-events-none sidebar-collapsed:opacity-0"
            aria-hidden={collapsed}
          >
            Gratitude Tracker
          </p>
        </div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {primaryNav.map((item) => (
            <RailLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
        <nav aria-label="Account" className="mt-auto flex flex-col gap-1">
          {secondaryNav.map((item) => (
            <RailLink key={item.to} item={item} collapsed={collapsed} />
          ))}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
            className={cn(
              linkBase,
              'min-h-11 cursor-pointer overflow-hidden whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            <PanelLeftOpen
              className="hidden size-5 shrink-0 sidebar-collapsed:block"
              aria-hidden="true"
            />
            <PanelLeftClose
              className="size-5 shrink-0 sidebar-collapsed:hidden"
              aria-hidden="true"
            />
            <span className="transition-opacity duration-150 motion-reduce:transition-none sidebar-collapsed:opacity-0">
              Collapse
            </span>
          </button>
        </nav>
      </aside>

      <main
        id="main"
        className="mx-auto w-full max-w-4xl pt-[calc(2rem+env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-24 pl-[max(1rem,env(safe-area-inset-left))] md:pt-[calc(3rem+env(safe-area-inset-top))] md:pr-[max(2.5rem,env(safe-area-inset-right))] md:pb-16 md:pl-10"
      >
        {children}
      </main>

      <nav
        aria-label="Main"
        data-tab-bar
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pr-[env(safe-area-inset-right)] pb-[max(0px,calc(env(safe-area-inset-bottom)-0.75rem))] pl-[env(safe-area-inset-left)] md:hidden"
      >
        {mobileNav.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  )
}
