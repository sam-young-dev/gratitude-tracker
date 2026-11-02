import { useEffect, useState } from 'react'
import { EntryListItem } from '@/components/entry-list-item'
import { todayLocal } from '@/lib/dates'
import { onThisDayFn } from '@/lib/journal.functions'
import { cn } from '@/lib/utils'
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

  const empty = rows !== null && rows.length === 0

  // The slot is held while loading so the list below doesn't jump. When there is
  // nothing for today it collapses (0fr) instead of vanishing, and -mt-10 cancels
  // the parent's gap-10 so the settled layout matches having no slot at all.
  return (
    <div
      aria-hidden={empty || undefined}
      className={cn(
        'grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out-strong',
        empty ? '-mt-10 grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        {rows && rows.length > 0 ? (
          <section
            className="flex flex-col gap-4 transition-opacity duration-200 ease-out-strong starting:opacity-0"
            aria-labelledby="otd-heading"
          >
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
        ) : (
          <div
            className={cn(
              'h-40 rounded-xl bg-muted/60',
              !empty && 'motion-safe:animate-pulse',
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}
