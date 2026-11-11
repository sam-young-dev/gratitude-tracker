import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { DayEntries } from '@/components/day-entries'
import { useDayEntries } from '@/lib/day-search'
import type { HeatMap } from '@/components/heat-map'
import type { ComponentProps, ReactNode } from 'react'
import type { LoadedDay } from '@/lib/day-search'

type Props = Omit<
  ComponentProps<typeof HeatMap>,
  'selectedDay' | 'onSelectDay'
> & {
  /** The selected day, or undefined when the panel is closed. */
  day?: string
  /** From the page loader; other days are fetched here when picked. */
  loadedDay: LoadedDay
  /** Called with the new day, or undefined to close. */
  onDayChange: (day: string | undefined) => void
  /** Wraps the map alone (sizing, scrolling); the panel always takes the full width. */
  mapWrapper?: (map: ReactNode) => ReactNode
}

// The chart library is the heaviest thing on the page. Loading it lazily keeps
// it out of the route chunk, so a slow phone hydrates the rest of the page
// first; the server-rendered map stays on screen until its own chunk arrives.
let loaded: typeof HeatMap | undefined
let loading: Promise<{ default: typeof HeatMap }> | undefined
function loadHeatMap() {
  loading ??= import('@/components/heat-map').then((m) => {
    loaded = m.HeatMap
    return { default: m.HeatMap }
  })
  return loading
}
const LazyHeatMap = lazy(loadHeatMap)
// The server renders the map inline, never a fallback.
if (typeof window === 'undefined') void loadHeatMap()

/** Starts fetching the chart, so a client navigation renders it without a fallback. */
export const preloadHeatMap = () => loadHeatMap().then(() => undefined)

/** A heat map plus the panel of moments for the day picked on it. */
export function HeatMapDays({
  day,
  loadedDay,
  onDayChange,
  mapWrapper = (map) => map,
  ...heat
}: Props) {
  const [entries, retry] = useDayEntries(day, loadedDay)
  // Pick once: switching from the lazy wrapper to the module later would
  // remount the chart.
  const [HeatMapView] = useState(() => loaded ?? LazyHeatMap)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusPanel = useRef(false)

  // After a chart click the new panel is the next thing to read.
  useEffect(() => {
    if (day && focusPanel.current) headingRef.current?.focus()
    focusPanel.current = false
  }, [day])

  // The callback is inline in the routes, so read it through a ref rather than
  // resubscribing the listener on every render.
  const onDayChangeRef = useRef(onDayChange)
  useEffect(() => {
    onDayChangeRef.current = onDayChange
  })

  useEffect(() => {
    if (!day) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // Escape inside a field or an open overlay belongs to that control.
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable], [role="dialog"], [role="listbox"], [role="menu"]',
        )
      ) {
        return
      }
      onDayChangeRef.current(undefined)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [day])

  return (
    <div className="flex flex-col gap-4">
      {mapWrapper(
        <Suspense fallback={<HeatMapPlaceholder {...heat} />}>
          <HeatMapView
            {...heat}
            selectedDay={day}
            onSelectDay={(next) => {
              focusPanel.current = true
              onDayChange(next === day ? undefined : next)
            }}
          />
        </Suspense>,
      )}
      {day ? (
        <DayEntries
          day={day}
          entries={entries}
          latestDay={heat.end}
          onClose={() => onDayChange(undefined)}
          onRetry={retry}
          headingRef={headingRef}
        />
      ) : null}
    </div>
  )
}

/** Holds the map's space if it ever has to wait for its chunk on the client. */
function HeatMapPlaceholder({
  weeks,
  compact,
}: Pick<ComponentProps<typeof HeatMap>, 'weeks' | 'compact'>) {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg bg-muted/60"
      style={
        compact
          ? { aspectRatio: `${weeks} / 8`, minHeight: 7 * 14 }
          : { height: 170 }
      }
    />
  )
}
