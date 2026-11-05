import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDeleteQueue } from './delete-queue'

const WINDOW = 6000

function setup(commit: (id: string) => Promise<unknown> = async () => {}) {
  const commitSpy = vi.fn(commit)
  const onSettled = vi.fn()
  const queue = createDeleteQueue({
    undoWindowMs: WINDOW,
    commit: commitSpy,
    onSettled,
  })
  return { queue, commit: commitSpy, onSettled }
}

describe('createDeleteQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides at once and deletes when the undo window ends', async () => {
    const { queue, commit, onSettled } = setup()
    queue.schedule('a')
    expect(queue.hiddenIds().has('a')).toBe(true)

    await vi.advanceTimersByTimeAsync(WINDOW - 1)
    expect(commit).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('a')
    expect(onSettled).toHaveBeenCalledWith('a', true)
    expect(queue.hiddenIds().has('a')).toBe(false)
  })

  it('never deletes once undone', async () => {
    const { queue, commit } = setup()
    queue.schedule('a')
    expect(queue.undo('a')).toBe(true)
    expect(queue.hiddenIds().has('a')).toBe(false)

    await vi.advanceTimersByTimeAsync(WINDOW * 2)
    await queue.flush()
    await queue.send('a')
    expect(commit).not.toHaveBeenCalled()
  })

  it('flush sends every waiting delete now, once each', async () => {
    const { queue, commit } = setup()
    queue.schedule('a')
    queue.schedule('b')
    await queue.flush()
    expect(commit.mock.calls.map(([id]) => id).sort()).toEqual(['a', 'b'])

    // The timers were cleared, and a second flush has nothing left to send.
    await vi.advanceTimersByTimeAsync(WINDOW * 2)
    await queue.flush()
    expect(commit).toHaveBeenCalledTimes(2)
  })

  it('send (closing the toast) commits early, and the timer does not repeat it', async () => {
    const { queue, commit } = setup()
    queue.schedule('a')
    await queue.send('a')
    await queue.send('a')
    await vi.advanceTimersByTimeAsync(WINDOW * 2)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('is too late to undo once the delete is in flight', async () => {
    let finish!: () => void
    const { queue } = setup(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    queue.schedule('a')
    const sent = queue.send('a')
    expect(queue.undo('a')).toBe(false)
    // Still hidden while the request is in flight, so it can't flash back.
    expect(queue.hiddenIds().has('a')).toBe(true)
    finish()
    await sent
    expect(queue.hiddenIds().has('a')).toBe(false)
  })

  it('stays hidden until onSettled finishes (fresh data has loaded)', async () => {
    let reloaded!: () => void
    const queue = createDeleteQueue({
      undoWindowMs: WINDOW,
      commit: async () => {},
      onSettled: () =>
        new Promise<void>((resolve) => {
          reloaded = resolve
        }),
    })
    queue.schedule('a')
    const sent = queue.send('a')
    await vi.advanceTimersByTimeAsync(0)
    expect(queue.hiddenIds().has('a')).toBe(true)
    reloaded()
    await sent
    expect(queue.hiddenIds().has('a')).toBe(false)
  })

  it('reports a failed delete and unhides the item', async () => {
    const { queue, onSettled } = setup(() =>
      Promise.reject(new Error('offline')),
    )
    queue.schedule('a')
    await queue.flush()
    expect(onSettled).toHaveBeenCalledWith('a', false)
    expect(queue.hiddenIds().has('a')).toBe(false)
  })

  it('ignores a second schedule for the same id', async () => {
    const { queue, commit } = setup()
    queue.schedule('a')
    queue.schedule('a')
    await vi.advanceTimersByTimeAsync(WINDOW * 2)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers and keeps the snapshot stable between changes', () => {
    const { queue } = setup()
    const listener = vi.fn()
    const unsubscribe = queue.subscribe(listener)
    const before = queue.hiddenIds()
    expect(queue.hiddenIds()).toBe(before)

    queue.schedule('a')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(queue.hiddenIds()).not.toBe(before)

    unsubscribe()
    queue.undo('a')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
