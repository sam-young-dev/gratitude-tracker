import { useSyncExternalStore } from 'react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

// The theme is a `dark` class on <html> (set before first paint in __root.tsx).
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  return () => observer.disconnect()
}

const isDark = () => document.documentElement.classList.contains('dark')

const Toaster = (props: ToasterProps) => {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
