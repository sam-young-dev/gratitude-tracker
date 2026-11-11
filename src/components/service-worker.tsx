import { useEffect } from 'react'

// Registers /sw.js so the app can be installed to a phone's home screen.
// Production only: in dev a service worker would fight Vite's module server.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('Service worker registration failed', error)
    })
  }, [])
  return null
}
