// Project model, validation and timeline. Shared by the editor and the renderer
// so the browser preview and the exported MP4 are frame-for-frame identical.

import { clamp, hex2rgb } from './lib.js';

export const STYLES = [
  { id: 'swiss', name: 'Swiss Grid', hi: 'स्विस ग्रिड', family: 'Graphic & Type', accent: '#E30613', blurb: 'Grid, one signal colour, type that snaps on the beat.' },
  { id: 'neon', name: 'Neon Tubes', hi: 'नियॉन ट्यूब', family: 'Light & Lines', accent: '#22E6C8', blurb: 'Glowing glass, rain and a sign that flickers on the beat.' },
  { id: 'keynote', name: 'Dark Keynote', hi: 'डार्क कीनोट', family: 'Screens & Interfaces', accent: '#7C6BFF', blurb: 'Launch-film gradients, cards and a confident push-in.' },
  { id: 'blueprint', name: 'Blueprint', hi: 'ब्लूप्रिंट', family: 'Line Diagrams', accent: '#67D9FF', blurb: 'Technical grid, dimension lines and drawings that draw themselves.' },
  { id: 'riso', name: 'Riso Print', hi: 'रिसो प्रिंट', family: 'Print & Printmaking', accent: '#FF4E7A', blurb: 'Two-colour overprint, halftone dots and happy misregistration.' },
  { id: 'caption', name: 'Caption Cuts', hi: 'कैप्शन कट्स', family: 'Edit & Documentary', accent: '#FF3B30', blurb: 'Hard-cut kinetic words for talking-head hooks.' },
  { id: 'mythic', name: 'Mythic Epic', hi: 'पौराणिक', family: 'Epic & Lore', accent: '#E10600', blurb: 'Blood-red dust, gold, cracks in the earth and a curse that lands on the beat.' },
  { id: 'cartoon', name: 'Cartoon Epic', hi: 'कार्टून', family: 'Cartoons', accent: '#FF6B2C', blurb: 'Bright 2D cartoon: full characters, faces, scenery, comic bursts and motion lines.' },
];

export const SIZES = {
  'reel-hd': { w: 1080, h: 1920, label: 'Reel HD', note: '1080 × 1920 · 9:16' },
  'reel-fast': { w: 720, h: 1280, label: 'Reel Fast', note: '720 × 1280 · 9:16' },
  'feed': { w: 1080, h: 1350, label: 'Feed 4:5', note: '1080 × 1350 · 4:5' },
  'square': { w: 1080, h: 1080, label: 'Square', note: '1080 × 1080 · 1:1' },
};

export const INTRO = 2.2;
export const OUTRO = 2.0;
export const FPS = 30;

export const PRESETS = [
  {
    id: 'design', label: '5 Design Rules',
    project: {
      title: '5 RULES FOR A REEL', handle: '@motion.reels', style: 'swiss', accent: '#E30613', size: 'reel-hd',
      script: `Hook them in 1 second | The first frame decides everything\nOne idea per shot | Cut anything that competes\nGrid it | Align to 12 columns and hold the beat\nType contrast | One giant line, one tiny note\nBreak one rule | Only one. Then end the reel.`,
      sceneDuration: 2.5, bpm: 112, music: true,
    },
  },
  {
    id: 'chai', label: 'Chai Startup (हिंदी)',
    project: {
      title: 'चाय से शुरुआत', handle: '@meri.chai', style: 'neon', accent: '#22E6C8', size: 'reel-hd',
      script: `एक कप चाय | और एक बड़ा सपना\nपहला स्टॉल | बस दो बर्तन और एक साइनबोर्ड\nहर शाम | भीड़ सिर्फ चाय के लिए नहीं आती\nआज | तीसरी दुकान खुल रही है\nस्वाद नहीं | भरोसा बेचते हैं`,
      sceneDuration: 2.6, bpm: 104, music: true,
    },
  },
  {
    id: 'launch', label: 'Product Launch',
    project: {
      title: 'ROOM TO THINK', handle: '@north.studio', style: 'keynote', accent: '#7C6BFF', size: 'reel-hd',
      script: `Meet the new workspace | One place for everything\n3× faster | From idea to first draft\nNoise, removed | Focus mode learns your rhythm\nBuilt for teams | Share a link, keep the context\nAvailable today | north.studio/room`,
      sceneDuration: 2.4, bpm: 118, music: true,
    },
  },
  {
    id: 'hooks', label: 'Caption Hooks',
    project: {
      title: 'STOP SCROLLING', handle: '@reel.lab', style: 'caption', accent: '#FF3B30', size: 'reel-hd',
      script: `Nobody watches | slow intros\nSay the result | before the reason\nCut every | filler word\nOne line | one frame\nFollow | for the next one`,
      sceneDuration: 2.2, bpm: 124, music: true,
    },
  },
  {
    id: 'blueprint', label: 'Blueprint Habit',
    project: {
      title: 'THE 20 MINUTE HABIT', handle: '@slow.build', style: 'blueprint', accent: '#67D9FF', size: 'reel-hd',
      script: `Plan the day | 20 minutes, one page\nMark the edges | What must not move\nDraw the first line | Start before you feel ready\nMeasure once | Review at the same time daily\nRevision B | Keep what worked`,
      sceneDuration: 2.7, bpm: 96, music: true,
    },
  },
  {
    id: 'riso', label: 'Sunday Print',
    project: {
      title: 'SUNDAY, SLOWLY', handle: '@paper.sundays', style: 'riso', accent: '#FF4E7A', size: 'feed',
      script: `Wake up late | No alarm, no plan\nCoffee first | Two sugars, one good cup\nWalk somewhere | Anywhere without a screen\nPrint something | Ink on paper lasts longer\nDo it again | Next Sunday`,
      sceneDuration: 2.8, bpm: 92, music: true,
    },
  },
  {
    id: 'karna', label: 'कर्ण का श्राप · Cartoon (58s)',
    project: {
      title: 'कर्ण का छिपा श्राप', handle: '@mahabharata.reels',
      style: 'cartoon', accent: '#FF6B2C', size: 'reel-hd',
      intro: 0, outro: 0, sceneDurations: [7, 13, 15, 13, 10], bpm: 84, music: true,
      script: `अर्जुन के बाणों ने नहीं...\\nएक बच्ची के आँसुओं ने मारा था! | महाभारत · कर्ण पर्व | wheel\nज़मीन में मिल गया सारा घी... | युद्ध से कई साल पहले | ghee\nमिट्टी निचोड़ कर निकाल दिया घी! | आँसू पोंछने के लिए | squeeze\n"मैं तुम्हारे रथ का पहिया निगल जाऊँगी!" | धरती माँ का श्राप | curse\nनेकी की कीमत... जान! | कुरुक्षेत्र · 17वाँ दिन | arrow`,
    },
  },
];

const clean = (v, max = 160) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
// A heading may contain a hard line break written as the two characters \n.
const cleanHeading = (v, max = 120) => String(v ?? '')
  .replace(/\\n/g, '\n')
  .split('\n')
  .map(l => l.replace(/\s+/g, ' ').trim())
  .join('\n')
  .slice(0, max);
const validHex = (v, fallback) => /^#?[0-9a-fA-F]{6}$/.test(String(v || '')) ? (String(v).startsWith('#') ? String(v) : '#' + String(v)) : fallback;

// Heading | Detail | visualCue  (visualCue is optional, used by epic styles)
export function parseScript(script) {
  return String(script || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line, i) => {
      const [a, b, c] = line.split('|');
      return {
        heading: cleanHeading(a, 120) || `Shot ${i + 1}`,
        detail: clean(b, 140),
        visual: clean(c, 40) || undefined,
      };
    });
}

export function normalizeProject(raw = {}) {
  const style = STYLES.find(s => s.id === raw.style) ? raw.style : 'swiss';
  const size = SIZES[raw.size] ? raw.size : 'reel-hd';
  const accent = validHex(raw.accent, STYLES.find(s => s.id === style).accent);

  let scenes;
  if (Array.isArray(raw.scenes)) {
    scenes = raw.scenes.slice(0, 8).map((s, i) => ({
      heading: cleanHeading(s.heading, 120) || `Shot ${i + 1}`,
      detail: clean(s.detail, 140),
      visual: clean(s.visual, 40) || undefined,
      voice: s.voice == null ? undefined : String(s.voice).slice(0, 1200),
    }));
  } else scenes = parseScript(raw.script);
  if (!scenes.length) scenes = parseScript(PRESETS[0].project.script).slice(0, 4);

  const sceneDuration = clamp(Number(raw.sceneDuration) || 2.5, 1.8, 4.0);
  const intro = clamp(Number(raw.intro ?? INTRO), 0, 6);
  const outro = clamp(Number(raw.outro ?? OUTRO), 0, 6);
  const rawDurations = Array.isArray(raw.sceneDurations) ? raw.sceneDurations : null;
  const sceneDurations = scenes.map((_, i) => clamp(Number(rawDurations?.[i]) || sceneDuration, 1.5, 20));
  const duration = intro + sceneDurations.reduce((a, b) => a + b, 0) + outro;
  const bpm = clamp(Math.round(Number(raw.bpm) || 110), 80, 150);
  const dims = SIZES[size];

  return {
    title: clean(raw.title, 70) || 'MY REEL',
    handle: clean(raw.handle, 40) || '@yourhandle',
    style, accent, size, scenes, sceneDuration, sceneDurations, intro, outro, bpm,
    script: raw.script == null ? scenes.map(s => s.heading.replace(/\n/g, '\\n') + (s.detail ? ' | ' + s.detail : '') + (s.visual ? ' | ' + s.visual : '')).join('\n') : String(raw.script),
    duration: Math.round(duration * 1000) / 1000,
    fps: FPS, w: dims.w, h: dims.h,
    music: raw.music !== false,
    safeZones: !!raw.safeZones,
    lang: raw.lang || (/[\u0900-\u097F]/.test(String(raw.title || '') + String(raw.script || '')) ? 'hi' : 'en'),
    quality: raw.quality === 'draft' ? 'draft' : 'final',
    audio: raw.audio && typeof raw.audio === 'object' ? raw.audio : null,
  };
}

// Where are we in the film? Zero-length intro/outro windows are simply skipped.
export function timeline(P) {
  const windows = [];
  let t = 0, n = 0;
  const add = (kind, index, scene, duration) => {
    if (duration <= 0.001) return;
    n += 1;
    windows.push({ kind, index, scene, start: t, end: t + duration, duration, number: n });
    t += duration;
  };
  add('intro', -1, null, P.intro);
  P.scenes.forEach((scene, i) => add('scene', i, scene, P.sceneDurations[i] ?? P.sceneDuration));
  add('outro', -1, null, P.outro);
  return windows;
}

export function atTime(P, t) {
  const wins = timeline(P);
  const win = wins.find(w => t >= w.start && t < w.end) || wins[wins.length - 1];
  const local = clamp((t - win.start) / win.duration);
  return {
    ...win,
    t, local,
    enter: Math.min(1, Math.max(0, (t - win.start) / 0.46)),
    exit: Math.min(1, Math.max(0, (win.end - t) / 0.34)),
    beat: t * P.bpm / 60,
    shotNumber: win.number,
    totalShots: wins.length,
  };
}

export function slug(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'reel';
}

export function projectFromPreset(id) {
  const p = PRESETS.find(x => x.id === id);
  return normalizeProject(p ? p.project : PRESETS[0].project);
}

export function accentRGB(hex) { return hex2rgb(hex); }
