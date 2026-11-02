import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { isRealDate } from '@/lib/dates'
import {
  entryInputSchema,
  idSchema,
  tagKey,
  tagNameSchema,
} from '@/lib/entry-schema'
import { heatStart, lastMonths, utcToday } from '@/lib/heat'
import * as journal from '@/server/journal'

async function requireUserId() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) throw new Error('Please sign in again.')
  return session.user.id
}

export const listEntriesFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) =>
    z
      .object({ limit: z.number().int().min(1).max(200).optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data }) =>
    journal.listEntries(await requireUserId(), data.limit),
  )

export const searchEntriesFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) =>
    z
      .object({
        q: z.string().trim().max(200).optional(),
        tag: z.string().trim().max(80).optional(),
        year: z.number().int().min(1900).max(2200).optional(),
        page: z.number().int().min(1).max(10000),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    journal.searchEntries(await requireUserId(), {
      ...data,
      q: data.q || undefined,
      tag: data.tag ? tagKey(data.tag) : undefined,
    }),
  )

export const getEntryFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => journal.getEntry(await requireUserId(), data.id))

export const createEntryFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => entryInputSchema.parse(data))
  .handler(async ({ data }) => journal.createEntry(await requireUserId(), data))

export const updateEntryFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    idSchema.extend({ entry: entryInputSchema }).parse(data),
  )
  .handler(async ({ data }) =>
    journal.updateEntry(await requireUserId(), data.id, data.entry),
  )

export const deleteEntryFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) =>
    journal.deleteEntry(await requireUserId(), data.id),
  )

export const listTagsFn = createServerFn({ method: 'GET' }).handler(async () =>
  journal.listTags(await requireUserId()),
)

export const renameTagFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) =>
    idSchema.extend({ name: tagNameSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      await journal.renameTag(await requireUserId(), data.id, data.name)
      return { ok: true as const }
    } catch (error) {
      if (error instanceof journal.TagConflictError) {
        return { ok: false as const, message: error.message }
      }
      throw error
    }
  })

export const deleteTagFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) =>
    journal.deleteTag(await requireUserId(), data.id),
  )

export const exportEntriesFn = createServerFn({ method: 'GET' }).handler(
  async () => ({
    entries: await journal.exportEntries(await requireUserId()),
    exportedAt: new Date().toISOString(),
  }),
)

const isoDate = z.string().refine(isRealDate, 'Choose a real date.')

export const getHeatFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) =>
    z.object({ weeks: z.number().int().min(1).max(53) }).parse(data),
  )
  .handler(async ({ data }) => {
    const end = utcToday()
    const counts = await journal.getHeat(
      await requireUserId(),
      heatStart(end, data.weeks),
      end,
    )
    return { counts, end, weeks: data.weeks }
  })

export const getInsightsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const userId = await requireUserId()
    const end = utcToday()
    const months = lastMonths(end, 12)
    const [insights, counts] = await Promise.all([
      journal.getInsights(userId, `${months[0]}-01`, end),
      journal.getHeat(userId, heatStart(end, 53), end),
    ])
    return { ...insights, counts, end, months }
  },
)

export const onThisDayFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => z.object({ today: isoDate }).parse(data))
  .handler(async ({ data }) => {
    const [year, month, day] = data.today.split('-').map(Number)
    return journal.onThisDay(await requireUserId(), month, day, year)
  })
