// Server-only data layer for entries and tags. Two layers keep one person's data
// from reaching another:
//   1. every query is filtered by userId, and
//   2. every call runs in a transaction that sets `app.user_id`, which the
//      row-level security policies (drizzle/0002_rls.sql) check. The app connects
//      as `app_user`, which has no BYPASSRLS, so a missed filter returns nothing.
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { entries, entryTags, tags } from '@/db/schema'
import { PAGE_SIZE, tagKey } from '@/lib/entry-schema'
import type { EntryInput } from '@/lib/entry-schema'

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
    return fn(tx)
  })
}

export type EntrySummary = {
  id: string
  entryDate: string
  title: string
  body: string
  scripture: string | null
  outcome: string | null
  tags: Array<string>
}

async function attachTags(
  tx: Tx,
  userId: string,
  rows: Array<Omit<EntrySummary, 'tags'>>,
): Promise<Array<EntrySummary>> {
  if (rows.length === 0) return []
  const links = await tx
    .select({ entryId: entryTags.entryId, name: tags.name })
    .from(entryTags)
    .innerJoin(tags, eq(tags.id, entryTags.tagId))
    .where(
      and(
        eq(tags.userId, userId),
        inArray(
          entryTags.entryId,
          rows.map((row) => row.id),
        ),
      ),
    )
    .orderBy(tags.name)
  const byEntry = new Map<string, Array<string>>()
  for (const link of links) {
    byEntry.set(link.entryId, [...(byEntry.get(link.entryId) ?? []), link.name])
  }
  return rows.map((row) => ({ ...row, tags: byEntry.get(row.id) ?? [] }))
}

const entryColumns = {
  id: entries.id,
  entryDate: entries.entryDate,
  title: entries.title,
  body: entries.body,
  scripture: entries.scripture,
  outcome: entries.outcome,
}

export function listEntries(userId: string, limit = 50) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.entryDate), desc(entries.createdAt))
      .limit(limit)
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(entries)
      .where(eq(entries.userId, userId))
    return { entries: await attachTags(tx, userId, rows), total }
  })
}

/** Every moment written for one calendar day, newest first. */
export function listEntriesByDay(userId: string, date: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.entryDate, date)))
      .orderBy(desc(entries.createdAt))
    return attachTags(tx, userId, rows)
  })
}

/** Every moment, oldest first, for export. */
export function exportEntries(userId: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(entries.entryDate, entries.createdAt)
    const withTags = await attachTags(tx, userId, rows)
    return withTags.map(({ id: _id, ...entry }) => entry)
  })
}

export type EntryFilters = {
  q?: string
  /** A tag's name_key (lower-cased). */
  tag?: string
  year?: number
  page: number
}

// Must match the expression behind entries_search_idx (drizzle/0004).
const searchVector = sql`to_tsvector('english',
  ${entries.title} || ' ' || ${entries.body} || ' ' || coalesce(${entries.scripture}, '') || ' ' || coalesce(${entries.outcome}, ''))`

export function searchEntries(userId: string, filters: EntryFilters) {
  return withUser(userId, async (tx) => {
    const conditions = [eq(entries.userId, userId)]
    if (filters.q) {
      conditions.push(
        sql`${searchVector} @@ websearch_to_tsquery('english', ${filters.q})`,
      )
    }
    if (filters.tag) {
      conditions.push(
        sql`exists (
          select 1 from ${entryTags}
          inner join ${tags} on ${tags.id} = ${entryTags.tagId}
          where ${entryTags.entryId} = ${entries.id}
            and ${tags.userId} = ${userId}
            and ${tags.nameKey} = ${filters.tag}
        )`,
      )
    }
    if (filters.year) {
      conditions.push(
        sql`extract(year from ${entries.entryDate})::int = ${filters.year}`,
      )
    }
    const where = and(...conditions)

    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(where)
      .orderBy(desc(entries.entryDate), desc(entries.createdAt))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE)
    const [{ matching }] = await tx
      .select({ matching: sql<number>`count(*)::int` })
      .from(entries)
      .where(where)
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(entries)
      .where(eq(entries.userId, userId))
    const yearRows = await tx
      .selectDistinct({
        year: sql<number>`extract(year from ${entries.entryDate})::int`,
      })
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(sql`1`))

    return {
      entries: await attachTags(tx, userId, rows),
      matching,
      total,
      years: yearRows.map((row) => row.year),
    }
  })
}

export function getEntry(userId: string, id: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(and(eq(entries.userId, userId), eq(entries.id, id)))
    if (rows.length === 0) return null
    return (await attachTags(tx, userId, rows))[0]
  })
}

async function setEntryTags(
  tx: Tx,
  userId: string,
  entryId: string,
  names: Array<string>,
) {
  await tx.delete(entryTags).where(eq(entryTags.entryId, entryId))
  if (names.length === 0) return
  await tx
    .insert(tags)
    .values(names.map((name) => ({ userId, name, nameKey: tagKey(name) })))
    .onConflictDoNothing({ target: [tags.userId, tags.nameKey] })
  const found = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(eq(tags.userId, userId), inArray(tags.nameKey, names.map(tagKey))),
    )
  await tx
    .insert(entryTags)
    .values(found.map((tag) => ({ entryId, tagId: tag.id })))
}

export function createEntry(userId: string, input: EntryInput) {
  return withUser(userId, async (tx) => {
    const [row] = await tx
      .insert(entries)
      .values({
        userId,
        entryDate: input.entryDate,
        title: input.title,
        body: input.body,
        scripture: input.scripture,
        outcome: input.outcome,
      })
      .returning({ id: entries.id })
    await setEntryTags(tx, userId, row.id, input.tags)
    return row
  })
}

export function updateEntry(userId: string, id: string, input: EntryInput) {
  return withUser(userId, async (tx) => {
    const updated = await tx
      .update(entries)
      .set({
        entryDate: input.entryDate,
        title: input.title,
        body: input.body,
        scripture: input.scripture,
        outcome: input.outcome,
      })
      .where(and(eq(entries.userId, userId), eq(entries.id, id)))
      .returning({ id: entries.id })
    if (updated.length === 0) throw new Error('That moment no longer exists.')
    await setEntryTags(tx, userId, id, input.tags)
    return updated[0]
  })
}

export function deleteEntry(userId: string, id: string) {
  return withUser(userId, async (tx) => {
    await tx
      .delete(entries)
      .where(and(eq(entries.userId, userId), eq(entries.id, id)))
  })
}

export function listTags(userId: string) {
  return withUser(userId, (tx) =>
    tx
      .select({
        id: tags.id,
        name: tags.name,
        count: sql<number>`count(${entryTags.entryId})::int`,
      })
      .from(tags)
      .leftJoin(entryTags, eq(entryTags.tagId, tags.id))
      .where(eq(tags.userId, userId))
      .groupBy(tags.id, tags.name)
      .orderBy(tags.name),
  )
}

export class TagConflictError extends Error {}

export function renameTag(userId: string, id: string, name: string) {
  return withUser(userId, async (tx) => {
    const clash = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.nameKey, tagKey(name))))
    if (clash.length > 0 && clash[0].id !== id) {
      throw new TagConflictError(`You already have a tag called "${name}".`)
    }
    const updated = await tx
      .update(tags)
      .set({ name, nameKey: tagKey(name) })
      .where(and(eq(tags.userId, userId), eq(tags.id, id)))
      .returning({ id: tags.id })
    if (updated.length === 0) throw new Error('That tag no longer exists.')
  })
}

export function deleteTag(userId: string, id: string) {
  return withUser(userId, async (tx) => {
    await tx.delete(tags).where(and(eq(tags.userId, userId), eq(tags.id, id)))
  })
}

export function getHeat(userId: string, from: string, to: string) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select({
        date: sql<string>`${entries.entryDate}::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          sql`${entries.entryDate} >= ${from}::date`,
          sql`${entries.entryDate} <= ${to}::date`,
        ),
      )
      .groupBy(entries.entryDate)
    return rows
  })
}

export function getInsights(userId: string, from: string, to: string) {
  return withUser(userId, async (tx) => {
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(entries)
      .where(eq(entries.userId, userId))
    const monthly = await tx
      .select({
        month: sql<string>`to_char(${entries.entryDate}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          sql`${entries.entryDate} >= ${from}::date`,
          sql`${entries.entryDate} <= ${to}::date`,
        ),
      )
      .groupBy(sql`1`)
    const byTag = await tx
      .select({
        name: tags.name,
        count: sql<number>`count(${entryTags.entryId})::int`,
      })
      .from(tags)
      .innerJoin(entryTags, eq(entryTags.tagId, tags.id))
      .where(eq(tags.userId, userId))
      .groupBy(tags.id, tags.name)
      .orderBy(desc(sql`2`), tags.name)
      .limit(10)
    return { total, monthly, byTag }
  })
}

/** Earlier years' moments from the same month and day. */
export function onThisDay(
  userId: string,
  month: number,
  day: number,
  year: number,
) {
  return withUser(userId, async (tx) => {
    const rows = await tx
      .select(entryColumns)
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          sql`extract(month from ${entries.entryDate}) = ${month}`,
          sql`extract(day from ${entries.entryDate}) = ${day}`,
          sql`extract(year from ${entries.entryDate}) < ${year}`,
        ),
      )
      .orderBy(desc(entries.entryDate), desc(entries.createdAt))
      .limit(10)
    return attachTags(tx, userId, rows)
  })
}
