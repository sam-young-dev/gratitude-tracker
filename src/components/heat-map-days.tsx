import { useEffect, useRef } from 'react'
import { DayEntries } from '@/components/day-entries'
import { HeatMap } from '@/components/heat-map'
import { useDayEntries } from '@/lib/day-search'
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

/** A heat map plus the panel of moments for the day picked on it. */
export function HeatMapDays({
  day,
  loadedDay,
  onDayChange,
  mapWrapper = (map) => map,
  ...heat
}: Props) {
  const [entries, retry] = useDayEntries(day, loadedDay)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const focusPanel = useRef(false)

  // After a chart click the new panel is the next thing to read; list buttons
  // sit right beside it, so focus stays where it is.
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
        <HeatMap
          {...heat}
          selectedDay={day}
          onSelectDay={(next, source) => {
            focusPanel.current = source === 'chart'
            onDayChange(next === day ? undefined : next)
          }}
        />,
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
