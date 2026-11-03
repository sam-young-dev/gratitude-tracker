// The ?day=YYYY-MM-DD param shared by the routes that show a heat map.
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { parseDayParam } from '@/lib/dates'
import { listEntriesByDayFn } from '@/lib/journal.functions'
import type { EntrySummary } from '@/server/journal'

type Entries = ReadonlyArray<EntrySummary>

/** The day the page loader fetched, so a link with ?day renders on the server. */
export type LoadedDay = { day?: string; entries: Entries }

/** `validateSearch` for a route with a day panel. */
export const validateDaySearch = (
  search: Record<string, unknown>,
): { day?: string } => ({ day: parseDayParam(search.day) })

// Days fetched after the page loaded, so reopening one is instant. Cleared
// whenever a page loader runs, which includes router.invalidate() after a save
// or delete. Only the browser ever writes to it.
const fetchedDays = new Map<string, Entries>()

/**
 * Loader helper: the selected day's moments. The day is read from the location
 * rather than loaderDeps, so picking a day doesn't rerun the rest of the loader.
 */
export async function loadDayEntries(location: {
  search: object
}): Promise<LoadedDay> {
  fetchedDays.clear()
  const { day } = validateDaySearch(location.search as Record<string, unknown>)
  return {
    day,
    entries: day ? await listEntriesByDayFn({ data: { date: day } }) : [],
  }
}

/**
 * The day's moments (undefined while loading, null if they couldn't load) and
 * a function that tries a failed load again.
 */
export function useDayEntries(day: string | undefined, loaded: LoadedDay) {
  const [fetched, setFetched] = useState<{
    day: string
    entries: Entries | null
  }>()
  const [attempt, setAttempt] = useState(0)
  const fromLoader = day === loaded.day

  useEffect(() => {
    if (!day || fromLoader || fetchedDays.has(day)) return
    let cancelled = false
    listEntriesByDayFn({ data: { date: day } })
      .then((entries) => {
        fetchedDays.set(day, entries)
        if (!cancelled) setFetched({ day, entries })
      })
      .catch(() => {
        if (!cancelled) setFetched({ day, entries: null })
      })
    return () => {
      cancelled = true
    }
  }, [day, fromLoader, attempt])

  const retry = () => {
    setFetched(undefined)
    setAttempt((n) => n + 1)
  }
  const entries: Entries | null | undefined = !day
    ? []
    : fromLoader
      ? loaded.entries
      : (fetchedDays.get(day) ??
        (fetched?.day === day ? fetched.entries : undefined))
  return [entries, retry] as const
}

/** Select a day (or clear it with undefined) on the current route. */
export function useSetDay() {
  const navigate = useNavigate()
  return (day: string | undefined) =>
    navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, day }),
      resetScroll: false,
    })
}
