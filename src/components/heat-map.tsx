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
}

export function HeatMap({ counts, end, weeks, compact, ariaLabel }: Props) {
  const { cells, weekKeys } = useMemo(
    () => buildHeat(counts, end, weeks),
    [counts, end, weeks],
  )

  const definition = useMemo(
    () =>
      defineChart({
        // One mark per level so each cell takes its colour from the --heat-*
        // tokens, which follow light and dark mode.
        marks: LEVELS.map((level) =>
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
    [cells, weekKeys, compact],
  )

  // Seven rows plus the month labels; cells stay roughly square.
  const height = compact ? 150 : 170

  return (
    <Chart
      definition={definition}
      height={height}
      initialWidth={compact ? 300 : 800}
      ariaLabel={ariaLabel}
    />
  )
}
