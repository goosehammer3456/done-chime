/** 8-bit jingles synthesized in code: square waves as 16-bit mono PCM WAVs, base64 for $.audio.play. */

export const RATE = 22050

/** The jingles on offer, each a short square-wave tune. */
export const JINGLES = ['coin', 'levelup', 'powerup', 'secret', 'rupee', 'itemget', 'navi'] as const
export type Jingle = (typeof JINGLES)[number]
export const DEFAULT_JINGLE: Jingle = 'coin'

/** Played instead of the chosen jingle when a turn was interrupted or died on an error. */
export const OOPS = 'oops'
export type Clip = Jingle | typeof OOPS

export const isJingle = (s: string): s is Jingle => (JINGLES as readonly string[]).includes(s)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const toBase64 = (bytes: Uint8Array) => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | c
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

const WAV_HEADER = 44
const BYTES_PER_SAMPLE = 2
const PEAK = 32767

/** Wraps samples in -1..1 as a 16-bit mono WAV file. */
export const wav = (samples: Float32Array) => {
  const bytes = new Uint8Array(WAV_HEADER + samples.length * BYTES_PER_SAMPLE)
  const view = new DataView(bytes.buffer)
  const text = (at: number, s: string) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, WAV_HEADER - 8 + samples.length * BYTES_PER_SAMPLE, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * BYTES_PER_SAMPLE, true)
  view.setUint16(32, BYTES_PER_SAMPLE, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples.length * BYTES_PER_SAMPLE, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!))
    view.setInt16(WAV_HEADER + i * BYTES_PER_SAMPLE, Math.round(s * PEAK), true)
  }
  return bytes
}

/** One note of a tune: a frequency in Hz (0 for a rest) held for `ms`. */
export type Note = { hz: number; ms: number }

/** Equal-tempered pitch from a MIDI note number (69 = A4 = 440 Hz). */
export const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

const ATTACK_SAMPLES = 40
const RELEASE_SAMPLES = 120
const DUTY = 0.5
const LEVEL = 0.5

/**
 * Renders notes as a square wave with a hard attack and a short release on
 * each, and a `decay` on the whole phrase so the tail dies off like a chip.
 */
export const square = (notes: readonly Note[], decay = 1.2) => {
  const total = notes.reduce((n, note) => n + Math.round((RATE * note.ms) / 1000), 0)
  const out = new Float32Array(total)
  let at = 0
  let phase = 0
  notes.forEach(note => {
    const len = Math.round((RATE * note.ms) / 1000)
    for (let i = 0; i < len; i++) {
      const env = Math.min(1, i / ATTACK_SAMPLES) * Math.min(1, (len - i) / RELEASE_SAMPLES)
      const tail = Math.pow(1 - (at + i) / total, decay)
      if (note.hz > 0) {
        phase = (phase + note.hz / RATE) % 1
        out[at + i] = (phase < DUTY ? 1 : -1) * LEVEL * env * tail
      }
    }
    at += len
  })
  return out
}

/** Sweeps from `from` to `to` Hz over `ms`, square, for the power-up rise. */
export const sweep = (from: number, to: number, ms: number) => {
  const len = Math.round((RATE * ms) / 1000)
  const out = new Float32Array(len)
  let phase = 0
  for (let i = 0; i < len; i++) {
    const t = i / len
    const hz = from * Math.pow(to / from, t)
    phase = (phase + hz / RATE) % 1
    const env = Math.min(1, i / ATTACK_SAMPLES) * Math.min(1, (len - i) / RELEASE_SAMPLES)
    out[i] = (phase < DUTY ? 1 : -1) * LEVEL * env
  }
  return out
}

const joined = (...parts: Float32Array[]) => {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  parts.forEach(p => {
    out.set(p, at)
    at += p.length
  })
  return out
}

/** The tunes. Notes by MIDI number so the intervals read as music, not Hz. */
const TUNES: Record<Clip, () => Float32Array> = {
  // The coin: a short B5 hop to a held E6.
  coin: () => square([{ hz: midi(83), ms: 70 }, { hz: midi(88), ms: 420 }], 1.6),
  // 1-up: a quick major arpeggio climbing two octaves.
  levelup: () => square([76, 79, 88, 84, 86, 91].map(n => ({ hz: midi(n), ms: 85 })), 0.6),
  // Power-up: a rising sweep, then the top note held.
  powerup: () => joined(sweep(midi(60), midi(84), 260), square([{ hz: midi(84), ms: 60 }, { hz: midi(88), ms: 240 }], 1.4)),
  // Secret found: the classic descending-then-rising flourish.
  secret: () => square([79, 78, 75, 69, 68, 76, 80, 84].map(n => ({ hz: midi(n), ms: 75 })), 0.5),
  // Rupee: two bright notes, the second held, like picking one up.
  rupee: () => square([{ hz: midi(91), ms: 60 }, { hz: midi(98), ms: 300 }], 1.4),
  // Item get: three rising pickup notes, then the held fanfare note.
  itemget: () => square([67, 71, 74].map(n => ({ hz: midi(n), ms: 100 })).concat({ hz: midi(79), ms: 550 }), 1),
  // Navi: the "Hey!" blip, a low-to-high pair with a rest between.
  navi: () => square([{ hz: midi(93), ms: 70 }, { hz: 0, ms: 40 }, { hz: midi(100), ms: 220 }], 1.4),
  // Oops: two dropping notes for an interrupted or failed turn.
  oops: () => square([{ hz: midi(64), ms: 140 }, { hz: midi(58), ms: 260 }], 1.2),
}

const cache = new Map<Clip, string>()

/** The clip as base64 WAV, synthesized once. */
export const clip = (name: Clip) => {
  let b64 = cache.get(name)
  if (!b64) {
    b64 = toBase64(wav(TUNES[name]()))
    cache.set(name, b64)
  }
  return b64
}
