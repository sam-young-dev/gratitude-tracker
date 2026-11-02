import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Paragraphs } from '@/components/paragraphs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatEntryDate } from '@/lib/dates'
import { getEntryFn, updateEntryFn } from '@/lib/journal.functions'
import { deleteWithUndo } from '@/lib/pending-deletes'
import { cn } from '@/lib/utils'
import type { EntrySummary } from '@/server/journal'

export const Route = createFileRoute('/_app/moments/$entryId/')({
  head: () => ({ meta: [{ title: 'Moment · Gratitude Tracker' }] }),
  loader: async ({ params }) => {
    const entry = await getEntryFn({ data: { id: params.entryId } })
    if (!entry) throw notFound()
    return { entry }
  },
  component: MomentDetail,
})

function MomentDetail() {
  const { entry } = Route.useLoaderData()
  const router = useRouter()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function remove() {
    setConfirmingDelete(false)
    deleteWithUndo(entry, () => router.invalidate())
    router.navigate({ to: '/moments' })
  }

  return (
    <article className="flex max-w-2xl flex-col gap-8">
      <Link
        to="/moments"
        className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All moments
      </Link>

      <header className="flex flex-col gap-3">
        <time
          dateTime={entry.entryDate}
          className="text-sm text-muted-foreground tabular-nums"
        >
          {formatEntryDate(entry.entryDate)}
        </time>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {entry.title}
        </h1>
        {entry.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {entry.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="secondary">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <Paragraphs text={entry.body} />

      {entry.scripture ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Scripture</span>
          <span className="mx-2" aria-hidden="true">
            ·
          </span>
          {entry.scripture}
        </p>
      ) : null}

      <Outcome entry={entry} />

      <div className="flex flex-col gap-10 border-t pt-6">
        <Link
          to="/moments/$entryId/edit"
          params={{ entryId: entry.id }}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'lg' }),
            'h-11 w-fit px-5',
          )}
        >
          Edit moment
        </Link>
        <div>
          <Button
            variant="destructive"
            className="h-11"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete moment
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this moment?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{entry.title}&rdquo; will be removed from your journal. You
              will have a few seconds to undo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-6 sm:justify-between">
            <AlertDialogCancel className="h-11">Keep moment</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              onClick={remove}
            >
              Delete moment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}

// "How it turned out": shown when written, otherwise an invitation to add it later.
function Outcome({ entry }: { entry: EntrySummary }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.outcome ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError(undefined)
    try {
      await updateEntryFn({
        data: {
          id: entry.id,
          entry: {
            entryDate: entry.entryDate,
            title: entry.title,
            body: entry.body,
            scripture: entry.scripture ?? '',
            outcome: text,
            tags: entry.tags,
          },
        },
      })
      toast.success('Update saved')
      await router.invalidate()
      setEditing(false)
    } catch {
      setError("We couldn’t save that. Your text is still here, so try again.")
    } finally {
      setPending(false)
    }
  }

  if (editing) {
    return (
      <form
        onSubmit={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            event.currentTarget.requestSubmit()
          }
        }}
        className="flex flex-col gap-3"
      >
        <Label htmlFor="outcome">How it turned out</Label>
        <Textarea
          id="outcome"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          className="min-h-28 font-serif text-lg leading-relaxed md:text-lg"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? 'Saving…' : 'Save update'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={pending}
            onClick={() => {
              setText(entry.outcome ?? '')
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-muted/60 p-5">
      <h2 className="text-sm font-medium text-muted-foreground">
        How it turned out
      </h2>
      {entry.outcome ? (
        <>
          <Paragraphs text={entry.outcome} />
          <Button
            variant="ghost"
            className="h-11 w-fit"
            onClick={() => setEditing(true)}
          >
            Edit update
          </Button>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">
            Not written yet. Come back when you can see how this unfolded.
          </p>
          <Button
            variant="outline"
            className="h-11 w-fit"
            onClick={() => setEditing(true)}
          >
            Add an update
          </Button>
        </>
      )}
    </section>
  )
}
