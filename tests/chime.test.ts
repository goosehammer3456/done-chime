import { describe, expect, test } from 'claude-code/testing'

import { JINGLES, OOPS, RATE, clip, midi, square, sweep, toBase64, wav } from '../hooks/chime'
import { clipFor } from '../hooks/register'

describe('synth', () => {
  test('a WAV carries its header and one 16-bit sample per input sample', async () => {
    const bytes = wav(new Float32Array([0, 1, -1]))
    expect(bytes.length).toBe(44 + 3 * 2)
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE')
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(24, true)).toBe(RATE)
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(-32767)
  })

  test('base64 pads to a multiple of four and round-trips a known value', async () => {
    expect(toBase64(new Uint8Array([77, 97, 110]))).toBe('TWFu')
    expect(toBase64(new Uint8Array([77]))).toBe('TQ==')
  })

  test('notes land on equal temperament', async () => {
    expect(midi(69)).toBe(440)
    expect(Math.round(midi(81))).toBe(880)
  })

  test('a square phrase is as long as its notes and stays inside the level', async () => {
    const s = square([{ hz: 440, ms: 100 }, { hz: 0, ms: 50 }])
    expect(s.length).toBe(Math.round(RATE * 0.15))
    let peak = 0
    for (const v of s) peak = Math.max(peak, Math.abs(v))
    expect(peak).toBeGreaterThan(0.3)
    expect(peak).toBeLessThanOrEqual(0.5)
    // the rest is silent
    expect(s[s.length - 1]).toBe(0)
  })

  test('a sweep fills its length', async () => {
    expect(sweep(200, 800, 50).length).toBe(Math.round(RATE * 0.05))
  })

  test('every jingle and the oops clip render once and cache', async () => {
    for (const name of [...JINGLES, OOPS] as const) {
      const first = clip(name)
      expect(first.length).toBeGreaterThan(1000)
      expect(clip(name)).toBe(first)
    }
  })
})

describe('what plays', () => {
  test('an answer gets the jingle, an interrupt or error gets the oops drop', async () => {
    expect(clipFor('answer', 'coin')).toBe('coin')
    expect(clipFor('refusal', 'levelup')).toBe('levelup')
    expect(clipFor('aborted', 'coin')).toBe(OOPS)
    expect(clipFor('error', 'coin')).toBe(OOPS)
  })

  test('/chime sets, mutes and reports, and plays through the audio noun', async ($, on) => {
    const played: string[] = []
    // The kit has no bottom for the store, so the test keeps it in a map.
    const store = new Map<string, unknown>()
    on('store.get', async (_, e) => ({ value: store.get(e.key) }) as never)
    on('store.set', async (_, e) => {
      store.set(e.key, e.value)
      return { value: undefined } as never
    })
    on('audio.play', async (_, e) => {
      played.push(e.clip.mime ?? 'asset')
      return { value: undefined } as never
    })
    const origin = { kind: 'composer' } as const
    const presentation = { isFullscreen: false, columns: 100 }
    const run = async (args: string) => (await $.command.run({ command: 'chime', args, origin, presentation })).text ?? ''
    expect(await run('levelup')).toContain('now "levelup"')
    expect(await run('')).toContain('"levelup"')
    expect(await run('off')).toContain('muted')
    expect(await run('test')).toContain('muted')
    expect(await run('on')).toContain('on, playing "levelup"')
    expect(await run('banjo')).toContain('is not a jingle')
    expect(played.length).toBeGreaterThanOrEqual(3)
  })
})
