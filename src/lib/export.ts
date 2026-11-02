import type { EntrySummary } from '@/server/journal'

export type ExportedEntry = Omit<EntrySummary, 'id'>

export function exportFilename(ext: 'json' | 'md', today: string) {
  return `gratitude-tracker-${today}.${ext}`
}

export function toJson(entries: Array<ExportedEntry>, exportedAt: string) {
  return JSON.stringify({ exportedAt, entries }, null, 2)
}

/** One readable file, newest moment first, like the Moments list. */
export function toMarkdown(entries: Array<ExportedEntry>, exportedAt: string) {
  const parts = [
    '# Gratitude Tracker',
    `Exported ${exportedAt.slice(0, 10)} · ${entries.length} ${entries.length === 1 ? 'moment' : 'moments'}`,
  ]
  for (const entry of [...entries].reverse()) {
    const lines = [`## ${entry.title}`, `*${entry.entryDate}*`]
    if (entry.tags.length > 0) lines.push(`Tags: ${entry.tags.join(', ')}`)
    if (entry.scripture) lines.push(`Scripture: ${entry.scripture}`)
    lines.push('', entry.body.trim())
    if (entry.outcome)
      lines.push('', '### How it turned out', '', entry.outcome.trim())
    parts.push(lines.join('\n'))
  }
  return parts.join('\n\n') + '\n'
}
