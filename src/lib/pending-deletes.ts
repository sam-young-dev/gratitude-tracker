import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { createDeleteQueue } from '@/lib/delete-queue'
import { deleteEntryFn } from '@/lib/journal.functions'

// Deleting a moment hides it at once and shows an undo toast. The real delete
// is sent when the undo window ends, on this module's own timer rather than the
// toast's (Sonner pauses its timer while the toast is hovered or touched, and
// while the tab is hidden). Leaving or backgrounding the page sends any waiting
// delete straight away, with a keepalive request that outlives the page, so a
// confirmed delete isn't lost to a reload, a closed tab or a phone app switch.

export const UNDO_WINDOW_MS = 6000

// Lets the delete request finish even if the page unloads while it's in flight.
const keepaliveFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, keepalive: true })

type Pending = { toastId: string | number; onSettled: () => unknown }
const pending = new Map<string, Pending>()

const queue = createDeleteQueue({
  undoWindowMs: UNDO_WINDOW_MS,
  commit: (id) => {
    // Too late to undo now, so the toast offering it goes.
    const toastId = pending.get(id)?.toastId
    if (toastId !== undefined) toast.dismiss(toastId)
    return deleteEntryFn({ data: { id }, fetch: keepaliveFetch })
  },
  onSettled: async (id, ok) => {
    const entry = pending.get(id)
    pending.delete(id)
    if (!ok) {
      toast.error('We couldn’t delete that moment. It’s still in your journal.')
    }
    // Keep it hidden until fresh data has loaded, so it doesn't flash back.
    await entry?.onSettled()
  },
})

if (typeof document !== 'undefined') {
  // `visibilitychange` covers tab switches, app switches and most unloads;
  // `pagehide` catches the unloads where it doesn't fire (older iOS Safari).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void queue.flush()
  })
  window.addEventListener('pagehide', () => void queue.flush())
}

// Ids just brought back by Undo, so their list item can play an entrance. Only
// Undo counts: a failed or settled delete also unhides, but shouldn't fade in.
const restored = new Set<string>()
export const wasRestored = (id: string) => restored.has(id)

const noIds: ReadonlySet<string> = new Set()

/** Ids that were deleted but are still inside their undo window or in flight. */
export function usePendingDeleteIds() {
  return useSyncExternalStore(queue.subscribe, queue.hiddenIds, () => noIds)
}

export function deleteWithUndo(
  entry: { id: string; title: string },
  onSettled: () => unknown,
) {
  if (pending.has(entry.id)) return

  const toastId = toast('Moment deleted', {
    description: entry.title,
    duration: UNDO_WINDOW_MS,
    action: {
      label: 'Undo',
      onClick: () => {
        if (!queue.undo(entry.id)) return
        pending.delete(entry.id)
        restored.add(entry.id)
        setTimeout(() => restored.delete(entry.id), 500)
        onSettled()
      },
    },
    // Closing the toast early accepts the delete.
    onDismiss: () => void queue.send(entry.id),
  })
  pending.set(entry.id, { toastId, onSettled })
  queue.schedule(entry.id)
}
