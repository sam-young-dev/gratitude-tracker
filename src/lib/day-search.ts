// The ?day=YYYY-MM-DD param shared by the routes that show a heat map.
import { useNavigate } from '@tanstack/react-router'
import { parseDayParam } from '@/lib/dates'
import { listEntriesByDayFn } from '@/lib/journal.functions'

/** `validateSearch` for a route with a day panel. */
export const validateDaySearch = (
  search: Record<string, unknown>,
): { day?: string } => ({ day: parseDayParam(search.day) })

/** Loader helper: the selected day's moments, or none when no day is selected. */
export const loadDayEntries = (day?: string) =>
  day ? listEntriesByDayFn({ data: { date: day } }) : []

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
