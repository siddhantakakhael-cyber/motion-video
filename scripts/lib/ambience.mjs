import { RATE } from "./wav.mjs";

/**
 * Natural ambience bed for a reel: night wind, distant battlefield rumble,
 * crickets, a temple bell, a conch swell and three arrow whooshes.
 *
 * Everything is synthesised — no samples are downloaded — and every element is
 * placed on the scene grid so the sound world matches what is on screen:
 *   - wind and air run the whole reel, breathing on slow LFOs
 *   - rumble sits under the battlefield beats
 *   - a whoosh + string twang lands on each locked arrow
 *   - the bell rings on the hook and on the last frame
 *   - the conch blooms on the sacrifice flash and on the reveal
 * The bed is ducked by the narration envelope so the voice always wins.
 */

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chamberlin state-variable filter — cutoff can move every sample. */
function svf(rate) {
  let low = 0;
  let band = 0;
  return (x, fc, q = 0.8) => {
    const damp = Math.max(0.1, 1 / q);
    // the Chamberlin form goes unstable once f + damp reaches 2, so the cutoff
    // is clamped against the damping — the old code pushed it past that point
    const raw = 2 * Math.sin((Math.PI * Math.min(fc, rate * 0.45)) / rate);
    const f = Math.min(raw, 2 - damp - 0.03);
    const high = x - low - damp * band;
    band = f * high + band;
    low = f * band + low;
    if (!Number.isFinite(low) || !Number.isFinite(band)) {
      low = 0;
      band = 0;
    }
    band = Math.max(-8, Math.min(8, band));
    low = Math.max(-8, Math.min(8, low));
    return { low, band, high };
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, t) => {
  const k = clamp01((t - a) / (b - a));
  return k * k * (3 - 2 * k);
};

export function buildAmbience({ duration, rate = RATE, scenes = [], voice = null, level = 0.16 }) {
  const total = Math.round(duration * rate);
  const out = new Float32Array(total);
  const rng = mulberry32(0x5eed1a);
  const idx = (t) => Math.round(t * rate);

  const write = (start, dur, gain, fn) => {
    const s = idx(start);
    const n = Math.round(dur * rate);
    for (let i = 0; i < n; i++) {
      const j = s + i;
      if (j < 0 || j >= total) continue;
      out[j] += fn(i / rate, i) * gain;
    }
  };

  /* ---- 1. night wind: brown noise, slow breathing, whole reel ---- */
  {
    const lp = svf(rate);
    let brown = 0;
    const sceneGain = (t) => {
      let g = 0.55;
      for (const sc of scenes) {
        if (t >= sc.start && t < sc.start + sc.duration) g = sc.ambience ?? 0.55;
      }
      return g;
    };
    let cur = 0.55;
    for (let i = 0; i < total; i++) {
      const t = i / rate;
      brown = (brown + (rng() * 2 - 1) * 0.02) * 0.996;
      const { low } = lp(brown * 3.2, 340 + 90 * Math.sin(TAU * 0.043 * t), 0.7);
      const breath =
        0.62 +
        0.24 * Math.sin(TAU * 0.061 * t - 1.2) +
        0.14 * Math.sin(TAU * 0.117 * t + 0.4);
      const target = sceneGain(t);
      cur += (target - cur) * 0.0006;
      out[i] += low * Math.max(0.22, breath) * cur;
    }
  }

  /* ---- 2. air shimmer: high noise, barely there ---- */
  {
    const hp = svf(rate);
    for (let i = 0; i < total; i++) {
      const t = i / rate;
      const w = rng() * 2 - 1;
      const { high } = hp(w, 4200, 0.7);
      const mod = 0.6 + 0.4 * Math.sin(TAU * 0.019 * t);
      out[i] += high * 0.09 * mod;
    }
  }

  /* ---- 3. distant battlefield rumble ---- */
  const rumble = (at, dur = 3.4, gain = 0.5, fc = 90) => {
    const bp = svf(rate);
    write(at, dur, gain, (t) => {
      const w = rng() * 2 - 1;
      const { low } = bp(w, fc + 26 * Math.sin(TAU * 0.7 * t), 1.6);
      const env = Math.sin(Math.PI * clamp01(t / dur)) ** 1.6;
      return low * env * 6;
    });
  };
  rumble(6.4, 2.6, 0.5, 74);
  rumble(9.1, 2.2, 0.34, 96);
  rumble(14.6, 2.8, 0.3, 84);
  rumble(19.4, 1.6, 0.55, 68);
  rumble(33.4, 2.4, 0.24, 80);
  rumble(45.2, 1.8, 0.3, 72);

  /* ---- 4. arrow: one whoosh + string twang per locked arrow ---- */
  const arrow = (at) => {
    const bp = svf(rate);
    write(at - 0.22, 0.62, 0.32, (t) => {
      const k = clamp01(t / 0.62);
      const fc = 5200 * Math.pow(0.16, k) + 420;
      const { band } = bp(rng() * 2 - 1, fc, 2.6);
      const env = Math.pow(k, 1.6) * Math.exp(-Math.max(0, k - 0.6) * 5.5);
      return band * env * 2.2;
    });
    write(at, 0.34, 0.24, (t) => {
      const env = Math.exp(-t * 22);
      const body =
        Math.sin(TAU * 186 * t) * 0.7 + Math.sin(TAU * 297 * t) * 0.4 + Math.sin(TAU * 455 * t) * 0.2;
      return body * env;
    });
  };
  arrow(7.7);
  arrow(9.4);
  arrow(11.2);

  /* ---- 5. temple bell: inharmonic partials, long decay ---- */
  const bell = (at, gain = 0.5, f0 = 523) => {
    const partials = [
      { m: 1, a: 0.6, d: 1.5 },
      { m: 2.02, a: 0.4, d: 2.1 },
      { m: 2.98, a: 0.24, d: 2.6 },
      { m: 4.11, a: 0.14, d: 3.3 },
      { m: 5.42, a: 0.08, d: 4.1 },
      { m: 7.1, a: 0.05, d: 5.0 },
    ];
    write(at, 5.2, gain, (t) => {
      let v = 0;
      for (const p of partials) v += p.a * Math.sin(TAU * f0 * p.m * t) * Math.exp(-t / p.d);
      return v * 0.5;
    });
  };
  bell(0.18, 0.52, 392);
  bell(54.1, 0.38, 392);

  /* ---- 6. conch: slow harmonic swell, slightly detuned ---- */
  const conch = (at, dur = 2.4, gain = 0.4, f0 = 174.6) => {
    const harm = [
      { m: 1, a: 0.55 },
      { m: 2, a: 0.3 },
      { m: 3, a: 0.22 },
      { m: 4, a: 0.12 },
      { m: 5, a: 0.08 },
      { m: 6, a: 0.05 },
    ];
    write(at, dur, gain, (t) => {
      const env = smooth(0, dur * 0.55, t) * (1 - smooth(dur * 0.62, dur, t));
      const vib = 1 + 0.004 * Math.sin(TAU * 5.1 * t);
      let v = 0;
      for (const h of harm) {
        v += h.a * Math.sin(TAU * f0 * h.m * vib * t + Math.sin(TAU * 3.3 * t) * 0.4);
      }
      return v * env * 0.6;
    });
  };
  conch(20.4, 3.2, 0.42, 146.8);
  conch(27.3, 3.6, 0.58, 174.6);
  conch(46.3, 4.4, 0.55, 174.6);

  /* ---- 7. crickets: trilled chirps, one voice each side of the night ---- */
  {
    const cricket = (at, f, dur, gain) => {
      write(at, dur, gain, (t) => {
        const trill = 0.5 + 0.5 * Math.sin(TAU * 42 * t);
        const env = Math.sin(Math.PI * clamp01(t / dur)) ** 2;
        const s = Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 1.51 * t);
        return s * trill * env;
      });
    };
    const nightIn = 25.5;
    const nightOut = 50.5;
    let t = nightIn;
    let flip = 0;
    while (t < nightOut) {
      const f = flip % 2 === 0 ? 4300 : 3860;
      const dur = 0.16 + rng() * 0.12;
      const fade = smooth(nightIn, nightIn + 4, t) * (1 - smooth(nightOut - 4, nightOut, t));
      cricket(t, f, dur, 0.1 * fade);
      if (rng() > 0.35) cricket(t + dur + 0.06, f, dur * 0.8, 0.07 * fade);
      t += 0.42 + rng() * 0.75;
      flip++;
    }
  }

  /* ---- 8. duck under the narration ---- */
  if (voice) {
    const win = Math.max(1, Math.round(rate * 0.045));
    let env = 0;
    const envTrack = new Float32Array(total);
    for (let i = 0; i < total; i += win) {
      let sum = 0;
      const end = Math.min(total, i + win);
      for (let j = i; j < end; j++) sum += voice[j] * voice[j];
      const rms = Math.sqrt(sum / Math.max(1, end - i));
      const target = clamp01(rms / 0.09);
      env += (target - env) * 0.35;
      for (let j = i; j < end; j++) envTrack[j] = env;
    }
    for (let i = 0; i < total; i++) out[i] *= 1 - 0.45 * envTrack[i];
  }

  /* ---- 9. level the bed by RMS, soft-limit the transients, apply mix level ---- */
  let sum = 0;
  for (let i = 0; i < total; i++) sum += out[i] * out[i];
  const rms = Math.sqrt(sum / total);
  const k = rms > 1e-9 ? 0.075 / rms : 0;
  const knee = 0.62;
  for (let i = 0; i < total; i++) {
    let v = out[i] * k;
    const a = Math.abs(v);
    if (a > knee) v = Math.sign(v) * knee * Math.tanh(a / knee);
    out[i] = v * level;
  }
  const head = Math.round(0.25 * rate);
  const tailN = Math.round(0.9 * rate);
  for (let i = 0; i < head; i++) out[i] *= i / head;
  for (let i = 0; i < tailN; i++) out[total - 1 - i] *= i / tailN;

  return out;
}
