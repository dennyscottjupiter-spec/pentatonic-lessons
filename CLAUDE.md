# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Static, no-build HTML/CSS/JS app that teaches guitar pentatonic scales across all 12 keys with an interactive fretboard, Karplus-Strong plucked-guitar audio, 4 visual themes, a Practice Lab (metronome + timer), and a Lick Attack game.

## How to run
Open `index.html` directly in a browser — no server, no bundler, no install step. From PowerShell: `Start-Process index.html`. Hard-refresh with **Ctrl+Shift+R** after edits to bypass browser CSS cache (see global LEARNINGS).

There is no build, lint, or test command. Verification = open the page and interact: click frets, switch keys/themes, open Practice Lab, start the game.

## Architecture

Three files, single page, no modules.

- **`index.html`** — structure: HUD (score + theme switcher + 🏋️ + ❓), level card with live title, controls (KEY row / LENS / BOX / OPTIONS), game panel, fretboard div, help modal, practice modal, win screen. JS renders the KEY row at boot via `wireControls`.
- **`styles.css`** — all styling. `:root` vars are the entire theming surface (`--font-display`, `--font-body`, `--scanline-alpha`, color vars). `body.theme-*` blocks override `:root` per theme. Note states (`in-scale`, `root`, `out`, `dimmed`, `playing`, `correct`, `wrong`) are CSS classes toggled per `<g class="fb-note">`.
- **`app.js`** — all behavior. Procedural, no framework. Boot sequence: `setKey(0); buildFretboard(); refreshNotes(); wireControls(); loadGame(); updateScore(); updateTimerDisplay();`

### `app.js` internal structure (read in this order)

1. **Constants** — `NOTE_NAMES`, `PENT_OFFSETS` (minor pentatonic intervals), `STRINGS`, `TOTAL_FRETS`, `BOXES` (Am-anchored per-string `[lo, hi]` fret ranges), `KEYS` (12-entry table: minor/major name, chroma, offset from A), `LICKS` (3 licks × 5 boxes, Am-anchor-relative), `GAME` (XP tuning constants).
2. **Early theme IIFE** — restores saved theme class before first paint (no CRT flash).
3. **`state` object** — single source of truth: `keyIdx`, `lens` (`'minor'`/`'major'`), `box`, `labels`, `sound`, `score`, `theme`, game fields (`mode`, `gameLevel`, `gameLevelXP`, `gameStreak`, `gameLives`, `gameScore`, `highScore`, `gamePhase`, `currentLick`, `gameInputStep`), computed fields (`scaleNotes`, `activeBoxes`).
4. **Music helpers** — `midiToName`, `midiToFreq`, `fretMidi`, `computeScaleNotes(keyIdx)`, `computeActiveBoxes(keyIdx)`, `setKey(keyIdx)`, `isInScale`, `isRoot`, `isInBox`, `transposeFret`.
5. **Audio** — `ensureAudio()`, Karplus-Strong engine (`karplusCache` Map, `buildKarplusBuffer`, `playNote(midi, duration)`), `playBuzz()`, `playFanfare()`.
6. **Fretboard render** — `buildFretboard()` constructs the SVG once at boot. `fretCenterX`, `mkSvg` helpers.
7. **`refreshNotes()`** — does NOT rebuild the SVG. Walks `.fb-note` groups and toggles classes from current `state`. Hot path for all key/lens/box changes.
8. **Interactions** — `onNoteClick` (routes to game or explore), `flashNote`, `updateScore`, `playCurrentScale` (with generation guard).
9. **Theme** — `applyTheme(theme)`.
10. **Modals** — `toggleHelp`, `closeHelp`, `togglePractice`, `closePractice`, `renderChallenge`.
11. **Metronome** — `metro` object, `metroBeat`, `metroSchedule`, `metroStart`, `metroStop`.
12. **Timer** — `timer` object, `timerChime`, `updateTimerDisplay`, `timerStart`, `timerStop`, `timerReset`.
13. **Boot validator IIFE** — validates every LICK step is in-scale and in-box; `console.error` on failure. Stays in code permanently.
14. **Game engine** — `pickLick` (key-aware, auto-skips off-board transpositions), `showGamePhase` (show phase with generation counter), `onGameNoteClick` (input judgment), `lickComplete` (XP/streak/level-up/win), `updateGamePanel`, `updateGameHUD`, `showWinScreen`, `enterGame`, `exitGame`.
15. **Persistence** — `saveGame`, `loadGame`.
16. **`wireControls()`** — wires theme buttons, JS-rendered key selector, lens, box, toggles, play-scale, game-toggle, modals, metronome, timer, win screen, global `keydown` shortcuts.
17. **Boot sequence** at file end.

### Key design points

- **Key vs lens are orthogonal.** `keyIdx` (0-11) selects which 5 notes exist on the board. `lens` (`minor`/`major`) only changes which note is highlighted as root — the 5 notes never move. `box` only dims out-of-position notes.
- **One SVG, class toggles only.** `refreshNotes()` is the hot path; `buildFretboard()` runs once at boot. Never rebuild the SVG for state changes.
- **String order is high→low** in `STRINGS[]` (index 0 = high e). `BOXES`, `LICKS`, MIDI math all assume this.
- **`BOXES` data is Am-anchored.** `computeActiveBoxes(keyIdx)` shifts all fret ranges by `KEYS[keyIdx].offset`, octave-adjusting (±12) to keep everything within frets 0–17.
- **`LICKS` data is Am-anchored.** `transposeFret(f, keyOffset)` applies the same octave-adjust logic. The game auto-skips licks where any step can't be kept on-board.
- **Generation counter (`playGen`).** Incremented on every mode/sequence change. All `setTimeout` callbacks in `showGamePhase` and `playCurrentScale` capture the generation and bail if stale — prevents ghost notes and flashes when exiting mid-playback.
- **Autoplay policy.** Every audio path routes through `ensureAudio()` and is triggered from a user click.
- **localStorage is always wrapped in try/catch** (throws in private/incognito mode).

## Themes

| Name | Class | Font | Scanline |
|------|-------|------|----------|
| CRT Arcade (default) | `:root` | Press Start 2P + VT323 | 0.18 |
| Hawaii | `theme-hawaii` | Press Start 2P + VT323 | 0.10 |
| Space | `theme-space` | Press Start 2P + VT323 | 0.15 |
| VS Code Dark | `theme-vsc` | JetBrains Mono | 0.03 |

Editing any theme = its `body.theme-*` override block in `styles.css`. New theme = copy that block, add a button in `.hud-right` in `index.html`, handle in `applyTheme()` in `app.js`.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select box position |
| `0` | ALL positions |
| `?` | Toggle help modal |
| `P` | Toggle Practice Lab |
| `Esc` | Close any modal |

## Git tags

| Tag | Milestone |
|-----|-----------|
| `v1.1.0-audio` | Karplus-Strong pluck audio |
| `v1.2.0-themes` | 4 themes + per-theme fonts |
| `v1.3.0-help-keys` | Help overlay + keyboard shortcuts |
| `v1.4.0-practice` | Practice Lab (metronome + timer) |
| `v2.0.0-scales` | All 12 keys + relative lens |
| `v3.0.0-game` | Lick Attack game complete |

## Conventions
- Surgical changes only. No build step, no framework, no dependencies beyond CDN fonts.
- Keep all logic in `app.js`. Don't split into modules — no ES module resolution without a server.
- Arcade/retro theme is intentional. Don't migrate to "modern clean" without asking.
- The boot-time LICK validator stays in code permanently — it costs nothing at runtime.
