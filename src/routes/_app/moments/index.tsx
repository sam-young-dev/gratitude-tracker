import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { EntryListItem } from '@/components/entry-list-item'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PAGE_SIZE } from '@/lib/entry-schema'
import { listTagsFn, searchEntriesFn } from '@/lib/journal.functions'
import { usePendingDeleteIds } from '@/lib/pending-deletes'
import { cn } from '@/lib/utils'

type Search = { q?: string; tag?: string; year?: number; page?: number }

export const Route = createFileRoute('/_app/moments/')({
  head: () => ({ meta: [{ title: 'Moments · Gratitude Tracker' }] }),
  validateSearch: (search: Record<string, unknown>): Search => {
    const year = Number(search.year)
    const page = Number(search.page)
    return {
      q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
      tag:
        typeof search.tag === 'string' && search.tag.trim()
          ? search.tag
          : undefined,
      year: Number.isInteger(year) && year >= 1900 ? year : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, tags] = await Promise.all([
      searchEntriesFn({
        data: {
          q: deps.q,
          tag: deps.tag,
          year: deps.year,
          page: deps.page ?? 1,
        },
      }),
      listTagsFn(),
    ])
    return { ...result, tags }
  },
  component: Moments,
})

const selectClass =
  'h-11 min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30'

function Moments() {
  const { entries, matching, total, years, tags } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const hidden = usePendingDeleteIds()
  const visible = entries.filter((entry) => !hidden.has(entry.id))
  const [draft, setDraft] = useState(search.q ?? '')

  const page = search.page ?? 1
  const pageCount = Math.max(1, Math.ceil(matching / PAGE_SIZE))
  const filtered = Boolean(search.q || search.tag || search.year)

  const update = (next: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, page: undefined, ...next }) })
  const goToPage = (target: number) =>
    navigate({
      search: (prev) => ({ ...prev, page: target > 1 ? target : undefined }),
    })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          Moments
        </h1>
        <Link
          to="/moments/new"
          className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5')}
        >
          Add a moment
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex max-w-[65ch] flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">No moments yet</h2>
            <p className="text-muted-foreground">
              Start with one thing you noticed God doing, big or small. You can
              add detail later.
            </p>
          </div>
          <Link
            to="/moments/new"
            className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}
          >
            Write your first moment
          </Link>
        </div>
      ) : (
        <>
          <form
            role="search"
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              update({ q: draft.trim() || undefined })
            }}
          >
            <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium">
              Search
              <Input
                type="search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Words, Scripture, how it turned out"
                className="h-11"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Tag
              <select
                className={selectClass}
                aria-label="Filter by tag"
                value={search.tag ?? ''}
                onChange={(event) =>
                  update({ tag: event.target.value || undefined })
                }
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.name}>
                    {tag.name} ({tag.count})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Year
              <select
                className={selectClass}
                aria-label="Filter by year"
                value={search.year ?? ''}
                onChange={(event) =>
                  update({
                    year: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  })
                }
              >
                <option value="">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" className="h-11 px-5">
              Search
            </Button>
            {filtered ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11"
                onClick={() => {
                  setDraft('')
                  navigate({ search: {} })
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </form>

          <p
            className="text-sm text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {filtered
              ? `${matching} of ${total} ${total === 1 ? 'moment' : 'moments'}`
              : `${total} ${total === 1 ? 'moment' : 'moments'}`}
            {pageCount > 1 ? `, page ${page} of ${pageCount}` : ''}
          </p>

          {visible.length === 0 ? (
            <p className="max-w-[65ch] text-muted-foreground">
              {filtered
                ? 'No moments match these filters. Try fewer words, or clear the filters.'
                : 'Nothing on this page.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((entry) => (
                <EntryListItem key={entry.id} entry={entry} />
              ))}
            </ul>
          )}

          {pageCount > 1 ? (
            <nav
              aria-label="Pages"
              className="flex items-center justify-between gap-4"
            >
              <Button
                variant="outline"
                className="h-11 px-5"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Newer
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {pageCount}
              </span>
              <Button
                variant="outline"
                className="h-11 px-5"
                disabled={page >= pageCount}
                onClick={() => goToPage(page + 1)}
              >
                Older
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  )
}
