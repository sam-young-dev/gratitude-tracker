import { useEffect, useState } from 'react'
import { EntryListItem } from '@/components/entry-list-item'
import { todayLocal } from '@/lib/dates'
import { onThisDayFn } from '@/lib/journal.functions'
import type { EntrySummary } from '@/server/journal'

// Fetched in the browser because "today" is the person's local date, which the
// server can't know.
export function OnThisDay() {
  const [rows, setRows] = useState<Array<EntrySummary> | null>(null)

  useEffect(() => {
    let cancelled = false
    onThisDayFn({ data: { today: todayLocal() } })
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Hold the space while loading so the list below doesn't jump.
  if (!rows) {
    return (
      <div
        className="h-40 motion-safe:animate-pulse rounded-xl bg-muted/60"
        aria-hidden="true"
      />
    )
  }
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-4" aria-labelledby="otd-heading">
      <h2
        id="otd-heading"
        className="text-sm font-medium text-muted-foreground"
      >
        On this day
      </h2>
      <ul className="flex flex-col gap-4">
        {rows.map((entry) => (
          <EntryListItem key={entry.id} entry={entry} />
        ))}
      </ul>
    </section>
  )
}
