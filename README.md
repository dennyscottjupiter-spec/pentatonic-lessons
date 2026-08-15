---
title: pentatonic-lessons
status: current
updated: 2026-10-27
---

# Pentatonic Arcade

An interactive, browser-based guitar lesson tool for learning the pentatonic scale across all 12 keys. It shows a clickable fretboard, plays real plucked-guitar audio for every note, and includes a memorization game so you can test what you've learned.

## What it does

Pick a root note (A through G#) and a MINOR or MAJOR pentatonic lens, and the fretboard lights up with that scale — root notes in one color, scale notes in another, everything else dimmed. Click any fret to hear it played. Five "box" positions let you focus on one region of the neck at a time, or view the whole fretboard at once. A built-in "Lick Attack" game flashes short licks on the fretboard for you to replay from memory, awarding XP and speeding up as you improve. A Practice Lab adds a metronome, a countdown timer, and a 7-day practice plan. A five-lesson "LEARNING" modal walks through the underlying music theory.

It is a single static web page — there is no backend, no account, and no data leaves your machine (aside from optional YouTube search links for backing tracks).

## Setup

Prerequisites:
- Any modern browser (Chrome, Edge, Firefox). No installation, build step, or package manager is required.
- Optional: Python 3 if you want to serve the folder over `http://localhost` instead of opening the file directly. This isn't required for normal use.

Install steps: none. Clone or copy the `pentatonic-lessons` folder anywhere and open it.

## Usage

The simplest way to run it is to open `index.html` directly in your browser (double-click it, or from a terminal in the project folder):

```powershell
Start-Process index.html
```

Once it's open:
1. Under **KEY**, click a root note (e.g. `A`).
2. Under **SCALE LENS**, pick **MINOR** or **MAJOR** — this changes which 5 notes are highlighted.
3. Under **BOX POSITION**, pick `1`–`5` to focus on one neck region, or `ALL` to see the whole scale.
4. Click any fret on the fretboard to hear and see that note.
5. Click **▶ PLAY SCALE** to hear the box played ascending then descending.
6. Click **▶ START GAME** to play Lick Attack: watch a short lick light up, then replay it by clicking the same frets in order.
7. Click **🏋️** (top right) to open the Practice Lab, or **📚 LEARNING** for the theory lessons.

Keyboard shortcuts: `1`–`5` select a box, `0` shows all positions, `?` toggles help, `P` toggles the Practice Lab, `L` toggles the learning modal, `Esc` closes any open panel.

If you edit the source files, hard-refresh the browser tab (Ctrl+Shift+R) — a normal reload can serve a cached copy of the CSS/JS.

### Running the test suite

The project ships its own zero-dependency test suite (236 tests covering the music theory math, scale data, and fretboard rendering). Because it loads scripts via `<script src="...">`, Chrome's file:// security model blocks it when opened directly as a file — serve the folder locally first:

```bash
cd pentatonic-lessons
python3 -m http.server 8934
```

Then open `http://localhost:8934/tests.html` in a browser; all tests should pass with 0 failures. Stop the server with Ctrl+C when done.

## Outputs

There are no files produced. Everything is on-screen:
- A rendered, color-coded SVG fretboard showing scale notes, root notes, and out-of-scale notes.
- Audio played through the browser (Karplus-Strong synthesized plucked-guitar sound) when you click a note or press play.
- A running score, streak, and XP display during the Lick Attack game.
- Your last selected theme, high score, and game progress are saved to the browser's `localStorage` (per-browser, not exported anywhere).

## Limitations

- No backend, no accounts, no sync between devices or browsers — progress lives only in that browser's local storage and is lost if it's cleared.
- No audio recording, MIDI input, or real-guitar pitch detection — it's a visual/playback reference tool, not a tuner or ear-trainer that listens to you.
- Only pentatonic scales (minor and major) are covered — no other scale types, modes, or chords.
- Note names are spelled with sharps only (e.g. `A#`, not `Bb`) everywhere, by design — there is no flat-spelling option.
- Requires a browser with Web Audio API support; very old browsers won't play sound.
- Opening `index.html` directly as a file works for normal use, but `tests.html` needs a local HTTP server (see above) due to browser file:// restrictions on loading multiple scripts.
