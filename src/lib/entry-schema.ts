import { z } from 'zod'
import { isRealDate, latestAcceptedDate } from '@/lib/dates'

export const PAGE_SIZE = 20
export const MAX_TAGS = 8
export const MAX_TAG_LENGTH = 40

export const SUGGESTED_TAGS = [
  'Provision',
  'Protection',
  'Healing',
  'Guidance',
  'Answered prayer',
  'Relationships',
  'Peace',
  'Surprise',
] as const

/** Trim, collapse inner whitespace, drop a leading "#", cap the length. */
export function normalizeTag(raw: string) {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TAG_LENGTH)
}

export const tagKey = (name: string) => normalizeTag(name).toLowerCase()

/** Normalized, de-duplicated (case-insensitive), empties removed. First casing wins. */
export function cleanTags(names: Array<string>) {
  const seen = new Set<string>()
  const out: Array<string> = []
  for (const raw of names) {
    const name = normalizeTag(raw)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .optional()
    .transform((value) => value || null)

export const entryInputSchema = z.object({
  entryDate: z
    .string()
    .refine(isRealDate, 'Choose a real date.')
    .refine(
      (value) => value <= latestAcceptedDate(),
      "Moments can’t be dated in the future.",
    ),
  title: z
    .string()
    .trim()
    .min(1, 'Add a title so you can find this later.')
    .max(200, 'Keep the title under 200 characters.'),
  body: z
    .string()
    .trim()
    .min(1, 'Write what happened, even a sentence.')
    .max(
      20000,
      'This is over 20,000 characters. Try splitting it into two moments.',
    ),
  scripture: optionalText(
    200,
    'Keep the Scripture reference under 200 characters.',
  ),
  outcome: optionalText(
    20000,
    'This is over 20,000 characters. Try trimming it.',
  ),
  tags: z
    .array(z.string())
    .transform(cleanTags)
    .refine((tags) => tags.length <= MAX_TAGS, `Use up to ${MAX_TAGS} tags.`),
})

export type EntryInput = z.infer<typeof entryInputSchema>
export type EntryFormValues = z.input<typeof entryInputSchema>

export const tagNameSchema = z
  .string()
  .transform(normalizeTag)
  .pipe(z.string().min(1, 'Enter a name for the tag.'))

export const idSchema = z.object({ id: z.string().uuid() })
