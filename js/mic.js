// ---
// purpose: PLAY IT mic listener: YIN pitch detection, note-onset rule, mic start/stop
// exports: mic, micStart, micStop, micFeed, micReset, detectPitch, hzToMidi, rms
// depends: audio.js (ensureAudio), engine.js (midiToChroma); quiz.js passes the callbacks
// gotcha: the analyser is never connected to ctx.destination, or the speakers feed the mic
// ---

const mic = { on:false, want:false, stream:null, src:null, analyser:null, buf:null, timer:0, onNote:null, onLevel:null, cand:-1, count:0, last:-1, prevRms:0, fresh:false };
const MIC_GATE = 0.01;      // RMS below this is silence
const MIC_FRAMES = 3;       // the same chroma this many polls in a row counts as a note
const MIC_ATTACK = 1.6;     // RMS jump ratio between polls that means a new pluck
const MIC_MIN_HZ = 70;      // a bit under low E2 (82 Hz), so a flat low string still reads
const MIC_MAX_HZ = 1100;    // the neck tops out at A5 (880 Hz), with headroom
const MIC_MS = 50;          // poll interval

function hzToMidi(hz) { return Math.round(69 + 12 * Math.log2(hz / 440)); }

function rms(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

// YIN: the first lag whose normalised difference dips under 0.15 is the period (this also rejects octave errors)
function detectPitch(buf, rate) {
  if (rms(buf) < MIC_GATE) return -1;
  const minLag = Math.floor(rate / MIC_MAX_HZ), maxLag = Math.ceil(rate / MIC_MIN_HZ);
  const W = Math.min(buf.length - maxLag, 2048);
  if (W < maxLag) return -1;
  const d = new Float32Array(maxLag + 1), dn = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
    d[tau] = s;
  }
  let run = 0;
  for (let tau = 1; tau <= maxLag; tau++) { run += d[tau]; dn[tau] = run > 0 ? d[tau] * tau / run : 1; }
  let t = -1;
  for (let k = Math.max(2, minLag); k < maxLag; k++) {
    if (dn[k] < 0.15) {
      while (k + 1 < maxLag && dn[k + 1] < dn[k]) k++;   // slide to the bottom of this dip
      t = k; break;
    }
  }
  if (t < 0) return -1;
  const a = dn[t - 1], b = dn[t], c = dn[t + 1], den = a - 2 * b + c;
  const shift = den > 0 ? (a - c) / (2 * den) : 0;   // parabolic fit gives a sub-sample lag
  return rate / (t + shift);
}

// Clears the onset state, so a new session starts with no note held
function micReset() { mic.cand = -1; mic.count = 0; mic.last = -1; mic.prevRms = 0; mic.fresh = false; }

// Returns the chroma to emit, or -1. A ringing string answers once; a new note, a silence gap or a fresh pluck counts again.
function micFeed(chroma, level) {
  if (level > mic.prevRms * MIC_ATTACK && level >= MIC_GATE) mic.fresh = true;
  mic.prevRms = level;
  if (chroma < 0) {
    mic.cand = -1; mic.count = 0;
    if (level < MIC_GATE) mic.last = -1;   // only real silence frees the note; an unreadable poll mid-ring must not
    return -1;
  }
  mic.count = chroma === mic.cand ? mic.count + 1 : 1;
  mic.cand = chroma;
  if (mic.count < MIC_FRAMES || (chroma === mic.last && !mic.fresh)) return -1;
  mic.last = chroma; mic.fresh = false;
  return chroma;
}

// Asks for the mic and polls it; resolves false if denied or if the user left PLAY IT meanwhile
async function micStart(onNote, onLevel) {
  if (mic.on) return true;
  mic.want = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { mic.want = false; return false; }
  const ctx = ensureAudio();   // inside the click: after the permission prompt the context could no longer resume
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch (e) { mic.want = false; return false; }
  if (!mic.want || mic.on) { stream.getTracks().forEach(t => t.stop()); return mic.on; }
  mic.stream = stream;
  mic.src = ctx.createMediaStreamSource(stream);
  mic.analyser = ctx.createAnalyser();
  mic.analyser.fftSize = 4096;
  mic.src.connect(mic.analyser);   // never to ctx.destination: the speakers would feed the mic
  mic.buf = new Float32Array(mic.analyser.fftSize);
  micReset();
  mic.onNote = onNote; mic.onLevel = onLevel;
  mic.timer = setInterval(() => {
    mic.analyser.getFloatTimeDomainData(mic.buf);
    const level = rms(mic.buf);
    if (mic.onLevel) mic.onLevel(level);
    const hz = detectPitch(mic.buf, ctx.sampleRate);
    const e = micFeed(hz > 0 ? midiToChroma(hzToMidi(hz)) : -1, level);
    if (e >= 0 && mic.onNote) mic.onNote(e);
  }, MIC_MS);
  mic.on = true;
  return true;
}

// Releases the mic: stops the poll, the tracks and the audio graph
function micStop() {
  mic.want = false;
  clearInterval(mic.timer);
  if (mic.stream) mic.stream.getTracks().forEach(t => t.stop());
  if (mic.src) mic.src.disconnect();
  Object.assign(mic, { on: false, stream: null, src: null, analyser: null, buf: null, timer: 0, onNote: null, onLevel: null });
}
