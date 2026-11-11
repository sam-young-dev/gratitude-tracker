import { useEffect, useState } from 'react'
import { EntryListItem } from '@/components/entry-list-item'
import { todayLocal } from '@/lib/dates'
import { onThisDayFn } from '@/lib/journal.functions'
import { cn } from '@/lib/utils'
import type { EntrySummary } from '@/server/journal'

type Props = {
  /**
   * From the page loader. Null when the server rendered without the time zone
   * cookie (a first visit), because "today" is the person's local date, which
   * the server can't otherwise know; those rows are then fetched here.
   */
  preloaded: Array<EntrySummary> | null
}

export function OnThisDay({ preloaded }: Props) {
  const [fetched, setFetched] = useState<Array<EntrySummary> | null>(null)
  const needsFetch = preloaded === null

  useEffect(() => {
    if (!needsFetch) return
    let cancelled = false
    onThisDayFn({ data: { today: todayLocal() } })
      .then((result) => {
        if (!cancelled) setFetched(result)
      })
      .catch(() => {
        if (!cancelled) setFetched([])
      })
    return () => {
      cancelled = true
    }
  }, [needsFetch])

  // Already known to be empty: render nothing, so nothing has to collapse.
  if (preloaded?.length === 0) return null

  const rows = preloaded ?? fetched
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
            className={cn(
              'flex flex-col gap-4',
              // Fade only when the rows arrive after the page; preloaded rows
              // appear with everything else.
              !preloaded &&
                'transition-opacity duration-200 ease-out-strong starting:opacity-0',
            )}
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
