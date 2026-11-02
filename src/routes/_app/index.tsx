import { Link, createFileRoute } from '@tanstack/react-router'
import { EntryForm } from '@/components/entry-form'
import { EntryListItem } from '@/components/entry-list-item'
import { HeatMapDays } from '@/components/heat-map-days'
import { OnThisDay } from '@/components/on-this-day'
import { buttonVariants } from '@/components/ui/button'
import { loadDayEntries, useSetDay, validateDaySearch } from '@/lib/day-search'
import { getHeatFn, listEntriesFn, listTagsFn } from '@/lib/journal.functions'
import { usePendingDeleteIds, wasRestored } from '@/lib/pending-deletes'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/')({
  head: () => ({ meta: [{ title: 'Home · Gratitude Tracker' }] }),
  validateSearch: validateDaySearch,
  loaderDeps: ({ search }) => ({ day: search.day }),
  loader: async ({ deps }) => {
    const [recent, tags, heat, dayEntries] = await Promise.all([
      listEntriesFn({ data: { limit: 5 } }),
      listTagsFn(),
      getHeatFn({ data: { weeks: 14 } }),
      loadDayEntries(deps.day),
    ])
    return { ...recent, tags, heat, dayEntries }
  },
  component: Home,
})

function Home() {
  const { entries, total, tags, heat, dayEntries } = Route.useLoaderData()
  const { day } = Route.useSearch()
  const setDay = useSetDay()
  const { user } = Route.useRouteContext()
  const hidden = usePendingDeleteIds()
  const firstName = user.name.split(' ')[0]
  const visible = entries.filter((entry) => !hidden.has(entry.id))

  // First run: the page is the form, not a tour.
  if (total === 0) {
    return (
      <div className="flex max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            Welcome, {firstName}
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Write your first moment
          </h1>
          <p className="max-w-[65ch] text-muted-foreground">
            Think of one time you saw God at work, big or small. A title and a
            few sentences are enough. You can add tags, Scripture and how it
            turned out later.
          </p>
        </div>
        <EntryForm
          existingTags={tags.map((tag) => tag.name)}
          draftKey={`gg:draft:${user.id}`}
          submitLabel="Save moment"
          celebrate
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Hello, {firstName}
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Remember what God has done
          </h1>
        </div>
        <Link
          to="/moments/new"
          className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5')}
        >
          Add a moment
        </Link>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="heat-heading">
        <h2
          id="heat-heading"
          className="text-sm font-medium text-muted-foreground"
        >
          The last 14 weeks
        </h2>
        <HeatMapDays
          mapWrapper={(map) => (
            <div className="w-full max-w-[300px]">{map}</div>
          )}
          counts={heat.counts}
          end={heat.end}
          weeks={heat.weeks}
          compact
          ariaLabel="Heat map of moments per day over the last 14 weeks"
          day={day}
          entries={dayEntries}
          onDayChange={setDay}
        />
        <Link
          to="/insights"
          className="min-h-11 w-fit py-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          See your insights
        </Link>
      </section>

      <OnThisDay />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Most recent
        </h2>
        <ul className="flex flex-col gap-4">
          {visible.map((entry) => (
            <EntryListItem
              key={entry.id}
              entry={entry}
              restored={wasRestored(entry.id)}
            />
          ))}
        </ul>
        <Link
          to="/moments"
          className="min-h-11 w-fit py-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          See all {total} {total === 1 ? 'moment' : 'moments'}
        </Link>
      </section>
    </div>
  )
}
