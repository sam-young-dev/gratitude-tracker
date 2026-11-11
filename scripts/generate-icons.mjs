// Generates the PWA PNG icons in public/ from the same design as favicon.svg:
// a cream square with an amber dot. Run with `node scripts/generate-icons.mjs`.
// Dependency-free: draws with 4x4 supersampling and writes PNGs with zlib.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0xf3, 0xea, 0xd8]
const DOT = [0xb8, 0x79, 0x1f]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// rounded: corner radius as a fraction of size (0 = full-bleed square).
// dot: dot radius as a fraction of size.
function render(size, { rounded, dot }) {
  const SS = 4
  const r = rounded * size
  const c = size / 2
  const dr = dot * size
  const raw = Buffer.alloc(size * (size * 4 + 1))

  const inRoundedRect = (x, y) => {
    if (r === 0) return true
    const cx = Math.min(Math.max(x, r), size - r)
    const cy = Math.min(Math.max(y, r), size - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
  }

  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1)
    raw[row] = 0
    for (let px = 0; px < size; px++) {
      let bg = 0
      let fg = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS
          const y = py + (sy + 0.5) / SS
          if (!inRoundedRect(x, y)) continue
          if ((x - c) ** 2 + (y - c) ** 2 <= dr * dr) fg++
          else bg++
        }
      }
      const total = SS * SS
      const alpha = (bg + fg) / total
      const i = row + 1 + px * 4
      for (let ch = 0; ch < 3; ch++) {
        raw[i + ch] = alpha
          ? Math.round((BG[ch] * bg + DOT[ch] * fg) / (bg + fg))
          : 0
      }
      raw[i + 3] = Math.round(alpha * 255)
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Same proportions as favicon.svg (rx 8/32, dot r 7/32).
const standard = { rounded: 8 / 32, dot: 7 / 32 }
// Maskable and Apple icons are full-bleed; the OS applies its own shape.
const fullBleed = { rounded: 0, dot: 7 / 32 }

const outputs = [
  ['public/icon-192.png', 192, standard],
  ['public/icon-512.png', 512, standard],
  ['public/icon-maskable-512.png', 512, fullBleed],
  ['public/apple-touch-icon.png', 180, fullBleed],
]
for (const [path, size, opts] of outputs) {
  writeFileSync(path, render(size, opts))
  console.log(`wrote ${path}`)
}
