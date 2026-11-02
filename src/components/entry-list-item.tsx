import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { formatEntryDate } from '@/lib/dates'
import type { EntrySummary } from '@/server/journal'

function excerpt(text: string, max = 180) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

export function EntryListItem({ entry }: { entry: EntrySummary }) {
  return (
    <li className="relative flex flex-col gap-2 rounded-xl bg-card p-5 shadow-card">
      <time
        dateTime={entry.entryDate}
        className="text-sm text-muted-foreground tabular-nums"
      >
        {formatEntryDate(entry.entryDate)}
      </time>
      <h3 className="font-serif text-xl font-semibold tracking-tight">
        {/* The ::after overlay stretches the link over the whole card. */}
        <Link
          to="/moments/$entryId"
          params={{ entryId: entry.id }}
          className="underline-offset-4 after:absolute after:inset-0 after:rounded-xl hover:underline"
        >
          {entry.title}
        </Link>
      </h3>
      <p className="max-w-[65ch] font-serif text-muted-foreground">
        {excerpt(entry.body)}
      </p>
      {entry.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {entry.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary">{tag}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
