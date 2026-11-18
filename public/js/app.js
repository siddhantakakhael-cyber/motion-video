import {
  STYLES, SIZES, PRESETS, normalizeProject, projectFromPreset, timeline, slug,
} from '/src/project.js';
import { drawFrame } from '/src/renderer.js';
import { scorePCM, pcmToWav } from '/src/score.js';
import { complement } from '/src/lib.js';

const $ = id => document.getElementById(id);
const SWATCHES = ['#E30613', '#FF5A00', '#22E6C8', '#7C6BFF', '#FF4E7A', '#FFC42E', '#67D9FF', '#39D6A5'];
const STYLE_BG = { swiss: '#F1EFE9', neon: '#05070E', keynote: '#08090D', blueprint: '#0A2942', riso: '#F5EBDB', caption: '#0A0A0A', mythic: '#1C0807', cartoon: '#9BE8FF' };
const PREVIEW_SCALE = 0.5;

let P = projectFromPreset('design');
let currentPreset = 'design';
let t = 0;
let playing = false;
let raf = null;
let lastNow = 0;
let canvasW = 0, canvasH = 0;
let jobId = null;
let pollTimer = null;

// ------------------------------------------------------------------ audio ---
let audioCtx = null, audioBuffer = null, audioSource = null, pendingWav = null;
function queueAudio() {
  if (!P.music) { pendingWav = null; audioBuffer = null; return; }
  pendingWav = pcmToWav(scorePCM(P));
  audioBuffer = null; // decode again on next play
}
async function ensureAudio() {
  if (!P.music || !pendingWav) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!audioBuffer) {
    const ab = pendingWav.buffer.slice(pendingWav.byteOffset, pendingWav.byteOffset + pendingWav.byteLength);
    audioBuffer = await audioCtx.decodeAudioData(ab);
  }
}
function stopAudio() {
  if (!audioSource) return;
  try { audioSource.stop(); } catch {}
  try { audioSource.disconnect(); } catch {}
  audioSource = null;
}
async function startAudio(offset) {
  stopAudio();
  if (!P.music) return;
  try {
    await ensureAudio();
    if (!playing || !audioBuffer) return;
    const src = audioCtx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(audioCtx.destination);
    src.start(0, Math.min(offset, P.duration - 0.02));
    audioSource = src;
  } catch (e) { console.warn('audio preview unavailable', e); }
}

// ------------------------------------------------------------- static UI ---
function buildStaticUI() {
  $('presetRow').innerHTML = PRESETS.map(p => `<button class="chip" data-preset="${p.id}">${p.label}</button>`).join('');
  $('styleGrid').innerHTML = STYLES.map(s => {
    const bg = STYLE_BG[s.id];
    const sw = `linear-gradient(115deg, ${bg} 0%, ${bg} 34%, ${s.accent} 34%, ${s.accent} 70%, ${complement(s.accent)} 70%)`;
    return `<button class="style-card" data-style="${s.id}" title="${s.blurb}">
      <span class="swatch" style="background:${sw}"></span>
      <b>${s.name}</b><small>${s.family}</small></button>`;
  }).join('');
  $('swatchRow').innerHTML = SWATCHES.map(c => `<button class="swatch-btn" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  $('sizeRow').innerHTML = Object.entries(SIZES).map(([id, s]) => `<button data-size="${id}">${s.label}</button>`).join('');
}

function timingsValue(p) {
  const uniform = p.sceneDurations.every(d => Math.abs(d - p.sceneDuration) < 0.001) && p.intro > 0 && p.outro > 0;
  return uniform ? '' : p.sceneDurations.map(d => Number(d.toFixed(2))).join(', ');
}

function syncInputs() {
  $('titleInput').value = P.title;
  $('handleInput').value = P.handle;
  $('scriptInput').value = P.script;
  $('accentInput').value = P.accent;
  $('durationRange').value = P.sceneDuration;
  $('bpmRange').value = P.bpm;
  $('timingsInput').value = timingsValue(P);
  $('musicToggle').checked = P.music;
  markActive();
}

function markActive() {
  document.querySelectorAll('[data-preset]').forEach(el => el.classList.toggle('active', el.dataset.preset === currentPreset));
  document.querySelectorAll('[data-style]').forEach(el => el.classList.toggle('active', el.dataset.style === P.style));
  document.querySelectorAll('[data-color]').forEach(el => el.classList.toggle('active', el.dataset.color.toLowerCase() === P.accent.toLowerCase()));
  document.querySelectorAll('[data-size]').forEach(el => el.classList.toggle('active', el.dataset.size === P.size));
}

function refreshDerived() {
  $('scriptHint').textContent = `${P.scenes.length} shot${P.scenes.length === 1 ? '' : 's'} · ${P.duration.toFixed(1)}s · ${Math.round(P.duration * P.fps)} frames`;
  $('durationOut').textContent = `${P.sceneDuration.toFixed(1)}s`;
  $('bpmOut').textContent = `${P.bpm} BPM`;
  $('formatLabel').textContent = `${P.w} × ${P.h}`;
  $('accentInput').value = P.accent;
  $('durationRange').value = P.sceneDuration;
  $('bpmRange').value = P.bpm;
  if (document.activeElement !== $('timingsInput')) $('timingsInput').value = timingsValue(P);
  $('musicToggle').checked = P.music;
  $('safeOverlay').hidden = !P.safeZones;
  $('safeBtn').textContent = P.safeZones ? '▦ Safe zones · on' : '▦ Safe zones';
  document.body.classList.toggle('deva', P.lang === 'hi');

  const wins = timeline(P);
  $('shotStrip').innerHTML = wins.map(w => {
    const name = w.kind === 'intro' ? 'INTRO' : w.kind === 'outro' ? 'OUTRO / CTA' : `${String(w.index + 1).padStart(2, '0')} ${w.scene.heading}`;
    return `<button class="shot-chip" data-seek="${w.start}" style="flex:${w.duration}"><span>${w.duration.toFixed(1)}s</span> ${name}</button>`;
  }).join('');

  const rows = wins.map(w => {
    const num = String(w.number).padStart(2, '0'), dur = `${w.duration.toFixed(1)}s`;
    if (w.kind === 'intro') return { num, title: 'Opening title', detail: P.title, dur };
    if (w.kind === 'outro') return { num, title: 'End card / CTA', detail: P.handle, dur };
    return { num, title: w.scene.heading, detail: w.scene.detail, dur };
  });
  $('shotList').innerHTML = rows.map(r => `<div class="shot-card"><span class="num">${r.num}</span><div><b>${escapeHTML(r.title)}</b><small>${escapeHTML(r.detail)}</small></div><span class="dur">${r.dur}</span></div>`).join('');

  const spec = [
    ['Canvas', SIZES[P.size].note], ['Duration', `${P.duration.toFixed(1)} s`],
    ['Shots', `${wins.length}`], ['Frame rate', `${P.fps} fps`],
    ['Video', 'H.264 · yuv420p'], ['Audio', P.music ? 'AAC · synth score' : 'AAC · silent'],
    ['Container', 'MP4 · faststart'], ['Frames', `${Math.round(P.duration * P.fps)}`],
  ];
  $('specList').innerHTML = spec.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  markActive();
  updateTransport();
}

function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// --------------------------------------------------------------- preview ---
function resizeCanvas() {
  const W = Math.round(P.w * PREVIEW_SCALE), H = Math.round(P.h * PREVIEW_SCALE);
  if (W === canvasW && H === canvasH) return;
  canvasW = W; canvasH = H;
  const c = $('preview'); c.width = W; c.height = H;
}
function renderPreview() {
  resizeCanvas();
  const g = $('preview').getContext('2d');
  drawFrame(g, canvasW, canvasH, Math.min(t, P.duration - 1 / P.fps), P);
}
function updateTransport() {
  $('timeLabel').textContent = `${t.toFixed(1)} / ${P.duration.toFixed(1)}s`;
  $('scrub').value = String(Math.round(clamp01(t / P.duration) * 1000));
  const wins = timeline(P);
  document.querySelectorAll('[data-seek]').forEach((el, i) => el.classList.toggle('current', t >= wins[i].start && t < wins[i].end));
}
const clamp01 = x => Math.max(0, Math.min(1, x));

function tick(now) {
  if (!playing) return;
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;
  t += dt;
  if (t >= P.duration) { t = 0; startAudio(0); }
  renderPreview(); updateTransport();
  raf = requestAnimationFrame(tick);
}
function play() {
  if (playing) return;
  playing = true; lastNow = performance.now();
  $('playBtn').textContent = '❚❚';
  startAudio(t);
  raf = requestAnimationFrame(tick);
}
function pause() {
  playing = false;
  if (raf) cancelAnimationFrame(raf);
  stopAudio();
  $('playBtn').textContent = '▶';
}
function seek(nt) {
  t = Math.max(0, Math.min(P.duration - 1 / P.fps, nt));
  renderPreview(); updateTransport();
  if (playing) { lastNow = performance.now(); startAudio(t); }
}

function updateProject(patch, opts = {}) {
  const raw = { ...P, ...patch };
  if (patch.script !== undefined) raw.scenes = undefined; // parse the edited text
  P = normalizeProject(raw);
  if (opts.preset) currentPreset = opts.preset;
  else if (opts.keepPreset !== true) currentPreset = null;
  if (opts.sync) syncInputs();
  queueAudio();
  refreshDerived();
  if (t > P.duration) t = 0;
  renderPreview();
}

// ---------------------------------------------------------------- export ---
function setExport(state, progress = 0, message = '') {
  const wrap = $('progressWrap'), result = $('exportResult'), btn = $('exportBtn');
  if (state === 'working') {
    wrap.hidden = false; result.hidden = true; btn.disabled = true;
    $('progressBar').style.width = `${Math.round(progress * 100)}%`;
    $('progressText').textContent = message;
    $('footerStatus').textContent = `rendering ${Math.round(progress * 100)}%`;
  } else if (state === 'done') {
    wrap.hidden = true; btn.disabled = false;
    $('footerStatus').textContent = 'mp4 ready';
  } else {
    wrap.hidden = false; btn.disabled = false;
    $('progressText').textContent = message;
    $('footerStatus').textContent = 'export failed';
  }
}

async function exportMP4() {
  if (jobId) { /* allow a new render; old jobs stay on the server */ }
  setExport('working', 0.02, 'Queued on the render engine…');
  try {
    const res = await fetch('/api/export', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(P),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    jobId = j.id;
    if (pollTimer) clearTimeout(pollTimer);
    poll();
  } catch (e) { setExport('error', 0, `Could not start: ${e.message}`); }
}

function poll() {
  if (!jobId) return;
  fetch(`/api/export/${jobId}`).then(r => r.json()).then(j => {
    if (j.status === 'done') {
      setExport('done', 1);
      const url = j.downloadUrl;
      $('exportVideo').src = url;
      $('downloadLink').href = url;
      $('downloadLink').setAttribute('download', j.filename || 'reel.mp4');
      $('exportResult').hidden = false;
      $('progressWrap').hidden = true;
      $('footerStatus').textContent = 'mp4 ready';
    } else if (j.status === 'error') {
      setExport('error', j.progress || 0, j.error || 'Render failed');
    } else {
      setExport('working', j.progress || 0, j.message || 'Rendering…');
      pollTimer = setTimeout(poll, 280);
    }
  }).catch(e => { setExport('error', 0, `Status error: ${e.message}`); });
}

async function downloadStill() {
  $('stillBtn').disabled = true;
  try {
    const res = await fetch('/api/still', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project: P, t }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${slug(P.title)}-cover.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    $('footerStatus').textContent = 'cover frame saved';
  } catch (e) { $('footerStatus').textContent = `cover failed: ${e.message}`; }
  finally { $('stillBtn').disabled = false; }
}

// --------------------------------------------------------------- listeners ---
function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }

function bindEvents() {
  $('presetRow').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    pause(); t = 0;
    P = projectFromPreset(b.dataset.preset);
    currentPreset = b.dataset.preset;
    syncInputs(); queueAudio(); refreshDerived(); renderPreview();
    $('footerStatus').textContent = `preset: ${b.dataset.preset}`;
  });

  $('styleGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-style]'); if (!b) return;
    const s = STYLES.find(x => x.id === b.dataset.style);
    updateProject({ style: s.id, accent: s.accent });
  });

  $('swatchRow').addEventListener('click', e => {
    const b = e.target.closest('[data-color]'); if (!b) return;
    updateProject({ accent: b.dataset.color });
  });
  // Capture the value at event time (some DOM implementations recycle events).
  const onInput = (el, ms, fn) => {
    const d = debounce(fn, ms);
    el.addEventListener('input', e => d(e.target.value, e.target.checked));
  };
  onInput($('accentInput'), 100, v => updateProject({ accent: v }));

  $('sizeRow').addEventListener('click', e => {
    const b = e.target.closest('[data-size]'); if (!b) return;
    updateProject({ size: b.dataset.size });
  });

  onInput($('titleInput'), 140, v => updateProject({ title: v }));
  onInput($('handleInput'), 140, v => updateProject({ handle: v }));
  onInput($('scriptInput'), 220, v => updateProject({ script: v }));
  onInput($('durationRange'), 90, v => updateProject({ sceneDuration: Number(v), sceneDurations: undefined }));
  onInput($('bpmRange'), 120, v => updateProject({ bpm: Number(v) }));
  onInput($('timingsInput'), 200, v => {
    const arr = v.split(',').map(x => Number(x.trim())).filter(x => Number.isFinite(x) && x > 0);
    updateProject({ sceneDurations: arr.length ? arr : undefined });
  });
  $('musicToggle').addEventListener('change', e => { const v = e.target.checked; updateProject({ music: v }); if (!v) stopAudio(); });

  $('playBtn').addEventListener('click', () => playing ? pause() : play());
  $('restartBtn').addEventListener('click', () => { t = 0; renderPreview(); updateTransport(); if (playing) { lastNow = performance.now(); startAudio(0); } });
  $('scrub').addEventListener('input', e => seek(Number(e.target.value) / 1000 * P.duration));
  $('shotStrip').addEventListener('click', e => { const b = e.target.closest('[data-seek]'); if (b) seek(Number(b.dataset.seek) + 0.01); });

  $('safeBtn').addEventListener('click', () => updateProject({ safeZones: !P.safeZones }, { sync: false }));
  $('shuffleBtn').addEventListener('click', () => {
    const s = STYLES[Math.floor(Math.random() * STYLES.length)];
    const c = SWATCHES[Math.floor(Math.random() * SWATCHES.length)];
    updateProject({ style: s.id, accent: c, bpm: 96 + Math.floor(Math.random() * 36) });
    $('footerStatus').textContent = `shuffled → ${s.name}`;
  });

  $('exportBtn').addEventListener('click', exportMP4);
  $('stillBtn').addEventListener('click', downloadStill);
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)) { e.preventDefault(); playing ? pause() : play(); }
  });
}

// ------------------------------------------------------------------- init ---
async function init() {
  buildStaticUI();
  syncInputs();
  queueAudio();
  refreshDerived();
  renderPreview();
  bindEvents();
  try {
    await Promise.all([
      document.fonts.load('400 40px Inter'), document.fonts.load('700 40px Inter'),
      document.fonts.load('900 40px Inter'), document.fonts.load('700 40px "Noto Devanagari"'),
      document.fonts.load('400 20px "DejaVu Sans Mono"'),
    ]);
    await document.fonts.ready;
    renderPreview();
  } catch {}
  try {
    const r = await fetch('/api/health'); const j = await r.json();
    $('enginePill').innerHTML = `<span class="dot"></span> engine ready · ffmpeg ${j.ffmpeg || 'ok'}`;
    $('footerStatus').textContent = `styles ${j.styles} · presets ${j.presets}`;
  } catch {
    $('enginePill').innerHTML = '<span class="dot" style="background:#ff5a5a"></span> engine offline';
  }
}

init();
