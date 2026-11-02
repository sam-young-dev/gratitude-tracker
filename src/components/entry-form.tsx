import { useRouter } from '@tanstack/react-router'
import { ChevronRight, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { todayLocal } from '@/lib/dates'
import {
  MAX_TAGS,
  MAX_TAG_LENGTH,
  SUGGESTED_TAGS,
  cleanTags,
  entryInputSchema,
  normalizeTag,
  tagKey,
} from '@/lib/entry-schema'
import { createEntryFn, updateEntryFn } from '@/lib/journal.functions'
import { cn } from '@/lib/utils'

type Values = {
  entryDate: string
  title: string
  body: string
  scripture: string
  outcome: string
  tags: Array<string>
}

type Field = keyof Values
type Errors = Partial<Record<Field, string>>

const EMPTY: Values = {
  entryDate: '',
  title: '',
  body: '',
  scripture: '',
  outcome: '',
  tags: [],
}

const isBlank = (v: Values) =>
  !v.title.trim() &&
  !v.body.trim() &&
  !v.scripture.trim() &&
  !v.outcome.trim() &&
  v.tags.length === 0

const chipBase =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-150'

type Props = {
  /** Present when editing an existing moment. */
  entryId?: string
  initial?: Values
  /** Tag names this person has already used, offered as one-tap chips. */
  existingTags: Array<string>
  /** New moments autosave a draft under this key (per user). */
  draftKey?: string
  submitLabel: string
  onCancel?: () => void
}

export function EntryForm({
  entryId,
  initial,
  existingTags,
  draftKey,
  submitLabel,
  onCancel,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Values>(initial ?? EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string>()
  const [pending, setPending] = useState(false)
  const [today, setToday] = useState('')
  const [restored, setRestored] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const [tagError, setTagError] = useState<string>()
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initial?.scripture || initial?.outcome),
  )
  const hydrated = useRef(false)

  // Client-only: today's date and any saved draft depend on the browser.
  useEffect(() => {
    const now = todayLocal()
    setToday(now)
    let draft: Values | null = null
    if (draftKey && !initial) {
      try {
        const raw = localStorage.getItem(draftKey)
        if (raw) draft = { ...EMPTY, ...(JSON.parse(raw) as Partial<Values>) }
      } catch {
        // Storage can be blocked; the form still works without drafts.
      }
    }
    if (draft && !isBlank(draft)) {
      setValues({ ...draft, entryDate: draft.entryDate || now })
      setDetailsOpen(Boolean(draft.scripture || draft.outcome))
      setRestored(true)
    } else if (!initial) {
      setValues((v) => ({ ...v, entryDate: v.entryDate || now }))
    }
    hydrated.current = true
  }, [draftKey, initial])

  // Autosave a new moment's draft shortly after the last keystroke.
  useEffect(() => {
    if (!draftKey || initial || !hydrated.current) return
    const timer = setTimeout(() => {
      try {
        if (isBlank(values)) localStorage.removeItem(draftKey)
        else localStorage.setItem(draftKey, JSON.stringify(values))
      } catch {
        // ignore
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [values, draftKey, initial])

  function set<TKey extends Field>(key: TKey, value: Values[TKey]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function discardDraft() {
    try {
      if (draftKey) localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
    setValues({ ...EMPTY, entryDate: today })
    setRestored(false)
    setDetailsOpen(false)
  }

  function addTag(raw: string) {
    const name = normalizeTag(raw)
    if (!name) return
    if (values.tags.some((t) => tagKey(t) === tagKey(name))) {
      setTagError(`"${name}" is already added.`)
      return
    }
    if (values.tags.length >= MAX_TAGS) {
      setTagError(`You can use up to ${MAX_TAGS} tags on a moment.`)
      return
    }
    setTagError(undefined)
    set('tags', [...values.tags, name])
    setTagDraft('')
  }

  const removeTag = (name: string) => {
    setTagError(undefined)
    set(
      'tags',
      values.tags.filter((t) => t !== name),
    )
  }

  const suggestions = cleanTags([...existingTags, ...SUGGESTED_TAGS]).filter(
    (name) => !values.tags.some((t) => tagKey(t) === tagKey(name)),
  )
  const atTagLimit = values.tags.length >= MAX_TAGS

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    const parsed = entryInputSchema.safeParse(values)
    const next: Errors = {}
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field
        next[key] ??= issue.message
      }
    }
    // The browser knows the person's real "today"; the server can only approximate.
    if (!next.entryDate && values.entryDate > todayLocal()) {
      next.entryDate = "Moments can't be dated in the future."
    }
    setErrors(next)
    setFormError(undefined)
    const firstBad = (
      ['entryDate', 'title', 'body', 'scripture', 'outcome'] as const
    ).find((key) => next[key])
    if (firstBad || !parsed.success) {
      if (firstBad === 'scripture' || firstBad === 'outcome')
        setDetailsOpen(true)
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>(`[name="${firstBad ?? 'title'}"]`)
          ?.focus(),
      )
      return
    }

    setPending(true)
    try {
      let id = entryId
      if (entryId) {
        await updateEntryFn({ data: { id: entryId, entry: values } })
      } else {
        id = (await createEntryFn({ data: values })).id
      }
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey)
        } catch {
          // ignore
        }
      }
      toast.success(entryId ? 'Changes saved' : 'Moment saved')
      await router.invalidate()
      await router.navigate({
        to: '/moments/$entryId',
        params: { entryId: id! },
      })
    } catch {
      setFormError(
        "We couldn't save your moment. Your writing is still here, so check your connection and try again.",
      )
      setPending(false)
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      onKeyDown={(event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          formRef.current?.requestSubmit()
        }
      }}
      className="flex flex-col gap-6"
    >
      {restored ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm"
        >
          <span>We restored your unsaved draft.</span>
          <button
            type="button"
            onClick={discardDraft}
            className="min-h-11 font-medium text-primary underline-offset-4 hover:underline"
          >
            Start over
          </button>
        </div>
      ) : null}

      <FormField
        label="Date"
        name="entryDate"
        type="date"
        value={values.entryDate}
        max={today || undefined}
        onChange={(e) => set('entryDate', e.target.value)}
        error={errors.entryDate}
        className="h-11 w-full sm:w-auto sm:max-w-56"
      />

      <FormField
        label="Title"
        name="title"
        value={values.title}
        maxLength={200}
        autoComplete="off"
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="entry-body">What happened</Label>
        <Textarea
          id="entry-body"
          name="body"
          value={values.body}
          onChange={(e) => set('body', e.target.value)}
          aria-invalid={errors.body ? true : undefined}
          aria-describedby={errors.body ? 'entry-body-error' : undefined}
          rows={10}
          className="min-h-56 font-serif text-lg leading-relaxed md:text-lg"
        />
        {errors.body ? (
          <p
            id="entry-body-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {errors.body}
          </p>
        ) : null}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm leading-none font-medium">
          Tags{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </legend>

        {values.tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Selected tags">
            {values.tags.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => removeTag(name)}
                  aria-label={`Remove tag ${name}`}
                  className={cn(
                    chipBase,
                    'border-transparent bg-primary text-primary-foreground hover:opacity-90',
                  )}
                >
                  {name}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {suggestions.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Suggested tags">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => addTag(name)}
                  disabled={atTagLimit}
                  aria-label={`Add tag ${name}`}
                  className={cn(
                    chipBase,
                    'border-border bg-card text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground',
                  )}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex gap-2">
          <input
            aria-label="New tag name"
            value={tagDraft}
            maxLength={MAX_TAG_LENGTH}
            placeholder="Add your own tag"
            disabled={atTagLimit}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag(tagDraft)
              }
            }}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={atTagLimit || !tagDraft.trim()}
            onClick={() => addTag(tagDraft)}
          >
            Add tag
          </Button>
        </div>
        <p
          role={tagError ? 'alert' : undefined}
          className={cn(
            'text-sm',
            tagError ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {tagError ??
            (atTagLimit
              ? `You've reached the limit of ${MAX_TAGS} tags.`
              : `${values.tags.length} of ${MAX_TAGS} tags used.`)}
        </p>
      </fieldset>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="entry-details"
          className="flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-150',
              detailsOpen && 'rotate-90',
            )}
            aria-hidden="true"
          />
          {detailsOpen ? 'Hide details' : 'Add details'}
        </button>
        <div
          id="entry-details"
          hidden={!detailsOpen}
          className="flex flex-col gap-6"
        >
          <FormField
            label="Scripture"
            name="scripture"
            value={values.scripture}
            maxLength={200}
            autoComplete="off"
            hint="For example, Psalm 34:8."
            onChange={(e) => set('scripture', e.target.value)}
            error={errors.scripture}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-outcome">How it turned out</Label>
            <Textarea
              id="entry-outcome"
              name="outcome"
              value={values.outcome}
              onChange={(e) => set('outcome', e.target.value)}
              aria-invalid={errors.outcome ? true : undefined}
              rows={4}
              className="min-h-28 font-serif text-lg leading-relaxed md:text-lg"
            />
            <p className="text-sm text-muted-foreground">
              Leave this blank now and come back when you know.
            </p>
            {errors.outcome ? (
              <p role="alert" className="text-sm text-destructive">
                {errors.outcome}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 px-6"
          disabled={pending}
        >
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
        <span className="hidden text-sm text-muted-foreground md:inline">
          or press Ctrl/⌘ + Enter
        </span>
      </div>
    </form>
  )
}
