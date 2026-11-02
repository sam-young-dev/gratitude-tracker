import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { EntryForm } from '@/components/entry-form'
import { getEntryFn, listTagsFn } from '@/lib/journal.functions'

export const Route = createFileRoute('/_app/moments/$entryId/edit')({
  head: () => ({ meta: [{ title: 'Edit moment · Moment Tracker' }] }),
  loader: async ({ params }) => {
    const [entry, tags] = await Promise.all([
      getEntryFn({ data: { id: params.entryId } }),
      listTagsFn(),
    ])
    if (!entry) throw notFound()
    return { entry, tags }
  },
  component: EditMoment,
})

function EditMoment() {
  const { entry, tags } = Route.useLoaderData()
  const router = useRouter()

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Edit moment
      </h1>
      <EntryForm
        entryId={entry.id}
        initial={{
          entryDate: entry.entryDate,
          title: entry.title,
          body: entry.body,
          scripture: entry.scripture ?? '',
          outcome: entry.outcome ?? '',
          tags: entry.tags,
        }}
        existingTags={tags.map((tag) => tag.name)}
        submitLabel="Save changes"
        onCancel={() => router.history.back()}
      />
    </div>
  )
}
