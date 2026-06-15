// data.js — constants and lookup tables (loaded first)

const PENT_OFFSETS  = [0, 3, 5, 7, 10];
const MAJOR_OFFSETS = [0, 2, 4, 7, 9];

const SHARP_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NAMES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const FLAT_MINOR_ROOTS = new Set([0, 2, 3, 5, 7, 10]);
const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 6, 8, 10]);

const STRINGS = [
  { name:'e', midi:64, thick:false },
  { name:'B', midi:59, thick:false },
  { name:'G', midi:55, thick:false },
  { name:'D', midi:50, thick:true  },
  { name:'A', midi:45, thick:true  },
  { name:'E', midi:40, thick:true  },
];

const TOTAL_FRETS = 17;

const BOXES = {
  1: { e:[5,8],   B:[5,8],   G:[5,7],   D:[5,7],   A:[5,7],   E:[5,8]   },
  2: { e:[8,10],  B:[8,10],  G:[7,9],   D:[7,10],  A:[7,10],  E:[8,10]  },
  3: { e:[10,12], B:[10,13], G:[9,12],  D:[10,12], A:[10,12], E:[10,12] },
  4: { e:[12,15], B:[13,15], G:[12,14], D:[12,14], A:[12,15], E:[12,15] },
  5: { e:[15,17], B:[15,17], G:[14,17], D:[14,17], A:[15,17], E:[15,17] },
};

const KEYS = [
  { name:'A',  chroma:9  },
  { name:'Bb', chroma:10 },
  { name:'B',  chroma:11 },
  { name:'C',  chroma:0  },
  { name:'C#', chroma:1  },
  { name:'D',  chroma:2  },
  { name:'Eb', chroma:3  },
  { name:'E',  chroma:4  },
  { name:'F',  chroma:5  },
  { name:'F#', chroma:6  },
  { name:'G',  chroma:7  },
  { name:'Ab', chroma:8  },
];

const LICKS = {
  1: [
    { name:'Classic Descend',  steps:[{s:0,f:8},{s:0,f:5},{s:1,f:8},{s:1,f:5}] },
    { name:'Root Bounce',      steps:[{s:1,f:5},{s:2,f:7},{s:2,f:5},{s:3,f:7}] },
    { name:'E String Climb',   steps:[{s:5,f:5},{s:4,f:5},{s:4,f:7},{s:3,f:5},{s:3,f:7},{s:2,f:5}] },
    { name:'Box 1 Runner',     steps:[{s:0,f:5},{s:0,f:8},{s:1,f:5},{s:1,f:8},{s:2,f:5},{s:2,f:7}] },
  ],
  2: [
    { name:'VII Descend',      steps:[{s:0,f:10},{s:0,f:8},{s:1,f:10},{s:1,f:8}] },
    { name:'Cross Box',        steps:[{s:2,f:9},{s:2,f:7},{s:3,f:10},{s:3,f:7}] },
    { name:'Low String Run',   steps:[{s:5,f:10},{s:4,f:10},{s:4,f:7},{s:3,f:7},{s:2,f:9}] },
    { name:'Box 2 Flow',       steps:[{s:0,f:8},{s:0,f:10},{s:1,f:8},{s:1,f:10},{s:2,f:7},{s:2,f:9},{s:3,f:7}] },
  ],
  3: [
    { name:'IX Roller',        steps:[{s:0,f:12},{s:0,f:10},{s:1,f:13},{s:1,f:10}] },
    { name:'Mid Climb',        steps:[{s:2,f:9},{s:2,f:12},{s:3,f:10},{s:3,f:12}] },
    { name:'Low Drive',        steps:[{s:5,f:10},{s:4,f:10},{s:4,f:12},{s:3,f:12},{s:2,f:12}] },
    { name:'Box 3 Cascade',    steps:[{s:0,f:12},{s:1,f:13},{s:1,f:10},{s:2,f:12},{s:2,f:9},{s:3,f:10},{s:3,f:12}] },
  ],
  4: [
    { name:'XII Slide',        steps:[{s:0,f:15},{s:0,f:12},{s:1,f:15},{s:1,f:13}] },
    { name:'High Zone',        steps:[{s:2,f:12},{s:2,f:14},{s:3,f:12},{s:3,f:14}] },
    { name:'High Climb',       steps:[{s:4,f:12},{s:4,f:15},{s:5,f:12},{s:5,f:15}] },
    { name:'Box 4 Phrase',     steps:[{s:0,f:15},{s:1,f:15},{s:1,f:13},{s:2,f:14},{s:2,f:12},{s:3,f:14},{s:3,f:12}] },
  ],
  5: [
    { name:'Top End Run',      steps:[{s:0,f:17},{s:0,f:15},{s:1,f:17},{s:1,f:15}] },
    { name:'Neck Climb',       steps:[{s:2,f:14},{s:2,f:17},{s:3,f:14},{s:3,f:17}] },
    { name:'Full Box 5',       steps:[{s:5,f:15},{s:4,f:15},{s:4,f:17},{s:3,f:14},{s:2,f:14}] },
    { name:'Box 5 Solo',       steps:[{s:0,f:17},{s:1,f:17},{s:1,f:15},{s:2,f:17},{s:2,f:14},{s:3,f:17},{s:3,f:14},{s:4,f:15}] },
  ],
};

const GAME = { XP_PER_LICK:100, STREAK_MAX_MULT:3 };
