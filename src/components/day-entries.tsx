import { Link } from '@tanstack/react-router'
import { EntryListItem } from '@/components/entry-list-item'
import { Button } from '@/components/ui/button'
import { formatEntryDate } from '@/lib/dates'
import type { Ref } from 'react'
import type { EntrySummary } from '@/server/journal'

type Props = {
  /** "YYYY-MM-DD". */
  day: string
  entries: ReadonlyArray<EntrySummary>
  /** Latest day a moment can be added for; later days get no add link. */
  latestDay: string
  onClose: () => void
  headingRef?: Ref<HTMLHeadingElement>
}

export function DayEntries({
  day,
  entries,
  latestDay,
  onClose,
  headingRef,
}: Props) {
  const count = entries.length
  return (
    <section
      aria-labelledby="day-heading"
      className="flex flex-col gap-4 transition-opacity duration-150 ease-out-strong starting:opacity-0"
    >
      <div className="flex items-center justify-between gap-4">
        <h3
          id="day-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-medium outline-none"
        >
          {formatEntryDate(day)}
          <span className="text-muted-foreground tabular-nums">
            {' · '}
            {count} {count === 1 ? 'moment' : 'moments'}
          </span>
        </h3>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 px-4"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-start gap-1 text-sm">
          <p className="text-muted-foreground">No moments</p>
          {day <= latestDay ? (
            <Link
              to="/moments/new"
              search={{ date: day }}
              className="min-h-11 py-3 font-medium text-primary underline-offset-4 hover:underline"
            >
              Add a moment for this day
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <EntryListItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </section>
  )
}
