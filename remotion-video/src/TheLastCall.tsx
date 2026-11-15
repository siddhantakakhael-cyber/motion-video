import React, {useEffect, useState} from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";

// ── palette (per script) ──
const BG = "#0A0A0A";
const TEXT = "#FFFFFF";
const RED = "#E50914";
const DIM = "#9A9A9A";

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const SNAP = Easing.bezier(0.19, 1, 0.22, 1);
const an = (frame: number, range: number[], out: number[], easing = EASE) =>
  interpolate(frame, range, out, {easing, extrapolateLeft: "clamp", extrapolateRight: "clamp"});
const jitter = (frame: number, seed: string, amp: number) => (random(`${seed}-${frame}`) - 0.5) * 2 * amp;

// ── timeline (frames @30fps) ──
export const SCENE_DURS = [320, 405, 319, 509, 172];
export const sceneStarts = SCENE_DURS.map((_, i) => SCENE_DURS.slice(0, i).reduce((a, b) => a + b, 0));
export const totalFrames = SCENE_DURS.reduce((a, b) => a + b, 0); // 1725 = 57.5s

type Chunk = {w: number; tokens: {t: string; acc?: boolean}[]};

const VO: {src: string; durF: number}[] = [
  {src: "thelastcall/n1-hook.mp3", durF: 270},
  {src: "thelastcall/n2-setup.mp3", durF: 369},
  {src: "thelastcall/m1-hide.mp3", durF: 208},
  {src: "thelastcall/n3-walk.mp3", durF: 213},
  {src: "thelastcall/n4-empty.mp3", durF: 246},
  {src: "thelastcall/m2-final-deep.mp3", durF: 87},
];

// ── shared pieces ──
const Grain: React.FC = () => (
  <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute", opacity: 0.07}}>
    <filter id="grainH">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={720} height={1280} filter="url(#grainH)" />
  </svg>
);

const Vignette: React.FC<{strong?: boolean}> = ({strong}) => (
  <AbsoluteFill
    style={{
      background: strong
        ? "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 82%, rgba(0,0,0,0.85) 100%)"
        : "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 90%, rgba(0,0,0,0.75) 100%)",
    }}
  />
);

// horizontal glitch bars, deterministic per frame
const GlitchSlices: React.FC<{active: boolean; intensity?: number}> = ({active, intensity = 1}) => {
  const frame = useCurrentFrame();
  if (!active) return null;
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      {Array.from({length: 6}).map((_, i) => {
        const y = random(`gy${frame}-${i}`) * 1280;
        const h = 5 + random(`gh${frame}-${i}`) * 24 * intensity;
        const w = random(`gw${frame}-${i}`) * 720;
        const x = random(`gx${frame}-${i}`) * (720 - w);
        const c = [RED, "#2A2A2E", "#FFFFFF", RED][i % 4];
        return <div key={i} style={{position: "absolute", left: x, top: y, width: w, height: h, background: c, opacity: 0.4 + random(`go${frame}-${i}`) * 0.35}} />;
      })}
    </AbsoluteFill>
  );
};

const Captions: React.FC<{chunks: Chunk[]; voStart: number; voDurF: number; accent?: string}> = ({
  chunks,
  voStart,
  voDurF,
  accent = RED,
}) => {
  const frame = useCurrentFrame();
  const usable = Math.max(60, voDurF - 12);
  const totalW = chunks.reduce((a, c) => a + c.w, 0);
  const lens = chunks.map((c) => Math.max(18, Math.round((usable * c.w) / totalW)));
  const starts: number[] = [];
  let acc = voStart;
  for (const l of lens) {
    starts.push(acc);
    acc += l;
  }
  let idx = 0;
  for (let i = 0; i < chunks.length; i++) if (frame >= starts[i]) idx = i;
  const local = frame - starts[idx];
  const pop = an(local, [0, 6], [0, 1], SNAP);
  const shake = idx === chunks.length - 1 ? jitter(frame, "capsh", 0.8) : 0;
  return (
    <div style={{position: "absolute", left: 40, right: 40, bottom: 150, display: "flex", justifyContent: "center"}}>
      <div
        style={{
          maxWidth: 620,
          background: "rgba(14,14,16,0.82)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16,
          padding: "15px 24px",
          textAlign: "center",
          fontFamily: "OdishaSans",
          fontWeight: 800,
          fontSize: 29,
          lineHeight: 1.4,
          color: TEXT,
          opacity: pop,
          transform: `translateY(${(1 - pop) * 16}px) translateX(${shake}px)`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        }}
      >
        {chunks[idx].tokens.map((tk, i) => (
          <span key={i} style={{color: tk.acc ? accent : TEXT}}>
            {tk.t}
          </span>
        ))}
      </div>
    </div>
  );
};

const HeartWave: React.FC<{bpm?: number; y?: number; opacity?: number}> = ({bpm = 72, y = 1120, opacity = 0.75}) => {
  const frame = useCurrentFrame();
  const period = (60 / bpm) * 30; // frames per beat
  const phase = ((frame % period) / period) * 720;
  const pts: string[] = [];
  for (let x = 0; x <= 720; x += 6) {
    const d = (x + phase) % 720;
    const beatPos = d / 720;
    let dy = 0;
    // ECG-like spike: small bump, tall spike, dip
    if (beatPos > 0.08 && beatPos < 0.13) dy = -14;
    if (beatPos > 0.15 && beatPos < 0.18) dy = -52;
    if (beatPos > 0.18 && beatPos < 0.21) dy = 20;
    if (beatPos > 0.3 && beatPos < 0.4) dy = -8;
    pts.push(`${x},${y + dy + jitter(frame, `w${x}`, 1.2)}`);
  }
  return (
    <svg width={720} height={90} viewBox={`0 0 720 90`} style={{position: "absolute", top: y - 45, left: 0, opacity}}>
      <polyline points={pts.map((p) => `${p.split(",")[0]},${parseFloat(p.split(",")[1]) - (y - 45)}`).join(" ")} fill="none" stroke={RED} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
};

const HeartIcon: React.FC<{size?: number; color?: string}> = ({size = 26, color = RED}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{display: "inline-block", verticalAlign: "middle"}}>
    <path d="M16 28 C 10 22 3 17 3 10.5 C 3 6 6.5 3 10.5 3 C 13 3 15 4.4 16 6.4 C 17 4.4 19 3 21.5 3 C 25.5 3 29 6 29 10.5 C 29 17 22 22 16 28 Z" fill={color} />
  </svg>
);

// ── Scene 1: The Hook ──
const PhoneArt: React.FC = () => {
  const frame = useCurrentFrame();
  const ring = frame < 22;
  const pulse = 0.85 + Math.sin(frame / 4) * 0.15;
  const shake = frame < 10 ? jitter(frame, "ph", 3) : jitter(frame, "ph", 0.7);
  return (
    <div style={{position: "absolute", top: 235, left: 190, width: 340, height: 640, transform: `translateX(${shake}px)`}}>
      <div style={{position: "absolute", inset: 0, borderRadius: 44, background: "#050507", border: "3px solid #2A2A30", boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(229,9,20,0.18)"}} />
      <div style={{position: "absolute", top: 18, left: 105, width: 130, height: 9, borderRadius: 5, background: "#1C1C22"}} />
      {/* clock */}
      <div style={{position: "absolute", top: 64, left: 0, right: 0, textAlign: "center"}}>
        <div style={{fontFamily: "OdishaSans", fontWeight: 900, fontSize: 56, color: TEXT, letterSpacing: 3, opacity: an(frame, [2, 12], [0, 1])}}>02:14</div>
        <div style={{fontSize: 17, fontWeight: 700, color: DIM, letterSpacing: 6, marginTop: 2, opacity: an(frame, [4, 14], [0, 1])}}>AM</div>
      </div>
      {/* incoming call */}
      <div style={{position: "absolute", top: 200, left: 0, right: 0, textAlign: "center", opacity: an(frame, [8, 18], [0, 1])}}>
        <div style={{fontSize: 15, fontWeight: 700, letterSpacing: 5, color: RED, opacity: ring ? pulse : 0.9}}>INCOMING CALL</div>
        <div style={{marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 10}}>
          <HeartIcon size={30} />
          <span style={{fontFamily: "OdishaSans", fontWeight: 900, fontSize: 44, color: TEXT}}>Mom</span>
        </div>
        <div style={{marginTop: 10, fontSize: 16, color: DIM, fontWeight: 700}}>घर… अंदर ही से</div>
      </div>
      {/* answer / decline */}
      <div style={{position: "absolute", bottom: 66, left: 0, right: 0, display: "flex", justifyContent: "space-around", alignItems: "center", opacity: an(frame, [10, 20], [0, 1])}}>
        <div style={{width: 84, height: 84, borderRadius: 999, background: "rgba(229,9,20,0.14)", border: "2.5px solid #6E2A2E", display: "flex", alignItems: "center", justifyContent: "center"}}>
          <svg width={30} height={30} viewBox="0 0 30 30"><line x1={7} y1={7} x2={23} y2={23} stroke="#B84A50" strokeWidth={4} strokeLinecap="round" /><line x1={23} y1={7} x2={7} y2={23} stroke="#B84A50" strokeWidth={4} strokeLinecap="round" /></svg>
        </div>
        <div style={{width: 84, height: 84, borderRadius: 999, background: RED, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${ring ? pulse : 1})`, boxShadow: `0 0 ${24 + 18 * Math.sin(frame / 3)}px rgba(229,9,20,0.65)`}}>
          <svg width={34} height={34} viewBox="0 0 34 34">
            <path d="M6 20 C 6 12 12 7 17 7 C 22 7 28 12 28 20 L 24 22 C 23 18 20 16 17 16 C 14 16 11 18 10 22 Z" fill="#FFFFFF" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <AbsoluteFill style={{opacity: an(frame, [0, 6], [1, 0]), background: "#000"}} />
      <GlitchSlices active={frame < 9} />
      <PhoneArt />
      {/* kinetic headline */}
      <div style={{position: "absolute", top: 918, left: 40, right: 40, textAlign: "center", fontWeight: 800, transform: `translateX(${jitter(frame, "hl", 1)}px)`}}>
        <div style={{fontSize: 42, color: TEXT, opacity: an(frame, [40, 52], [0, 1], SNAP), transform: `translateY(${an(frame, [40, 56], [22, 0], SNAP)}px)`}}>
          माँ की कॉल… पर माँ थी
        </div>
        <div style={{fontSize: 50, color: RED, marginTop: 6, opacity: an(frame, [58, 70], [0, 1], SNAP), transform: `translateY(${an(frame, [58, 74], [22, 0], SNAP)}px)`, textShadow: "-3px 0 rgba(229,9,20,0.35), 3px 0 rgba(255,60,60,0.25)"}}>
          ठीक बगल वाले कमरे में।
        </div>
      </div>
      <Captions
        voStart={26}
        voDurF={270}
        chunks={[
          {w: 2.2, tokens: [{t: "रात के दो बजे"}]},
          {w: 3.4, tokens: [{t: "मेरे फोन पर "}, {t: "माँ की कॉल", acc: true}, {t: " आई…"}]},
          {w: 1.8, tokens: [{t: "पर दिक्कत ये थी…"}]},
          {w: 4.2, tokens: [{t: "माँ तो थी "}, {t: "बगल वाले कमरे में!", acc: true}]},
        ]}
      />
      <Vignette strong />
      <Grain />
      <Audio src={staticFile(VO[0].src)} />
    </AbsoluteFill>
  );
};

// ── Scene 2: The Setup ──
const HallwayArt: React.FC = () => {
  const frame = useCurrentFrame();
  const flick = 0.85 + Math.sin(frame / 7) * 0.08 + (random(`fl${frame}`) > 0.94 ? -0.25 : 0);
  const zoom = 1 + an(frame, [0, 369], [0, 0.16]);
  const L = 320, T = 430; // vanishing point
  const corridor = (k: number) => {
    const hw = 250 * k, hh = 380 * k;
    return `M ${L - hw} ${T + hh} L ${L - hw * 0.12} ${T + hh * 0.1} L ${L + hw * 0.12} ${T + hh * 0.1} L ${L + hw} ${T + hh} Z`;
  };
  return (
    <div style={{position: "absolute", top: 240, left: 0, transform: `scale(${zoom})`}}>
      <svg width={720} height={560} viewBox="0 0 720 560">
        {/* perspective lines */}
        <g opacity={0.8 * flick} stroke="#3A3A42" strokeWidth={2}>
          <line x1={0} y1={30} x2={L} y2={T} />
          <line x1={720} y1={30} x2={L} y2={T} />
          <line x1={0} y1={530} x2={L} y2={T} />
          <line x1={720} y1={530} x2={L} y2={T} />
          {[0.35, 0.55, 0.78].map((k, i) => (
            <path key={i} d={corridor(k)} fill="none" opacity={0.7} />
          ))}
        </g>
        {/* end door */}
        <g opacity={flick}>
          <rect x={L - 62} y={T - 90} width={124} height={148} fill="none" stroke="#4A4A54" strokeWidth={3} />
          {/* ajar slit with shadow */}
          <rect x={L + 18} y={T - 82} width={34} height={136} fill="#000" />
          <ellipse cx={L + 35} cy={T - 20} rx={12} ry={30} fill="#0A0A0A" opacity={0.9} />
          <line x1={L + 18} y1={T - 90} x2={L + 52} y2={T - 90} stroke={RED} strokeWidth={2} opacity={0.55} />
        </g>
        {/* hanging bulb */}
        <g opacity={flick}>
          <line x1={L} y1={30} x2={L} y2={T - 210} stroke="#3A3A42" strokeWidth={2} />
          <circle cx={L} cy={T - 196} r={9} fill="#FFE9A8" opacity={0.9 + Math.sin(frame / 5) * 0.1} />
          <circle cx={L} cy={T - 196} r={26} fill="#FFE9A8" opacity={0.12} />
        </g>
      </svg>
    </div>
  );
};

const SetupScene: React.FC = () => {
  const frame = useCurrentFrame();
  const hello = an(frame, [296, 310], [0, 1], SNAP);
  const blur = 8 * (1 - hello);
  const shake = frame > 296 ? jitter(frame, "hello", 2.4) : 0;
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <HallwayArt />
      <HeartWave bpm={70} y={1085} opacity={an(frame, [10, 40], [0, 0.7])} />
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "OdishaSans",
          fontWeight: 900,
          fontSize: 74,
          color: TEXT,
          opacity: hello * 0.96,
          filter: `blur(${blur}px)`,
          transform: `translateX(${shake}px) scale(${0.96 + hello * 0.04})`,
          textShadow: "0 0 26px rgba(255,255,255,0.22)",
        }}
      >
        “हैलो… माँ?”
      </div>
      <div style={{position: "absolute", top: 210, left: 0, right: 0, textAlign: "center", color: DIM, fontSize: 19, fontWeight: 700, letterSpacing: 4, opacity: an(frame, [8, 22], [0, 1])}}>
        काँपते हाथों से फोन उठाया…
      </div>
      <Captions
        voStart={6}
        voDurF={369}
        chunks={[
          {w: 3.2, tokens: [{t: "काँपते हाथों से "}, {t: "फोन उठाया", acc: true}]},
          {w: 4.4, tokens: [{t: "उधर से सिर्फ़ "}, {t: "तेज़ साँसों की आवाज़", acc: true}, {t: " आ रही थी…"}]},
          {w: 2.2, tokens: [{t: "मैंने धीरे से कहा—"}]},
          {w: 2.4, tokens: [{t: "हैलो… माँ?", acc: true}]},
        ]}
      />
      <Vignette strong />
      <Grain />
      <Audio src={staticFile(VO[1].src)} />
    </AbsoluteFill>
  );
};

// ── Scene 3: The Escalation ──
const DoorArt: React.FC = () => {
  const frame = useCurrentFrame();
  const gap = 26 + an(frame, [40, 220], [0, 16]); // gap slowly widens
  const shY = Math.sin(frame / 26) * 7;
  return (
    <svg width={340} height={430} viewBox="0 0 340 430">
      {/* frame */}
      <rect x={40} y={30} width={260} height={372} fill="none" stroke="#4A4A54" strokeWidth={4} />
      {/* dark room behind */}
      <rect x={54} y={44} width={232} height={344} fill="#030304" />
      {/* shadow figure moving behind door */}
      <g opacity={0.85}>
        <ellipse cx={170} cy={210 + shY} rx={54} ry={104} fill="#000" />
        <circle cx={170} cy={112 + shY} r={26} fill="#000" />
      </g>
      {/* door panel ajar */}
      <g>
        <rect x={54} y={44} width={232 - gap} height={344} fill="#14141A" stroke="#3A3A42" strokeWidth={2.5} />
        <circle cx={54 + 232 - gap - 16} cy={216} r={7} fill="#5A5A64" />
        {/* slit glow */}
        <rect x={54 + 232 - gap} y={44} width={gap} height={344} fill="#000" />
        <line x1={54 + 232 - gap} y1={44} x2={54 + 232 - gap} y2={388} stroke={RED} strokeWidth={2} opacity={0.5} />
      </g>
      {/* door label */}
      <text x={170} y={424} fill={DIM} fontSize={16} fontWeight={700} textAnchor="middle" fontFamily="OdishaSans" letterSpacing={4}>
        माँ का कमरा
      </text>
    </svg>
  );
};

const EscalationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const secs = Math.floor(frame / 30);
  const timer = `00:${String(Math.min(secs, 10)).padStart(2, "0")}`;
  const q1 = an(frame, [6, 18], [0, 1], SNAP);
  const q2 = an(frame, [148, 162], [0, 1], SNAP);
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      {/* left: call timer */}
      <div style={{position: "absolute", top: 0, bottom: 0, left: 0, width: 350, borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26}}>
        <div style={{display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 700, color: DIM, letterSpacing: 3}}>
          <span style={{width: 12, height: 12, borderRadius: 999, background: RED, display: "inline-block", opacity: 0.4 + 0.6 * Math.abs(Math.sin(frame / 6))}} />
          CALL RUNNING
        </div>
        <div style={{display: "flex", alignItems: "center", gap: 12}}>
          <HeartIcon size={24} />
          <span style={{fontWeight: 900, fontSize: 40, color: TEXT}}>Mom</span>
        </div>
        <div style={{fontFamily: "OdishaSans", fontWeight: 900, fontSize: 96, color: TEXT, letterSpacing: 4, textShadow: "0 0 30px rgba(229,9,20,0.35)"}}>{timer}</div>
        <div style={{fontSize: 15, fontWeight: 700, color: RED, letterSpacing: 4, opacity: 0.8 + Math.sin(frame / 5) * 0.2}}>FEED • ALIVE</div>
        {/* audio bars */}
        <div style={{display: "flex", gap: 4, alignItems: "flex-end", height: 60}}>
          {Array.from({length: 14}).map((_, i) => {
            const h = 8 + Math.abs(Math.sin(frame / 3 + i * 0.9)) * 46;
            return <div key={i} style={{width: 6, height: h, background: i % 3 === 0 ? RED : "#3A3A42", borderRadius: 2}} />;
          })}
        </div>
      </div>
      {/* right: door ajar */}
      <div style={{position: "absolute", top: 250, left: 370, opacity: an(frame, [4, 16], [0, 1])}}>
        <DoorArt />
      </div>
      {/* quotes */}
      <div style={{position: "absolute", top: 860, left: 380, right: 36, textAlign: "left"}}>
        <div style={{fontSize: 33, fontWeight: 800, color: TEXT, opacity: q1, transform: `translateX(${jitter(frame, "q1", 1)}px)`}}>“मैं अलमारी में छुपी हूँ…”</div>
        <div style={{fontSize: 33, fontWeight: 800, color: RED, marginTop: 14, opacity: q2, transform: `translateX(${jitter(frame, "q2", 1.4)}px)`, textShadow: "-2px 0 rgba(229,9,20,0.4)"}}>“घर में कोई है…”</div>
      </div>
      <HeartWave bpm={82} y={1130} opacity={0.6} />
      <Captions
        voStart={6}
        voDurF={208}
        chunks={[
          {w: 2.6, tokens: [{t: "बेटा… आवाज़ मत करो…"}]},
          {w: 2.4, tokens: [{t: "मैं अलमारी में छुपी हूँ…", acc: true}]},
          {w: 1.8, tokens: [{t: "मुझे लगा जैसे…"}]},
          {w: 2.2, tokens: [{t: "घर में कोई है।", acc: true}]},
        ]}
      />
      <Vignette strong />
      <Grain />
      <Audio src={staticFile(VO[2].src)} />
    </AbsoluteFill>
  );
};

// ── Scene 4: The Climax ──
const STEP_FRAMES = [8, 34, 60, 86, 112, 138, 164, 190];

const ClimaxScene: React.FC = () => {
  const frame = useCurrentFrame();
  // shake impulse after each step
  let amp = 0;
  STEP_FRAMES.forEach((sf, i) => {
    const d = Math.abs(frame - sf);
    if (d < 12) amp = Math.max(amp, (1 - d / 12) * (0.5 + i * 0.07));
  });
  const shakeX = amp ? jitter(frame, "sx", amp * 13) : 0;
  const shakeY = amp ? jitter(frame, "sy", amp * 9) : 0;
  const flash = an(frame, [233, 236, 244], [0, 1, 0]);
  const whisperIn = an(frame, [392, 404], [0, 1]);
  const darkAfter = an(frame, [400, 460], [0, 0.55]);
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <AbsoluteFill style={{transform: `translate(${shakeX}px, ${shakeY}px)`}}>
        {/* step rings */}
        {STEP_FRAMES.map((sf, i) => {
          const p = an(frame, [sf, sf + 22], [0, 1]);
          if (p <= 0 || p >= 1) return null;
          const r = 40 + p * 220;
          return (
            <svg key={i} width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute"}}>
              <circle cx={360} cy={430} r={r} fill="none" stroke={i % 2 ? RED : "#FFFFFF"} strokeWidth={3} opacity={(1 - p) * (0.35 + i * 0.06)} />
            </svg>
          );
        })}
        <div style={{position: "absolute", top: 330, left: 0, right: 0, textAlign: "center", color: DIM, fontSize: 21, fontWeight: 700, letterSpacing: 6, opacity: an(frame, [4, 16], [0, 1]) * (1 - darkAfter)}}>
          पाँव की आवाज़ें… करीब आ रही हैं
        </div>
        <HeartWave bpm={95} y={1090} opacity={0.55} />
        {/* whisper hint */}
        <div style={{position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", color: RED, fontSize: 26, fontWeight: 800, letterSpacing: 2, opacity: whisperIn, textShadow: "-2px 0 rgba(229,9,20,0.5)"}}>
          …पीछे से फुसफुसाहट
        </div>
      </AbsoluteFill>
      {/* bed empty flash */}
      <AbsoluteFill style={{background: "#F2F2F2", opacity: flash, display: "flex", alignItems: "center", justifyContent: "center"}}>
        <div style={{fontFamily: "OdishaSans", fontWeight: 900, fontSize: 64, color: "#0A0A0A", letterSpacing: 1}}>बिस्तर खाली था।</div>
      </AbsoluteFill>
      <GlitchSlices active={frame > 228 && frame < 234} intensity={0.8} />
      <Captions
        voStart={8}
        voDurF={213 + 12 + 246}
        chunks={[
          {w: 1.8, tokens: [{t: "मेरी रूह काँप गई।"}]},
          {w: 3.4, tokens: [{t: "बिना आवाज़ किए "}, {t: "दरवाज़ा खोला", acc: true}]},
          {w: 2.6, tokens: [{t: "बिस्तर खाली था।", acc: true}]},
          {w: 2.6, tokens: [{t: "तभी… मेरे ठीक पीछे से…"}]},
          {w: 2.2, tokens: [{t: "किसी ने फुसफुसाया…", acc: true}]},
        ]}
      />
      <Vignette strong />
      <Grain />
      <Sequence from={8} durationInFrames={213}>
        <Audio src={staticFile(VO[3].src)} />
      </Sequence>
      <Sequence from={233} durationInFrames={246}>
        <Audio src={staticFile(VO[4].src)} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Scene 5: The Final Reveal ──
const RevealScene: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneZoom = 1.04 + an(frame, [8, 20], [0, 0.1]);
  const afterCut = frame >= 107;
  const textIn = an(frame, [24, 36], [0, 1], SNAP);
  const shakeX = frame >= 20 && !afterCut ? jitter(frame, "rx", 4.5) : 0;
  const shakeY = frame >= 20 && !afterCut ? jitter(frame, "ry", 3) : 0;
  const whiteFlash = an(frame, [107, 109, 114], [0, 1, 0]);
  const silhouette = frame >= 20 && !afterCut;
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <GlitchSlices active={frame < 10} intensity={1.4} />
      {/* call ended phone */}
      {!silhouette && !afterCut ? (
        <div style={{position: "absolute", top: 420, left: 130, width: 460, height: 300, transform: `scale(${phoneZoom})`}}>
          <div style={{position: "absolute", inset: 0, borderRadius: 34, background: "#050507", border: "3px solid #2A2A30", boxShadow: "0 20px 70px rgba(0,0,0,0.85)"}} />
          <div style={{position: "absolute", top: 44, left: 0, right: 0, textAlign: "center", color: DIM, fontSize: 20, fontWeight: 700, letterSpacing: 4}}>CALL ENDED</div>
          <div style={{position: "absolute", top: 86, left: 0, right: 0, textAlign: "center", fontFamily: "OdishaSans", fontWeight: 900, fontSize: 60, color: RED, textShadow: "0 0 30px rgba(229,9,20,0.4)"}}>00:19</div>
          <div style={{position: "absolute", top: 170, left: 0, right: 0, textAlign: "center", color: "#6A6A72", fontSize: 17, fontWeight: 700, letterSpacing: 3}}>MOM • 02:16 AM</div>
        </div>
      ) : null}
      {/* silhouette + line */}
      {silhouette && !afterCut ? (
        <>
          <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 88%, rgba(229,9,20,0.30) 0%, rgba(10,10,10,0) 55%)"}} />
          <div style={{position: "absolute", bottom: -40, left: 210, width: 300, height: 620, transform: `translateX(${jitter(frame, "sil", 2)}px) scaleY(${1 + jitter(frame, "silY", 0.012)})`, transformOrigin: "bottom center"}}>
            <svg width={300} height={620} viewBox="0 0 300 620">
              <path d="M150 40 c-40 0 -56 30 -56 58 c0 22 10 38 22 48 c-42 22 -58 74 -62 150 l-18 324 h228 l-18 -324 c-4 -76 -20 -128 -62 -150 c12 -10 22 -26 22 -48 c0 -28 -16 -58 -56 -58 z" fill="#020203" />
            </svg>
          </div>
        </>
      ) : null}
      {/* the line */}
      {!afterCut ? (
        <div
          style={{
            position: "absolute",
            top: 560,
            left: 30,
            right: 30,
            textAlign: "center",
            fontFamily: "OdishaSans",
            fontWeight: 900,
            fontSize: 62,
            color: RED,
            opacity: textIn,
            transform: `translate(${shakeX}px, ${shakeY}px) scale(${0.94 + textIn * 0.06})`,
            textShadow: "-4px 0 rgba(229,9,20,0.45), 4px 0 rgba(255,80,80,0.3), 0 0 34px rgba(229,9,20,0.4)",
          }}
        >
          “तुमने फोन क्यों उठाया?”
        </div>
      ) : null}
      {/* final black + brand */}
      {afterCut ? (
        <>
          <AbsoluteFill style={{background: "#000"}} />
          <div style={{position: "absolute", top: 600, left: 0, right: 0, textAlign: "center", opacity: an(frame, [126, 140], [0, 1])}}>
            <div style={{fontSize: 26, fontWeight: 800, color: "#3C3C44", letterSpacing: 2}}>कहानी अभी खत्म नहीं हुई…</div>
            <div style={{marginTop: 18, fontFamily: "OdishaSans", fontWeight: 900, fontSize: 34, color: RED, letterSpacing: 4}}>ANYTHING</div>
            <div style={{marginTop: 8, fontSize: 16, fontWeight: 700, color: "#55555E", letterSpacing: 5}}>PART 2 • KAL</div>
          </div>
        </>
      ) : null}
      <AbsoluteFill style={{background: "#FFF", opacity: whiteFlash}} />
      <Grain />
      <Audio src={staticFile(VO[5].src)} />
    </AbsoluteFill>
  );
};

// ── root ──
const SCENES = [HookScene, SetupScene, EscalationScene, ClimaxScene, RevealScene];
const SCENE_NAMES = ["01 · The Hook", "02 · The Setup", "03 · The Escalation", "04 · The Climax", "05 · The Reveal"];

export const TheLastCall: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading TheLastCall fonts"));
  useEffect(() => {
    const font = new FontFace("OdishaSans", `url(${staticFile("NotoSansDevanagari.ttf")})`);
    font.load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <Audio src={staticFile("thelastcall/bed.mp3")} volume={0.9} />
      {SCENES.map((Comp, i) => (
        <Sequence key={i} from={sceneStarts[i]} durationInFrames={SCENE_DURS[i]} name={SCENE_NAMES[i]}>
          <Comp />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
