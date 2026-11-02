import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { MAX_TAG_LENGTH } from '@/lib/entry-schema'
import { deleteTagFn, listTagsFn, renameTagFn } from '@/lib/journal.functions'

export const Route = createFileRoute('/_app/tags')({
  head: () => ({ meta: [{ title: 'Tags · Gratitude Tracker' }] }),
  loader: () => listTagsFn(),
  component: Tags,
})

type Tag = { id: string; name: string; count: number }

function Tags() {
  const tags = Route.useLoaderData()

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Tags</h1>
      {tags.length === 0 ? (
        <p className="max-w-[65ch] text-muted-foreground">
          You haven&rsquo;t used any tags yet. Add tags when you write a moment,
          and they&rsquo;ll be listed here so you can rename or delete them.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl bg-card shadow-card">
          {tags.map((tag) => (
            <TagRow key={tag.id} tag={tag} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TagRow({ tag }: { tag: Tag }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function rename(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    if (!name.trim()) {
      setError('Enter a name for the tag.')
      return
    }
    setPending(true)
    setError(undefined)
    try {
      const result = await renameTagFn({ data: { id: tag.id, name } })
      if (!result.ok) {
        setError(result.message)
        return
      }
      toast.success('Tag renamed')
      await router.invalidate()
      setEditing(false)
    } catch {
      setError(
        "We couldn't rename that tag. Check your connection and try again.",
      )
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    setConfirmingDelete(false)
    try {
      await deleteTagFn({ data: { id: tag.id } })
      toast.success(`Deleted tag "${tag.name}"`)
      await router.invalidate()
    } catch {
      toast.error("We couldn't delete that tag. Try again.")
    }
  }

  const uses = `${tag.count} ${tag.count === 1 ? 'moment' : 'moments'}`

  return (
    <li className="flex flex-col gap-3 p-4">
      {editing ? (
        <form onSubmit={rename} className="flex flex-col gap-3">
          <label htmlFor={`tag-${tag.id}`} className="text-sm font-medium">
            New name for &ldquo;{tag.name}&rdquo;
          </label>
          <input
            id={`tag-${tag.id}`}
            value={name}
            maxLength={MAX_TAG_LENGTH}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `tag-${tag.id}-error` : undefined}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
          />
          {error ? (
            <p
              id={`tag-${tag.id}-error`}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? 'Saving…' : 'Save name'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={pending}
              onClick={() => {
                setName(tag.name)
                setError(undefined)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{tag.name}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{uses}</p>
          </div>
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setEditing(true)}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              className="h-11 text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete the tag &ldquo;{tag.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tag.count > 0
                ? `It will be removed from ${uses}. The moments themselves stay.`
                : 'No moments use it, so nothing else changes.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-6 sm:justify-between">
            <AlertDialogCancel className="h-11">Keep tag</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              onClick={remove}
            >
              Delete tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
