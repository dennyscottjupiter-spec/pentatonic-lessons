# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
Static, no-build HTML/CSS/JS app that teaches guitar pentatonic scales with an interactive fretboard, audio playback, and switchable box positions. Arcade/retro visual theme.

## How to run
Open `index.html` directly in a browser — no server, no bundler, no install step. From PowerShell: `Start-Process index.html`. Hard-refresh with **Ctrl+Shift+R** after edits to bypass browser CSS cache (see global LEARNINGS).

There is no build, lint, or test command. Verification = open the page and click frets.

## Architecture

Three files, single page, no modules.

- **`index.html`** — static structure only: HUD, level card, control fieldsets (lens / box / options), an empty `#fretboard` div the SVG renders into, legend, lesson blurb. Loads `styles.css` then `app.js` at the bottom.
- **`styles.css`** — all visual styling. CRT scanline overlay is a fixed full-screen `repeating-linear-gradient`. Note states (`in-scale`, `root`, `out`, `dimmed`, `playing`) are CSS classes toggled per `<g class="fb-note">`. Editing colors = top-of-file `:root` custom properties only.
- **`app.js`** — all behavior. Procedural, no framework. Boots inline at file end (`buildFretboard(); refreshNotes(); wireControls();`).

### `app.js` internal structure (read in this order)

1. **Music constants** — `NOTE_NAMES`, `STRINGS` (high e first, low E last — matches tab/display order), `TOTAL_FRETS`, `SCALE_NOTES` set, `BOXES[1..5]` (per-string `[lo, hi]` fret ranges).
2. **`state` object** — single source of truth: `lens` (`'Am'`/`'C'`), `box` (`'1'..'5'` or `'all'`), `labels`, `sound`, `score`. Every UI control mutates `state` then calls `refreshNotes()`.
3. **Music helpers** — `midiToName`, `midiToFreq`, `fretMidi`, `isInScale`, `isRoot`, `isInBox`. Pure functions reading `state`.
4. **Audio** — single lazy `AudioContext` (browser autoplay policy requires user gesture). `playNote(midi, duration)` builds triangle + sine-octave oscillators with exponential-decay gain envelope, then disposes.
5. **Fretboard render** — `buildFretboard()` constructs the SVG once; every fret on every string gets its own `<g class="fb-note">` with data attributes (`data-string`, `data-fret`, `data-note`, `data-midi`) and a click listener.
6. **`refreshNotes()`** — does NOT rebuild the SVG. Walks all existing `.fb-note` groups and toggles classes based on current `state`. This is the hot path for every lens/box/label change.

### Key design points

- **Lens vs box are orthogonal.** Lens (`Am` ↔ `C`) only changes which note is the root — the 5 highlighted notes never move. Box (`1..5`) only dims out-of-position notes — it never changes which notes exist. Don't conflate them when extending.
- **One SVG, class toggles only.** `refreshNotes()` is called every state change; `buildFretboard()` runs once at boot. If you need to add/remove fret positions dynamically, prefer extending the data + re-class loop over rebuilding.
- **String order is high→low** in `STRINGS[]` (index 0 = high e). Display layout, MIDI math, and `BOXES[]` all assume this. Don't reverse it without auditing all three.
- **`BOXES` data is hand-curated** standard pentatonic shapes. If a position looks wrong on the fretboard, fix it here — not in the renderer.

## Extending to more scales / keys

Add a new scale by introducing parallel data tables (e.g. `SCALES = { 'Am': {notes: Set, root: 'A'}, 'Em': {...} }`) and indexing `state.lens` into them. `BOXES` is currently A-pent-specific (frets V/VII/IX/XII/XIV); shifting to another key means either new `BOXES` entries or a `transposeBoxes(semitones)` helper. Keep `index.html` shape-agnostic — drive the lens/box buttons from JS if the option list grows.

## Conventions
- Surgical changes only. No build step, no framework, no dependencies beyond CDN fonts (`Press Start 2P`, `VT323`).
- Keep all logic in `app.js`. Don't split into modules — the no-build constraint means no ES module resolution without a server.
- Arcade/retro theme is intentional (user preference). Don't migrate to a "modern clean" look without asking.
