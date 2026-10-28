---
title: pentatonic-lessons
status: current
updated: 2026-10-28
---

# Pentatonic Arcade

An interactive, browser-based guitar lesson tool for learning the pentatonic scale across all 12 keys. It shows a clickable fretboard, plays real plucked-guitar audio for every note, and includes a memorization game so you can test what you've learned.

## What it does

Pick a root note (A through G#) and a MINOR or MAJOR pentatonic lens, and the fretboard lights up with that scale — root notes in one color, scale notes in another, everything else dimmed. Click any fret to hear it played. Five "box" positions let you focus on one region of the neck at a time, or view the whole fretboard at once.

Extras on the same page:
- **Note names** can be sharps (♯) or flats (♭).
- **Blue note** adds the blues note (♭5 in minor, ♭3 in major).
- **Patterns** let you draw your own shape on the neck, save it by name, or load one of six classics (one is a chromatic map of every note).
- **Root drone** (top left) holds the key's root and fifth so you can hear each note against it.
- **Pause** freezes anything that is playing (scales, the game, the drone, the metronome, the timer) and resumes at the same note.
- A sticky top bar keeps the drone, the pause button, a theme menu (four themes), the Practice Lab and help within reach while you scroll.

A built-in "Lick Attack" game flashes short licks on the fretboard for you to replay from memory, awarding XP and speeding up as you improve. A Practice Lab adds a metronome, a countdown timer, and a 7-day practice plan. A five-lesson "LEARNING" modal walks through the underlying music theory.

It is a single static web page — there is no backend, no account, and no data leaves your machine (aside from optional YouTube search links for backing tracks).

## Setup

Prerequisites:
- Any modern browser (Chrome, Edge, Firefox). No installation, build step, or package manager is required.
- Optional: Python 3 if you want to serve the folder over `http://localhost` instead of opening the file directly. This isn't required for normal use.

Install steps: none. Clone or copy the `pentatonic-lessons` folder anywhere and open it.

Project layout:

```
index.html   the app (open this)
css/         stylesheets
js/          scripts
tests/       test page and suites
```

## Usage

The simplest way to run it is to open `index.html` directly in your browser (double-click it, or from a terminal in the project folder):

```powershell
Start-Process index.html
```

Once it's open:
1. Under **KEY**, click a root note (e.g. `A`).
2. Under **SCALE LENS**, pick **MINOR** or **MAJOR** — this changes which 5 notes are highlighted.
3. Under **BOX POSITION**, pick `1`–`5` to focus on one neck region, or `ALL` to see the whole scale.
4. Under **NOTE NAMES**, pick **♯ SHARPS** (the default) or **♭ FLATS** to respell every note.
5. Turn on **+ BLUE NOTE** to show the blues note, drawn with a dashed ring. It also shows one fret past the box edge.
6. Click any fret to hear and see that note.
7. Click **▶ PLAY SCALE** to hear the box played ascending then descending.
8. Click **▶ START GAME** to play Lick Attack: watch a short lick light up, then replay it by clicking the same frets in order. The lens, PLAY SCALE and PATTERNS are locked during the game.
9. The button at the top left shows the key and starts or stops the **root drone** (`D`). Use the icon bar at the top right: the **pause** button, the **theme menu** (switches between CRT, Tropical Night, Mission Control and Blueprint), **PRACTICE** (opens the Practice Lab: metronome + timer), and **HELP** (shortcuts and how-to). **📚 LEARNING** under OPTIONS opens the theory lessons.
10. Under **PATTERNS** you can draw your own shape:
    - Press **✎ BUILD**, then click notes to add or remove them. The numbers show the play order (first click plays first).
    - Type a name (up to 24 characters) and press **SAVE**. Your shapes appear under **MY PATTERNS** in the LOAD dropdown.
    - Pick a classic or a saved pattern in **LOAD** to load it; this also sets the blue note. Your lens stays: a minor shape loaded in MAJOR moves to the relative minor, so every note is still in your scale. **DELETE** removes a saved pattern and **CLEAR** empties the board.
    - Patterns follow the key you pick, and **▶ PLAY SCALE** plays one in its order. Clicking a box position or starting the game clears the pattern.
    - The six classics are B.B. King Box, Albert King Box, Blues Scale Box 1, Major Blues Box 1, Root Map and Chromatic (all 12 notes on the whole neck; PLAY SCALE runs one octave up from the root and back).

Press **Space** (or **K**) to pause or resume everything that is playing. It does nothing when nothing is playing.

Keyboard shortcuts: `1`–`5` select a box, `0` shows all positions, `?` toggles help, `P` toggles the Practice Lab, `Space` or `K` pauses and resumes, `D` toggles the root drone, `L` toggles the learning modal, `Esc` closes any open panel.

If you edit the source files, hard-refresh the browser tab (Ctrl+Shift+R) — a normal reload can serve a cached copy of the CSS/JS.

### Running the test suite

The project ships its own zero-dependency test suite (312 tests covering the music theory math, scale data, fretboard rendering, note names, blue notes, patterns, pause and the game). It lives in `tests/`; serve the project folder locally to run it:

```bash
cd pentatonic-lessons
python3 -m http.server 8934
```

Then open `http://localhost:8934/tests/tests.html` in a browser; all tests should pass with 0 failures. Stop the server with Ctrl+C when done.

## Outputs

There are no files produced. Everything is on-screen:
- A rendered, color-coded SVG fretboard showing scale notes, root notes, and out-of-scale notes.
- Audio played through the browser (Karplus-Strong synthesized plucked-guitar sound) when you click a note or press play.
- A score, best score, streak, and XP display in the Lick Attack game panel.
- Saved in the browser's `localStorage` (per-browser, not exported anywhere):
  - your theme (`pent-theme`) and your note-name and blue-note choices (`pent-prefs`)
  - your saved patterns (`pent-patterns`)
  - your high score and game XP (`pent-game`)

## Limitations

- No backend, no accounts, no sync between devices or browsers — progress, saved patterns and settings live only in that browser's local storage and are lost if it's cleared.
- No audio recording, MIDI input, or real-guitar pitch detection — it's a visual/playback reference tool, not a tuner or ear-trainer that listens to you.
- Only pentatonic scales (minor and major) are covered — no other scale types, modes, or chords.
- Requires a browser with Web Audio API support; very old browsers won't play sound.
- Opening `index.html` directly as a file works for normal use; run the test page through a local HTTP server (see above).
