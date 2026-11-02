import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { EntryListItem } from '@/components/entry-list-item'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const ALL = 'all'

function Moments() {
  const { entries, matching, total, years, tags } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const hidden = usePendingDeleteIds()
  const visible = entries.filter((entry) => !hidden.has(entry.id))
  const [draft, setDraft] = useState(search.q ?? '')
  const searchRef = useRef<HTMLInputElement>(null)
  const tagItems = [
    { value: ALL, label: 'All tags' },
    ...tags.map((tag) => ({
      value: tag.name,
      label: `${tag.name} (${tag.count})`,
    })),
  ]
  const yearItems = [
    { value: ALL, label: 'All years' },
    ...years.map((year) => ({ value: String(year), label: String(year) })),
  ]

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
              <div className="relative">
                <Input
                  ref={searchRef}
                  type="search"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    if (!event.target.value && search.q)
                      update({ q: undefined })
                  }}
                  placeholder="Words, Scripture, how it turned out"
                  spellCheck={false}
                  autoComplete="off"
                  enterKeyHint="search"
                  className="h-11 pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                />
                {draft ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Clear search"
                    className="absolute top-1/2 right-0 -translate-y-1/2 text-muted-foreground"
                    onClick={() => {
                      setDraft('')
                      if (search.q) update({ q: undefined })
                      searchRef.current?.focus()
                    }}
                  >
                    <XIcon className="size-4" />
                  </Button>
                ) : null}
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Tag
              <Select
                items={tagItems}
                value={search.tag ?? ALL}
                onValueChange={(value) =>
                  update({ tag: value && value !== ALL ? value : undefined })
                }
              >
                <SelectTrigger aria-label="Filter by tag" className="min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tagItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Year
              <Select
                items={yearItems}
                value={search.year ? String(search.year) : ALL}
                onValueChange={(value) =>
                  update({
                    year: value && value !== ALL ? Number(value) : undefined,
                  })
                }
              >
                <SelectTrigger aria-label="Filter by year" className="min-w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <section aria-labelledby="results-heading">
              <h2 id="results-heading" className="sr-only">
                Moments
              </h2>
              <ul className="flex flex-col gap-4">
                {visible.map((entry) => (
                  <EntryListItem key={entry.id} entry={entry} />
                ))}
              </ul>
            </section>
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
