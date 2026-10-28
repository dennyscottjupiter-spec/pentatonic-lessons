# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Static, no-build HTML/CSS/JS app that teaches guitar pentatonic scales across all 12 keys with an interactive fretboard, Karplus-Strong plucked-guitar audio, a sticky HUD with a root-drone button and 4 visual themes, sharp/flat note names, a blue-note toggle, custom saved fretboard patterns, a global pause, a Practice Lab (metronome + timer), a Lick Attack game, a 5-lesson LEARNING modal, and an in-app CHANGELOG popup.

## How to run
Open `index.html` directly in a browser — no server, no bundler, no install step. From PowerShell: `Start-Process index.html`. Hard-refresh with **Ctrl+Shift+R** after edits to bypass browser CSS cache (see global LEARNINGS).

There is no build, lint, or test command. Verification = open the page and interact: click frets, switch keys/themes/note names, toggle blue notes, build or load a pattern, press Space to pause, open Practice Lab, start the game.

## Test suite

Open `tests/tests.html` (via `python3 -m http.server` + `http://localhost:<port>/tests/tests.html`). **317 tests, zero dependencies.** All files live in `tests/`:

- `tests-lib.js` — zero-dep framework + `reset()`, exposed as `window.T`
- `tests-core.js` (1–5), `tests-board.js` (6–8), `tests-game.js` (9–10), `tests-features.js` (11–12), `tests-patterns.js` (13), `tests-player.js` (14), `tests-changelog.js` (15) — the suites
- `tests-report.js` — hands results to the SYSTEM DIAGNOSTICS report
- `tests.html` — CRT-arcade "SYSTEM DIAGNOSTICS" report shell; loads `../js/` `data.js → audio.js → drone.js → player.js → engine.js → game.js → practice.js → changelog.js → patterns.js` then the test files. **Does NOT load `app.js`** (would boot the full DOM); provides a minimal `state` stub plus `$`/`$$` stubs instead.

### What is covered

| Suite | What it tests |
|-------|--------------|
| 1 · Music helpers | `midiToChroma`, `fretMidi`, `fretChroma` — pure math, edge cases |
| 2 · Data integrity | `KEYS`/`STRINGS`/`BOXES`/`PENT_OFFSETS`/`MAJOR_OFFSETS`/`LICKS`/`GAME` constants; KEYS roots are sharp-spelled (A#/D#/G#, no Bb/Eb/Ab) |
| 3 · LICK validator | Every lick step: chroma ∈ Am pentatonic + fret within its Box range |
| 4 · Scale chromas | All 24 scales (12 keys × MINOR/MAJOR): correct 5-chroma sets + relative-pair identity |
| 5 · Scale spelling | Correct note names for all 24 scales (sharp spelling, the default) |
| 6 · Rendered fretboard | Every `.fb-note` CSS class (`root`/`in-scale`/`out`) + label matches `spell()` for all 24 scales |
| 7 · Box transposition | `getAnchorOffset`, `computeActiveBoxes` (all 12×2), `transposeFret`, **box contiguity** (maxHi−minLo < 12 across all strings), `transposeFretInBox`, A# MAJOR Box 1 regression |
| 8 · Box membership | `isInScale`, `isRoot`, `isInBox` correctness |
| 9 · Game logic | `getStepMs` tiers, `pickLick` transposition, XP/streak math |
| 10 · Smoke | `playNote`/`metroStop`/`timerReset`/`renderChallenge` must not throw |
| 11 · Note names (sharps / flats) | `spell()` in both modes; `FLAT_NAMES` spelling for all 12 chromas |
| 12 · Blue notes | `blueChroma()` / `isBlue()` per lens (♭5 minor, ♭3 major); blue never inside the pentatonic |
| 13 · Patterns | Key-A reference round-trip (`toRef` → `fromRef`) across keys; cross-lens presets stay in scale; `chromaticRun`; CHROMATIC view; presets well-formed; `cleanSaved` rejects bad saved data |
| 14 · Player + pause | `playSteps`/`playerTick` order and stop; pause freezes and resumes at the same step; `togglePause` no-op when idle; 14b root drone start/stop/toggle, pause stops and resume restarts it |
| 15 · Changelog | `CHANGELOG` shape (vX.Y.Z, ISO date, `[name, text]` items), newest first, `renderChangelog` output, new-release dot |

### Note spelling
Sharps by default. The **♯ SHARPS / ♭ FLATS** pair under NOTE NAMES switches. `spell(chroma)` returns `SHARP_NAMES[chroma]` or `FLAT_NAMES[chroma]` by `state.accidentals` (`'sharp'` | `'flat'`). The choice is saved in `pent-prefs`. Scale membership is still by chroma, so spelling never changes which notes are in a scale.

## Architecture

```
index.html   entry point (stays at the root so it opens directly)
css/         themes, styles, hud, modals, features
js/          the eleven scripts below
tests/       tests.html + tests-*.js
```

Eleven plain JS files in `js/`, loaded in order by `index.html` (no ES modules — `file://` compatible). All share global scope. Stylesheets in `css/` load in the order themes → styles → hud → modals → features.

```
data.js → audio.js → drone.js → player.js → engine.js → game.js → practice.js → changelog.js → app.js → patterns.js → hud.js
```

- **`index.html`** — structure: sticky HUD (`header.hud`: root-drone button `#drone-btn` (key + lens readout), title, icon rail with pause `#pause-btn`, theme dropdown `#theme-trigger` + popover `#theme-menu`, Practice Lab, Help), level card with live title, controls (KEY row / SCALE LENS / NOTE NAMES / BOX POSITION / OPTIONS incl. + BLUE NOTE, ▶ PLAY SCALE, ▶ START GAME, 📚 LEARNING, 📜 CHANGELOG; PATTERNS group), game panel, fretboard div, legend (incl. `#legend-blue`), help modal, practice modal, learn modal, changelog modal, win screen. A tiny inline `<script>` right after `<body>` opens applies the saved theme before first paint (avoids a CRT flash); it must not move into `<head>`, where `document.body` is still null. JS renders the KEY row at boot via `wireControls`.

### File responsibilities

| File | Owns |
|------|------|
| `data.js` | Constants: `PENT_OFFSETS`, `MAJOR_OFFSETS`, `SHARP_NAMES`, `FLAT_NAMES`, `BLUE_OFFSETS`, `PATTERN_PRESETS` (6 classics incl. CHROMATIC), `STRINGS`, `TOTAL_FRETS`, `BOXES`, `KEYS` (A A# B C C# D D# E F F# G G#), `LICKS`, `GAME` |
| `audio.js` | `ensureAudio`, Karplus-Strong (`karplusCache`, `buildKarplusBuffer`, `playNote`), `playBuzz`, `playFanfare`, metronome (`metro`, `metroStart/Stop`), timer (`timer`, `timerStart/Stop/Reset`, `updateTimerDisplay`) |
| `drone.js` | Root drone (`drone`, `droneMidi`, `droneStart/Stop`, `droneRetune`, `toggleDrone`, `syncDroneUi`): root + fifth in octave 2, glides on key change, disabled while SOUND is off |
| `player.js` | Resumable step sequencer (`playSteps`, `stopSteps`, `playerTick`) + global pause (`setPaused`, `togglePause`, `updatePlayingFlag`); `PAUSED_TEXT` |
| `engine.js` | Music helpers (`midiToChroma`, `fretMidi`, `fretChroma`, `spell`, `getAnchorOffset`, `computeScaleChromas`, `boxOctaveShift`, `computeActiveBoxes`, `transposeFretInBox`, `setKey`, `isInScale`, `isRoot`, `blueChroma`, `isBlue`, `isInBox` (with slack), `transposeFret`), fretboard SVG (`buildFretboard`, `refreshNotes`), `playCurrentScale`, `playGen` |
| `game.js` | Boot validator IIFE, game engine (`pickLick`, `showGamePhase`, `onGameNoteClick`, `lickComplete`, `updateGamePanel`, `updateGameHUD`, `enterGame`, `exitGame`), persistence (`saveGame`, `loadGame`) |
| `practice.js` | Modal helpers (`toggleHelp`, `closeHelp`, `togglePractice`, `closePractice`, `renderChallenge`), learning modal (`LESSONS`, `toggleLearn`, `closeLearn`, `renderLesson`) |
| `changelog.js` | `CHANGELOG` (releases newest first, `[name, text]` items), `toggleChangelog`/`closeChangelog`/`renderChangelog`, new-release dot (`syncChangelogBadge`/`markChangelogSeen`, `pent-changelog-seen`). Add a release here on every tag |
| `app.js` | `state` object (incl. `accidentals`, `blues`, `paused`, pattern fields), `$`/`$$`, `onNoteClick`, `flashNote`, `applyTheme`, `renderKeyLabels`, `updateBlueLegend`, `loadPrefs`/`savePrefs` (`pent-prefs`), `wireControls`, boot sequence |
| `patterns.js` | Custom patterns: BUILD clicks (`togglePick`), `applyPattern` / `drawSteps` (picked notes + step numbers), saved patterns (`readSaved`/`writeSaved`, `pent-patterns`), `loadSelected` (classics + mine), key-A reference conversion (`toRef`/`fromRef`, lens-aware via `patternLens`), `chromaticRun` |
| `hud.js` | Theme dropdown (`syncThemeTrigger`), popover placement, arrow/Home/End keys, compact-on-scroll (`body.scrolled`) |
| `themes.css` | Theme tokens: `:root` (CRT default) + `body.theme-tropical/mission/blueprint`, incl. `--blue-note` (cobalt), `--blue-rim`, `--marker` (soft yellow fret dots, `:root` only), `--title-drop` (offset title shadow, CRT only) and `--note-size` (fret-note letters, 10px on Tropical/Mission). The only file that sets theme colours |
| `styles.css` | Layout, controls, fretboard, legend, lesson, game panel; phone breakpoint at 700px |
| `hud.css` | Sticky header, keycap look shared by the drone chip and rail buttons (`--key-line`/`--key-edge`), `.hud-label` text (hidden on phones), `data-tip` tooltips, pause button states, theme popover, phone rules |
| `modals.css` | Modal shell, Practice Lab, Learning lessons, changelog (incl. the pulsing new-release dot), win screen |
| `features.css` | Blue-note styling and its controls, pattern UI (`.picked`, `.fb-step`, pattern inputs) |

### Key model — PARALLEL (v3.1+)

Each KEY button selects a **root note**; MINOR/MAJOR picks that root's own pentatonic. The two lenses give **different 5 notes** (not the same shapes with a different root highlight).

- `C` + MAJOR → C D E G A (no accidentals) ✓
- `C` + MINOR → C D# F G A# (♭ mode: C Eb F G Bb)
- `A` + MINOR → A C D E G (classic blues)

**Box/lick anchoring** still uses the Am-anchored `BOXES`/`LICKS` data via `getAnchorOffset()`:
- Minor: `anchorChroma = rootChroma`; offset = `(root - 9 + 12) % 12`
- Major: `anchorChroma = (rootChroma + 9) % 12` (relative minor); same offset formula

**Scale membership** is tested by **chroma** (integer 0–11), never by note name. `spell(chroma)` returns the sharp or flat name per `state.accidentals`.

**Lens change must call `setKey(state.keyIdx)` again** — the anchor offset changes, so `state.activeBoxes` must be recomputed.

### Other key design points

- **One SVG, class toggles only.** `refreshNotes()` is the hot path; `buildFretboard()` runs once at boot. Never rebuild the SVG for state changes. Pattern step numbers are a `#pattern-steps` group re-appended into that same SVG.
- **String order is high→low** in `STRINGS[]` (index 0 = high e). `BOXES`, `LICKS`, MIDI math all assume this.
- **`BOXES` and `LICKS` data are Am-anchored.** `boxOctaveShift(boxRanges, offset)` finds a single octave-shift `k` so the **whole box** (all 6 strings) fits in [0, TOTAL_FRETS] as a **rigid unit** — this prevents the fragmentation bug where per-string wrapping split the box across two neck regions. `transposeFretInBox(f, ao, pos)` applies the same rigid shift for lick notes.
- **Generation counter (`playGen`).** Bumped on every mode/sequence/box/key change and on PLAY SCALE. `playSteps` stamps each sequence with the current value, and `playerTick` drops it once they differ. The game's between-lick timers go through `nextLickAfter(ms, replay)` (1000 ms after a clean lick, 1800 ms after a miss), which fires only if still in game mode and `playGen` has not moved on.
- **Pause (`player.js`).** `setPaused(true)` clears the sequencer timer, stops the metronome, timer and drone (remembering which were running), and shows PAUSED in the game status. Resume restarts only what was running and continues the sequence at the same step. `body.is-paused` / `body.is-playing` drive the pause button and CSS. `togglePause()` does nothing when nothing is playing. Space or K toggles it.
- **Pause and clicks.** While paused in a game, note clicks are ignored; in explore mode they still sound. PLAY SCALE while paused bumps `playGen` first, then resumes, which drops the paused sequence.
- **Pattern storage (`patterns.js`).** Saved frets are key-A references: `f − delta`, where `delta = (rootChroma − 9) mod 12`. They are stored raw and may be negative. `fromRef` maps them back by preferring the plain shift `delta`, then `delta − 12`, then `delta + 12` (the whole pattern moves as one unit, like `boxOctaveShift`). Only if none fits does it wrap each note. One saved pattern works in every key. Loading never changes the lens: `fromRef(ref, patternLens)` adds −3 (minor shape in MAJOR → relative minor) or +3 (major shape in MINOR → relative major), so every note stays in the current scale. A lens change re-runs `syncPattern()`.
- **CHROMATIC preset.** `state.patternChromatic` makes `refreshNotes()` skip box dimming and give out-of-scale notes `.chromatic` (readable, neutral) instead of `.out`; scale/root colours stay. PLAY SCALE plays `chromaticRun()`: 13 notes up from the low-E root in one 5-fret position, then back down.
- **Fret markers.** Side dots under the low E string at `MARKER_FRETS` (3 5 7 9 12× 15 17), soft yellow `--marker`, not face inlays (lit notes would hide them); those fret numbers are brighter.
- **Blue-note slack.** `refreshNotes()` passes slack 1 to `isInBox` for blue notes, so a blue note one fret past the box edge stays lit. Scale notes get no slack. Blue notes are lit only when `state.blues` is on.
- **Popover menu.** `#theme-menu` is a native popover opened by `#theme-trigger` (`popovertarget`). `hud.js` places it on `toggle` (right-aligned under the trigger, clamped to the viewport) and handles ArrowUp/ArrowDown/Home/End. Global keyboard shortcuts skip inputs, selects and `#theme-menu`.
- **Game follows user's box.** Box buttons stay live in game mode; switching box or key restarts the lick with `++playGen`. Lens, PLAY SCALE and the PATTERNS controls are locked during game. After a sequence with any wrong note: 1.8 s pause, then the SAME lick again (`showGamePhase(true)` keeps `lickAttempts`); a 2nd miss moves to a new lick. Once the last note is clicked `gamePhase` becomes `'judge'`, so clicks in the gap are ordinary note clicks.
- **Finish-then-judge.** Wrong notes no longer abort the lick mid-sequence — the player finishes the whole sequence, then gets feedback.
- **Autoplay policy.** Every audio path routes through `ensureAudio()` from a user click.
- **localStorage is always wrapped in try/catch** (throws in private/incognito mode).

## Themes

| Name | Class | Font | Scanline |
|------|-------|------|----------|
| CRT Arcade (default) | `:root` | Press Start 2P + VT323 | 0.18 |
| Tropical Night 🌴 | `theme-tropical` | Fredoka + Nunito | 0.07 |
| Mission Control 🛰️ | `theme-mission` | Chakra Petch + IBM Plex Sans | 0.09 |
| Blueprint 📐 | `theme-blueprint` | JetBrains Mono (both) | 0.02 |

Editing any theme = its `body.theme-*` override block in `themes.css` (every token, `--blue-note` included).

New theme:
1. Copy a `body.theme-*` block in `themes.css` and set every token, including `--blue-note` and `--blue-rim`.
2. In `index.html`, add a `.theme-btn` with `data-theme="<name>"` and a `<svg class="swatch">` inside `#theme-menu`.
3. In `hud.js`, add the name to the map in `syncThemeTrigger()`.
4. In `app.js`, add the class to the `classList.remove(...)` call in `applyTheme()`, and add the name to the `valid` array in `wireControls()`.

The early-theme inline script needs no change (it adds `theme-<saved name>` generically).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`–`5` | Select box position |
| `0` | ALL positions |
| `?` | Toggle help modal |
| `P` | Toggle Practice Lab |
| `L` | Toggle LEARNING modal |
| `Space` or `K` | Pause / resume everything playing (does nothing when idle) |
| `D` | Root drone on / off |
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
| `v3.1.0-parallel-keys` | Parallel key model + game follows box + bidirectional scale |
| `v3.2.0-themes` | Synthwave Neon + Blueprint replace Space/VSC |
| `v3.4.0-modularized` | app.js split into 6 ordered plain scripts |
| `v3.5.0-test-suite` | Comprehensive test suite: 232 tests, CRT-arcade SYSTEM DIAGNOSTICS report |
| `v3.5.1-box-bug-fix` | Fix box fragmentation bug (rigid per-box shift) + finish-then-judge game UX |
| `v3.6.0-themes` | Tropical Night + Mission Control replace Hawaii + Synthwave |
| `v3.8.0-learning` | LEARNING modal — 5 lessons, prev/next nav, L keybind |
| `v4.0.0-all-sharps` | All-sharps spelling, tests + docs sync |
| `v4.1.0-hud-pause-blues-patterns` | Sticky HUD + theme menu, global pause, flats toggle, blue notes, custom patterns |
| `v4.3.0-drone-chromatic-changelog` | Root drone, CHROMATIC preset, fret side dots, cobalt blue, new theme fonts, keycap HUD, CHANGELOG popup |

## Conventions
- Surgical changes only. No build step, no framework, no dependencies beyond CDN fonts.
- Eleven plain `<script>` files (not ES modules — no server needed). Boot order matters: `data → audio → drone → player → engine → game → practice → changelog → app → patterns → hud`. Inside `app.js`, `loadPrefs()` runs before `wireControls()` because key labels read `spell()`.
- Arcade/retro theme is intentional. Don't migrate to "modern clean" without asking.
- The boot-time LICK validator stays in `game.js` permanently — it costs nothing at runtime.
- Tooltips use the `data-tip` attribute (styled in `hud.css`), never `title=`.
- Note spelling is a user pref (sharps by default). Flats live in `FLAT_NAMES` (`data.js`) and are picked only by `spell()`.

<!-- claude-reflect: learned rules (saved from the band; edit freely) -->
## Learned rules
- For tasks needing substantial new code, delegate the coding to a subagent using Haiku 5.5 xhigh, then verify its output; do other work yourself.
<!-- end claude-reflect -->
