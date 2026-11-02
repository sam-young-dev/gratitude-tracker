import { createFileRoute, useRouter } from '@tanstack/react-router'
import { EntryForm } from '@/components/entry-form'
import { parseDayParam } from '@/lib/dates'
import { listTagsFn } from '@/lib/journal.functions'

export const Route = createFileRoute('/_app/moments/new')({
  head: () => ({ meta: [{ title: 'Add a moment · Gratitude Tracker' }] }),
  validateSearch: (search: Record<string, unknown>): { date?: string } => ({
    date: parseDayParam(search.date),
  }),
  loader: () => listTagsFn(),
  component: NewMoment,
})

function NewMoment() {
  const tags = Route.useLoaderData()
  const { date } = Route.useSearch()
  const { user } = Route.useRouteContext()
  const router = useRouter()

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Add a moment
      </h1>
      <EntryForm
        existingTags={tags.map((tag) => tag.name)}
        draftKey={`gg:draft:${user.id}`}
        defaultDate={date}
        submitLabel="Save moment"
        onCancel={() => router.history.back()}
      />
    </div>
  )
}
