/** Done Chime: an 8-bit jingle at the end of every main-loop turn, picked and toggled with /chime. */

import type { EngineInterface, Register } from 'claude-code'

import { BLURBS, DEFAULT_JINGLE, JINGLES, OOPS, clip, isJingle } from './chime'
import type { Clip, Jingle } from './chime'

const COMMAND = 'chime'
const STORE_JINGLE = 'jingle'
const STORE_ON = 'isOn'
const GAIN = 0.6
const BOARD = 'done-chime'
const BOARD_TITLE = 'Done Chime'
const PICKED = { plugin: 'done-chime', key: 'picked' } as const

const HELP = `/${COMMAND} opens the board to click a jingle; /${COMMAND} ${JINGLES.join('|')} picks one by name; /${COMMAND} test plays it; /${COMMAND} off|on mutes or unmutes.`

type Settings = { jingle: Jingle; isOn: boolean }

/** What the person last chose, from the cross-session store; the defaults until they choose. */
async function settings($: EngineInterface): Promise<Settings> {
  const stored = await $.store.get(STORE_JINGLE)
  const stateOn = await $.store.get(STORE_ON)
  return {
    jingle: typeof stored === 'string' && isJingle(stored) ? stored : DEFAULT_JINGLE,
    isOn: stateOn !== false,
  }
}

/** Writes the picked value back as it stands, so the board draws again after a change that lives in the store. */
async function touch($: EngineInterface) {
  const held = await $.state.get(PICKED)
  await $.state.set(PICKED, held.value ?? null)
}

/** Plays one clip now; a missing audio device or a refused clip is not the turn's problem. */
async function play($: EngineInterface, name: Clip) {
  try {
    await $.audio.play({ base64: clip(name), mime: 'audio/wav' }, { gain: GAIN })
  } catch {
    // no audio device or a refused clip: nothing to do
  }
}

/** Which clip a finished turn gets: the chosen jingle, or the oops drop when it was cut short. */
export const clipFor = (reason: string, jingle: Jingle): Clip => (reason === 'answer' || reason === 'refusal' ? jingle : OOPS)

async function runCommand($: EngineInterface, args: string) {
  const arg = args.trim().toLowerCase()
  const current = await settings($)

  if (arg === 'off') {
    await $.store.set(STORE_ON, false)
    await touch($)
    return { text: 'Done Chime: muted. /chime on brings it back.' }
  }
  if (arg === 'on') {
    await $.store.set(STORE_ON, true)
    await touch($)
    void play($, current.jingle)
    return { text: `Done Chime: on, playing "${current.jingle}" when Claude finishes.` }
  }
  if (arg === 'test') {
    void play($, current.jingle)
    return { text: `Done Chime: "${current.jingle}"${current.isOn ? '' : ' (muted; /chime on to unmute)'}. ${HELP}` }
  }
  if (arg === '' || arg === 'board') {
    await $.ui.open({ id: BOARD, title: BOARD_TITLE })
    return { text: `Done Chime: board open, currently "${current.jingle}"${current.isOn ? '' : ' (muted)'}.` }
  }
  if (isJingle(arg)) {
    await $.store.set(STORE_JINGLE, arg)
    await $.state.set(PICKED, arg)
    void play($, arg)
    return { text: `Done Chime: now "${arg}"${current.isOn ? '' : ' (still muted; /chime on to unmute)'}.` }
  }
  return { text: `Done Chime: "${arg}" is not a jingle. ${HELP}` }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Done Chime: pick, test or mute the 8-bit jingle that plays when Claude finishes',
      argumentHint: `[${JINGLES.join('|')}|test|off|on]`,
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      const { jingle, isOn } = await settings($)
      if (isOn) void play($, clipFor(e.reason, jingle))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: BOARD }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const stored = await settings($)
    const held = await $.state.get(PICKED)
    const chosen = held.value ?? stored.jingle
    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>Click a sound to hear it and make it the one that plays when Claude finishes.</Text>
        <Box flexDirection="column">
          {JINGLES.map(name => (
            <Button
              key={name}
              variant={name === chosen ? 'primary' : undefined}
              onPress={async () => {
                await $.store.set(STORE_JINGLE, name)
                await $.state.set(PICKED, name)
                void play($, name)
              }}
            >
              {`${name === chosen ? '> ' : '  '}${name.padEnd(8)} ${BLURBS[name]}`}
            </Button>
          ))}
        </Box>
        <Box gap={2}>
          <Button
            key="mute"
            onPress={async () => {
              await $.store.set(STORE_ON, !stored.isOn)
              await $.state.set(PICKED, chosen)
            }}
          >
            {stored.isOn ? 'Sound on: click to mute' : 'Muted: click to unmute'}
          </Button>
          <Button key="oops" dimColor onPress={() => void play($, OOPS)}>
            Hear the error drop
          </Button>
        </Box>
      </Box>
    )
  })

  on('command.run', { command: COMMAND }, ($, e) => runCommand($, e.args)).catch(() => ({
    text: 'Done Chime: could not read or save its settings this time.',
  }))
}
