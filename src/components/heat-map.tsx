import { useLayoutEffect, useMemo, useRef } from 'react'
import { cell, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { tooltip } from '@tanstack/charts/tooltip'
import { formatEntryDate } from '@/lib/dates'
import { buildHeat, monthLabelForWeek } from '@/lib/heat'
import type { HeatCell } from '@/lib/heat'

const LEVELS = [0, 1, 2, 3, 4] as const
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']
/** Narrowest a compact week column gets, so each day stays a comfortable tap target (WCAG 2.5.8 asks for 24px). */
const MIN_CELL = 28

type Props = {
  counts: ReadonlyArray<{ date: string; count: number }>
  end: string
  weeks: number
  /** Compact: no weekday labels; fills its container with square cells, scrolling sideways when too narrow to tap comfortably. */
  compact?: boolean
  ariaLabel: string
  /** The day whose moments are showing, as "YYYY-MM-DD". */
  selectedDay?: string
  /** `source` says whether the chart or the list asked, so the caller can manage focus. */
  onSelectDay?: (day: string, source: 'chart' | 'list') => void
}

export function HeatMap({
  counts,
  end,
  weeks,
  compact,
  ariaLabel,
  selectedDay,
  onSelectDay,
}: Props) {
  const { cells, weekKeys } = useMemo(
    () => buildHeat(counts, end, weeks),
    [counts, end, weeks],
  )

  // One mark per level so each cell takes its colour from the --heat-*
  // tokens, which follow light and dark mode. Kept apart from the selection so
  // picking a day doesn't re-filter every cell.
  const levelMarks = useMemo(
    () =>
      LEVELS.map((level) =>
        cell(
          cells.filter((c) => c.level === level),
          {
            x: 'week',
            y: 'weekday',
            key: (c: HeatCell) => c.date,
            fill: `var(--heat-${level})`,
            inset: 1,
            radius: 2,
          },
        ),
      ),
    [cells],
  )

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          ...levelMarks,
          // Ring the selected day and leave its fill alone. The background
          // halo keeps the ring readable over the lightest dark-mode cell.
          ...(['--background', '--foreground'] as const).map((token, i) =>
            cell(
              cells.filter((c) => c.date === selectedDay),
              {
                x: 'week',
                y: 'weekday',
                key: (c: HeatCell) => `selected-${i}-${c.date}`,
                fill: 'transparent',
                stroke: `var(${token})`,
                strokeWidth: i === 0 ? 4 : 2,
                inset: 1,
                radius: 2,
              },
            ),
          ),
        ],
        scales: {
          x: {
            scale: () => scaleBand<string>().domain(weekKeys).padding(0.08),
            axis: {
              ticks: {
                size: 0,
                values: weekKeys.filter((week) => monthLabelForWeek(week)),
                format: (v) => monthLabelForWeek(String(v)),
              },
              tickLabels: { thin: false },
            },
          },
          y: {
            scale: () => scaleBand<number>().domain(WEEKDAYS).padding(0.08),
            axis: compact
              ? false
              : {
                  ticks: {
                    size: 0,
                    format: (v) => WEEKDAY_LABELS[Number(v)] ?? '',
                  },
                },
          },
        },
        tooltip: {
          use: tooltip,
          format: (point) => {
            const c = point.datum
            const n = c.count
            return `${formatEntryDate(c.date)}: ${n} ${n === 1 ? 'moment' : 'moments'}`
          },
        },
      }),
    [levelMarks, cells, weekKeys, compact, selectedDay],
  )

  // Seven rows plus the month labels; cells stay roughly square. Compact maps
  // fill their container and their height follows the width (the labels take
  // about one more row). Below MIN_CELL per week they stop shrinking and scroll
  // sideways instead. Full maps scroll sideways at a fixed height.
  const sizing = compact
    ? { aspectRatio: weeks / 8, initialWidth: weeks * MIN_CELL }
    : { height: 170, initialWidth: 800 }

  // Open on the most recent weeks; older ones are a swipe to the left. Runs
  // before paint so the map never flashes at its oldest end.
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [weeks])

  // Tooltips are hover-only, so the same numbers are available as text.
  const days = useMemo(
    () =>
      counts
        .filter((row) => row.count > 0)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [counts],
  )

  return (
    <div>
      <div
        ref={compact ? scrollRef : undefined}
        className={compact ? 'overflow-x-auto overscroll-x-contain' : undefined}
      >
        <div style={compact ? { minWidth: weeks * MIN_CELL } : undefined}>
          <Chart
            definition={definition}
            {...sizing}
            ariaLabel={ariaLabel}
            onSelect={(point) => {
              if (point) onSelectDay?.(point.datum.date, 'chart')
            }}
          />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="flex items-center justify-end gap-1 py-1 text-xs text-muted-foreground"
      >
        <span>0</span>
        {LEVELS.map((level) => (
          <span
            key={level}
            className="size-3 rounded-[2px]"
            style={{ background: `var(--heat-${level})` }}
          />
        ))}
        <span>4+</span>
      </div>
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-3 text-muted-foreground">
          Show as a list
        </summary>
        {days.length === 0 ? (
          <p className="text-muted-foreground">No moments in this period.</p>
        ) : (
          <table className="w-full max-w-sm text-left tabular-nums">
            <thead>
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 font-medium">Moments</th>
              </tr>
            </thead>
            <tbody>
              {days.map((row) => (
                <tr key={row.date}>
                  <td>
                    <button
                      type="button"
                      aria-pressed={row.date === selectedDay}
                      onClick={() => onSelectDay?.(row.date, 'list')}
                      className="group min-h-11 text-left underline-offset-4 hover:underline"
                    >
                      {/* Reserved width, so selecting a day never reflows the text. */}
                      <span
                        aria-hidden="true"
                        className="inline-block w-4 opacity-0 group-aria-pressed:opacity-100"
                      >
                        ✓
                      </span>
                      {formatEntryDate(row.date)}
                    </button>
                  </td>
                  <td className="py-1">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </div>
  )
}
