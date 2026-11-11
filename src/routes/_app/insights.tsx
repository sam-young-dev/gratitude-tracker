import { useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { barX, barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { HeatMapDays, preloadHeatMap } from '@/components/heat-map-days'
import { buttonVariants } from '@/components/ui/button'
import { loadDayEntries, useSetDay, validateDaySearch } from '@/lib/day-search'
import { getInsightsFn } from '@/lib/journal.functions'
import { monthShort } from '@/lib/heat'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/insights')({
  head: () => ({ meta: [{ title: 'Insights · Gratitude Tracker' }] }),
  validateSearch: validateDaySearch,
  loader: async ({ location }) => {
    const [insights, loadedDay] = await Promise.all([
      getInsightsFn(),
      loadDayEntries(location),
      preloadHeatMap(),
    ])
    return { ...insights, loadedDay }
  },
  component: Insights,
})

const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return `${monthShort(m)} ${String(y).slice(2)}`
}

/** Whole-number tick values from 0 to max, thinned to about six. */
function wholeTicks(max: number) {
  const step = Math.max(1, Math.ceil(max / 6))
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
}

function Insights() {
  const { total, monthly, byTag, counts, end, months, loadedDay } =
    Route.useLoaderData()
  const { day } = Route.useSearch()
  const setDay = useSetDay()

  const monthRows = useMemo(() => {
    const byMonth = new Map(monthly.map((row) => [row.month, row.count]))
    return months.map((month) => ({
      month,
      label: monthName(month),
      count: byMonth.get(month) ?? 0,
    }))
  }, [monthly, months])

  const monthChart = useMemo(
    () =>
      defineChart({
        marks: [
          barY(monthRows, {
            x: 'label',
            y: 'count',
            radius: 3,
            fill: 'var(--chart-bar)',
          }),
        ],
        scales: {
          x: { scale: () => scaleBand<string>().padding(0.25) },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: {
              ticks: {
                values: wholeTicks(Math.max(...monthRows.map((r) => r.count))),
                format: (v) => String(v),
              },
            },
          },
        },
        tooltip: {
          use: tooltip,
          format: (point) => {
            const row = point.datum as (typeof monthRows)[number]
            return `${row.label}: ${row.count} ${row.count === 1 ? 'moment' : 'moments'}`
          },
        },
      }),
    [monthRows],
  )

  const tagChart = useMemo(
    () =>
      defineChart({
        marks: [
          barX(byTag, {
            y: 'name',
            x: 'count',
            radius: 3,
            fill: 'var(--chart-bar)',
          }),
        ],
        scales: {
          y: { scale: () => scaleBand<string>().padding(0.3) },
          x: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: {
              ticks: {
                values: wholeTicks(Math.max(...byTag.map((r) => r.count))),
                format: (v) => String(v),
              },
            },
          },
        },
        tooltip: {
          use: tooltip,
          format: (point) => {
            const row = point.datum as (typeof byTag)[number]
            return `${row.name}: ${row.count} ${row.count === 1 ? 'moment' : 'moments'}`
          },
        },
      }),
    [byTag],
  )

  if (total === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Insights
        </h1>
        <div className="flex max-w-[65ch] flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Nothing to chart yet</h2>
            <p className="text-muted-foreground">
              Your heat map and the themes you notice most will appear here
              after your first moment.
            </p>
          </div>
          <Link
            to="/moments/new"
            className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}
          >
            Write your first moment
          </Link>
        </div>
      </div>
    )
  }

  const lastYear = counts.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="flex flex-col gap-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Insights
      </h1>

      <section className="flex flex-col gap-3" aria-labelledby="heat-heading">
        <h2 id="heat-heading" className="text-lg font-semibold">
          The past year
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {lastYear} {lastYear === 1 ? 'moment' : 'moments'} in the last 53
          weeks. Each square is a day; darker means more moments.
        </p>
        <HeatMapDays
          counts={counts}
          end={end}
          weeks={53}
          compact
          ariaLabel="Heat map of moments per day over the past year"
          day={day}
          loadedDay={loadedDay}
          onDayChange={setDay}
        />
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="month-heading">
        <h2 id="month-heading" className="text-lg font-semibold">
          Moments by month
        </h2>
        <p className="text-sm text-muted-foreground">The last 12 months.</p>
        <Chart
          definition={monthChart}
          height={260}
          initialWidth={800}
          ariaLabel="Moments per month over the last 12 months"
        />
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-3 text-muted-foreground">
            Show as a table
          </summary>
          <table className="w-full max-w-sm text-left tabular-nums">
            <thead>
              <tr>
                <th className="py-1 font-medium">Month</th>
                <th className="py-1 font-medium">Moments</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((row) => (
                <tr key={row.month}>
                  <td className="py-1">{row.label}</td>
                  <td className="py-1">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="tag-heading">
        <h2 id="tag-heading" className="text-lg font-semibold">
          What you notice most
        </h2>
        {byTag.length === 0 ? (
          <p className="max-w-[65ch] text-muted-foreground">
            Add tags to your moments and the themes you see most often will show
            up here.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Your most-used tags, up to 10.
            </p>
            <Chart
              definition={tagChart}
              height={Math.max(160, byTag.length * 36 + 40)}
              initialWidth={800}
              ariaLabel="Moments per tag, most used first"
            />
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer py-3 text-muted-foreground">
                Show as a table
              </summary>
              <table className="w-full max-w-sm text-left tabular-nums">
                <thead>
                  <tr>
                    <th className="py-1 font-medium">Tag</th>
                    <th className="py-1 font-medium">Moments</th>
                  </tr>
                </thead>
                <tbody>
                  {byTag.map((row) => (
                    <tr key={row.name}>
                      <td className="py-1">
                        <Link
                          to="/moments"
                          search={{ tag: row.name }}
                          className="underline-offset-4 hover:underline"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-1">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>
    </div>
  )
}
