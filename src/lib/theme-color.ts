/** The --background token in each scheme as hex, so the status bar matches the page. */
export const THEME_COLORS = { light: '#faf5ec', dark: '#1a1511' } as const

type ForcedScheme = 'light' | 'dark' | null

declare global {
  interface Window {
    __setThemeColorOverride?: (scheme: ForcedScheme) => void
  }
}

/**
 * The <head> theme-color tags follow the OS scheme. When someone forces a theme
 * in Settings, a tag with no media query goes first so the browser uses it
 * instead. Passing null drops it and falls back to the OS.
 *
 * Written as a plain JS string, not a TS function inlined with toString(): the
 * server and client bundles compile functions differently, which made the
 * pre-paint <script> text mismatch during hydration. The pre-paint script in
 * __root.tsx defines it on window, and setThemeColorOverride below calls it.
 */
export const themeColorOverrideSource = `function (scheme) {
  var colors = ${JSON.stringify(THEME_COLORS)}
  var meta = document.getElementById('theme-color-override')
  if (!scheme) {
    if (meta) meta.remove()
    return
  }
  if (!meta) {
    meta = document.createElement('meta')
    meta.id = 'theme-color-override'
    meta.name = 'theme-color'
    document.head.prepend(meta)
  }
  meta.content = colors[scheme]
}`

export function setThemeColorOverride(scheme: ForcedScheme) {
  window.__setThemeColorOverride?.(scheme)
}
