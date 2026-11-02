import { useMemo } from 'react'
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

type Props = {
  counts: ReadonlyArray<{ date: string; count: number }>
  end: string
  weeks: number
  /** Compact: shorter, no weekday labels. */
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

  const definition = useMemo(
    () =>
      defineChart({
        // One mark per level so each cell takes its colour from the --heat-*
        // tokens, which follow light and dark mode. The last mark rings the
        // selected day and leaves its fill alone.
        marks: [
          ...LEVELS.map((level) =>
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
          cell(
            cells.filter((c) => c.date === selectedDay),
            {
              x: 'week',
              y: 'weekday',
              key: (c: HeatCell) => `selected-${c.date}`,
              fill: 'transparent',
              stroke: 'var(--foreground)',
              strokeWidth: 2,
              inset: 1,
              radius: 2,
            },
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
    [cells, weekKeys, compact, selectedDay],
  )

  // Seven rows plus the month labels; cells stay roughly square.
  const height = compact ? 150 : 170

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
      <Chart
        definition={definition}
        height={height}
        initialWidth={compact ? 300 : 800}
        ariaLabel={ariaLabel}
        onSelect={(point) => {
          if (point) onSelectDay?.(point.datum.date, 'chart')
        }}
      />
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
                      className="min-h-11 text-left underline-offset-4 hover:underline aria-pressed:font-medium"
                    >
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
