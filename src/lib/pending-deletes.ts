import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { deleteEntryFn } from '@/lib/journal.functions'

// Deleting a moment hides it at once and shows an undo toast; the real delete
// only runs when the toast closes. If the tab is closed first, nothing is
// deleted, which is the safe way to fail.

const UNDO_WINDOW_MS = 6000

let hidden = new Set<string>()
const listeners = new Set<() => void>()

function setHidden(next: Set<string>) {
  hidden = next
  listeners.forEach((listener) => listener())
}

const hide = (id: string) => setHidden(new Set(hidden).add(id))
const unhide = (id: string) => {
  const next = new Set(hidden)
  next.delete(id)
  setHidden(next)
}

// Ids just brought back by Undo, so their list item can play an entrance. Only
// Undo counts: a failed or settled delete also unhides, but shouldn't fade in.
const restored = new Set<string>()
export const wasRestored = (id: string) => restored.has(id)

/** Ids that were deleted but are still inside their undo window. */
export function usePendingDeleteIds() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => hidden,
    () => hidden,
  )
}

export function deleteWithUndo(
  entry: { id: string; title: string },
  onSettled: () => void,
) {
  let undone = false
  let committed = false
  hide(entry.id)

  const commit = async () => {
    if (undone || committed) return
    committed = true
    try {
      await deleteEntryFn({ data: { id: entry.id } })
    } catch {
      toast.error('We couldn’t delete that moment. It’s still in your journal.')
    } finally {
      unhide(entry.id)
      onSettled()
    }
  }

  toast('Moment deleted', {
    description: entry.title,
    duration: UNDO_WINDOW_MS,
    action: {
      label: 'Undo',
      onClick: () => {
        undone = true
        restored.add(entry.id)
        unhide(entry.id)
        setTimeout(() => restored.delete(entry.id), 500)
        onSettled()
      },
    },
    onDismiss: commit,
    onAutoClose: commit,
  })
}
