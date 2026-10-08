# done-chime

An 8-bit jingle when Claude finishes a turn. No sound files: the tunes are square waves synthesized in code, so the mod is three small TypeScript files.

| Jingle | Sounds like |
| --- | --- |
| `coin` (default) | the coin pickup: a quick hop to a held high note |
| `levelup` | the 1-up: a major arpeggio climbing two octaves |
| `powerup` | a rising sweep that lands on the top note |
| `secret` | the secret-found flourish |

An interrupted turn or one that died on an API error gets a two-note drop instead, so you can tell from the next room whether it finished or fell over. Subagent turns are silent. Only the main loop chimes.

## Commands

```
/chime              play the current jingle and show the settings
/chime levelup      pick a jingle (coin | levelup | powerup | secret)
/chime test         play it again
/chime off          mute
/chime on           unmute
```

The choice and the mute are kept across sessions.

## Install

In a Claude Code terminal session:

```
/plugin install done-chime --marketplace goosehammer23/done-chime
```

Answer `y` to add the marketplace, then pick a scope. The repo is private, so this needs GitHub credentials that can read it (`gh auth login` is enough).

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
