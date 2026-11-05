// Deletes that wait out an undo window before they are sent. Kept free of React,
// toasts and the network so the timing rules can be unit tested.
//
// A delete is "waiting" (still undoable) until its timer fires or something
// calls send/flush, then "sending" until the server answers. Both states count
// as hidden, so the item doesn't flash back while its request is in flight.

type Timer = ReturnType<typeof setTimeout>

export type DeleteQueueOptions = {
  undoWindowMs: number
  /** Deletes for real. A rejection means the item still exists. */
  commit: (id: string) => Promise<unknown>
  /** Runs after the server answers, before the item stops being hidden. */
  onSettled?: (id: string, ok: boolean) => Promise<unknown> | void
}

export function createDeleteQueue({
  undoWindowMs,
  commit,
  onSettled,
}: DeleteQueueOptions) {
  const waiting = new Map<string, Timer>()
  const sending = new Set<string>()
  const listeners = new Set<() => void>()
  let hidden: ReadonlySet<string> = new Set()

  function publish() {
    hidden = new Set([...waiting.keys(), ...sending])
    listeners.forEach((listener) => listener())
  }

  /** Sends a waiting delete now. Does nothing if it was undone or already sent. */
  async function send(id: string) {
    const timer = waiting.get(id)
    if (timer === undefined) return
    clearTimeout(timer)
    waiting.delete(id)
    sending.add(id)
    publish()
    let ok = true
    try {
      await commit(id)
    } catch {
      ok = false
    }
    try {
      await onSettled?.(id, ok)
    } finally {
      sending.delete(id)
      publish()
    }
  }

  return {
    /** Hides the item now and deletes it once the undo window passes. */
    schedule(id: string) {
      if (waiting.has(id) || sending.has(id)) return
      waiting.set(
        id,
        setTimeout(() => void send(id), undoWindowMs),
      )
      publish()
    },
    /** Cancels a waiting delete. False when it is too late (already sent). */
    undo(id: string) {
      const timer = waiting.get(id)
      if (timer === undefined) return false
      clearTimeout(timer)
      waiting.delete(id)
      publish()
      return true
    },
    send,
    /** Sends every waiting delete now, e.g. when the page is being left. */
    flush() {
      return Promise.all([...waiting.keys()].map(send))
    },
    /** Ids waiting out their undo window or being deleted. */
    hiddenIds: () => hidden,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type DeleteQueue = ReturnType<typeof createDeleteQueue>
