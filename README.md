# done-chime

An 8-bit jingle when Claude finishes a turn. No sound files: the tunes are square waves synthesized in code, so the mod is three small TypeScript files.

| Jingle | Sounds like |
| --- | --- |
| `coin` (default) | the coin pickup: a quick hop to a held high note |
| `levelup` | the 1-up: a major arpeggio climbing two octaves |
| `powerup` | a rising sweep that lands on the top note |
| `secret` | the secret-found flourish (it is the Zelda secret chime) |
| `rupee` | Zelda: picking up a rupee |
| `itemget` | Zelda: the item-get fanfare, three rising notes and a held one |
| `navi` | Zelda: Navi's "Hey!" |

An interrupted turn or one that died on an API error gets a two-note drop instead, so you can tell from the next room whether it finished or fell over. Subagent turns are silent. Only the main loop chimes.

## Commands

```
/chime              open the board: click any sound to hear it and make it the one
/chime levelup      pick a jingle by name (coin | levelup | powerup | secret | rupee | itemget | navi)
/chime test         play the current one again
/chime off          mute
/chime on           unmute
```

The board is a pane listing every jingle. Clicking one plays it and saves it as your choice; the selected one is marked, and there are buttons to mute and to hear the error drop. The choice and the mute are kept across sessions.

## What it runs

Everything runs inside Claude Code; nothing is fetched or sent anywhere. The mod hooks `session.start` to register `/chime`, `turn.complete` to play the jingle through the host's audio call, `ui.render` to draw the board, and `command.run` to handle `/chime` itself (it only answers `/chime`; other commands pass through untouched). It stores two values locally: your chosen jingle and the mute flag.

## Privacy

Done Chime collects no data and makes no network requests. It stores two settings (your chosen jingle and whether it is muted) in Claude Code's local store on your machine. Nothing is sent to the author or any third party.

## Install

In a Claude Code terminal session:

```
/plugin install done-chime --marketplace goosehammer3456/done-chime
```

Answer `y` to add the marketplace, then pick a scope.

To run a checkout for one session instead:

```bash
claude --plugin-dir ./done-chime
```

Playback goes through `afplay`, so it is macOS only. A Linux or Windows terminal loads the mod and plays nothing.

## Check it

```bash
claude plugin validate done-chime
claude plugin test done-chime
```
