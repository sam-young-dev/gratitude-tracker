import { Link } from '@tanstack/react-router'
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

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1')
    } catch {
      // storage unavailable; default to expanded
    }
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

  return [collapsed, toggle] as const
}

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:bg-muted'
const linkActive = 'bg-muted text-foreground'

function RailLink({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
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
      <span
        className={cn(
          'transition-opacity duration-150 motion-reduce:transition-none',
          collapsed && 'opacity-0',
        )}
      >
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
      className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground active:bg-muted"
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

  return (
    <div
      className={cn(
        'min-h-dvh md:grid md:transition-[grid-template-columns] md:duration-200 md:ease-out motion-reduce:transition-none',
        collapsed ? 'md:grid-cols-[4.5rem_1fr]' : 'md:grid-cols-[15rem_1fr]',
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-popover"
      >
        Skip to content
      </a>

      <aside className="hidden overflow-hidden border-r md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-8 md:px-4 md:py-6">
        <div className="flex min-h-11 items-center justify-between">
          <p
            className={cn(
              'px-3 font-serif text-xl font-semibold tracking-tight whitespace-nowrap transition-opacity duration-150 motion-reduce:transition-none',
              collapsed && 'pointer-events-none opacity-0',
            )}
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
            {collapsed ? (
              <PanelLeftOpen className="size-5 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5 shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                'transition-opacity duration-150 motion-reduce:transition-none',
                collapsed && 'opacity-0',
              )}
            >
              Collapse
            </span>
          </button>
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
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mobileNav.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  )
}
