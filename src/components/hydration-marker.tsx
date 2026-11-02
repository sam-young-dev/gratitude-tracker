import { useEffect } from 'react'

// Sets data-hydrated on <html> once React is interactive. Tests wait for it so
// they never click a server-rendered form before its handlers are attached.
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  return null
}
