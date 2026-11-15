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

// ── palette ──
const BG = "#0A0D1A";
const PANEL = "#141226";
const CREAM = "#F4ECDD";
const MUTED = "#A79E92";
const GOLD = "#FFC857";
const EMBER = "#FF7A1A";
const RED = "#FF4D4D";
const SKY = "#0E1430";

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const SNAP = Easing.bezier(0.19, 1, 0.22, 1);
const an = (frame: number, range: number[], out: number[], easing = EASE) =>
  interpolate(frame, range, out, {easing, extrapolateLeft: "clamp", extrapolateRight: "clamp"});
const jit = (frame: number, seed: string, amp: number) => (random(`${seed}-${frame}`) - 0.5) * 2 * amp;

// ── timeline ──
export const SCENE_DURS = [266, 298, 277, 298, 304, 322, 234];
export const sceneStarts = SCENE_DURS.map((_, i) => SCENE_DURS.slice(0, i).reduce((a, b) => a + b, 0));
export const totalFrames = SCENE_DURS.reduce((a, b) => a + b, 0); // 1999 ≈ 66.6s

type Chunk = {w: number; tokens: {t: string; acc?: boolean}[]};

const VO: {src: string; durF: number}[] = [
  {src: "sampati/v1-hook.mp3", durF: 260},
  {src: "sampati/v2-udaan.mp3", durF: 292},
  {src: "sampati/v3-khatra.mp3", durF: 271},
  {src: "sampati/v4-sacrifice.mp3", durF: 292},
  {src: "sampati/v5-jeevan.mp3", durF: 298},
  {src: "sampati/v6-lanka.mp3", durF: 316},
  {src: "sampati/v7-ending.mp3", durF: 192},
];

// ── shared series pieces ──
const Grain: React.FC = () => (
  <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute", opacity: 0.06}}>
    <filter id="grainS">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={720} height={1280} filter="url(#grainS)" />
  </svg>
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{background: "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 88%, rgba(0,0,0,0.72) 100%)"}}
  />
);

const FlashCut: React.FC<{accent?: string}> = ({accent = GOLD}) => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{background: CREAM, opacity: an(frame, [0, 2, 7], [0.9, 0.45, 0])}} />
      <AbsoluteFill style={{background: accent, opacity: an(frame, [0, 9], [0.45, 0]), mixBlendMode: "screen"}} />
    </>
  );
};

const WingIcon: React.FC<{size?: number; color?: string}> = ({size = 18, color = GOLD}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: "inline-block", verticalAlign: "middle"}}>
    <path d="M2 14 C 6 6 14 3 22 3 C 18 7 16 9 14 12 C 12 10 10 10 8 11 C 10 12 11 13 12 15 C 8 16 5 16 2 14 Z" fill={color} />
  </svg>
);

const Header: React.FC<{idx: number; accent: string}> = ({idx, accent}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 46,
        left: 44,
        right: 44,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        opacity: an(frame, [2, 12], [0, 1], SNAP),
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 9, color: MUTED, fontSize: 15, fontWeight: 700, letterSpacing: 3.5}}>
        <WingIcon size={16} color={accent} />
        रामायण • अनसुनी कहानी
      </div>
      <div style={{color: accent, fontSize: 15, fontWeight: 700, letterSpacing: 3}}>
        {String(idx + 1).padStart(2, "0")}/07
      </div>
    </div>
  );
};

const Progress: React.FC<{accent?: string}> = ({accent = GOLD}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.09)", display: "flex", gap: 2}}>
      {SCENE_DURS.map((len, i) => {
        const local = frame - sceneStarts[i];
        const fill = Math.min(1, Math.max(0, local / len));
        return (
          <div key={i} style={{flex: len, position: "relative"}}>
            <div style={{position: "absolute", inset: 0, background: accent, width: `${fill * 100}%`}} />
          </div>
        );
      })}
    </div>
  );
};

const Captions: React.FC<{chunks: Chunk[]; voStart?: number; voDurF: number; accent?: string; bottom?: number}> = ({
  chunks,
  voStart = 6,
  voDurF,
  accent = GOLD,
  bottom = 196,
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
  return (
    <div style={{position: "absolute", left: 36, right: 36, bottom, display: "flex", justifyContent: "center"}}>
      <div
        key={idx}
        style={{
          maxWidth: 640,
          background: "rgba(9,8,16,0.8)",
          border: "1px solid rgba(244,236,221,0.12)",
          borderRadius: 18,
          padding: "15px 26px",
          textAlign: "center",
          fontFamily: "OdishaSans",
          fontWeight: 800,
          fontSize: 30,
          lineHeight: 1.4,
          color: CREAM,
          opacity: pop,
          transform: `translateY(${(1 - pop) * 18}px)`,
          boxShadow: "0 10px 34px rgba(0,0,0,0.5)",
        }}
      >
        {chunks[idx].tokens.map((tk, i) => (
          <span key={i} style={{color: tk.acc ? accent : CREAM}}>
            {tk.t}
          </span>
        ))}
      </div>
    </div>
  );
};

const Kicker: React.FC<{text: string; accent: string}> = ({text, accent}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 104,
        left: 0,
        right: 0,
        textAlign: "center",
        color: accent,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: 1,
        opacity: an(frame, [3, 12], [0, 1]),
        transform: `translateY(${an(frame, [3, 12], [-10, 0], SNAP)}px)`,
      }}
    >
      — {text} —
    </div>
  );
};

const Headline: React.FC<{lines: {parts: {t: string; acc?: boolean}[]}[]; accent: string; big?: number; punchAt?: number}> = ({
  lines,
  accent,
  big = 58,
  punchAt = 4,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", top: 164, left: 44, right: 44, textAlign: "center", fontFamily: "OdishaSans", fontWeight: 800, color: CREAM}}>
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            fontSize: big,
            lineHeight: 1.24,
            marginTop: li === 0 ? 0 : 6,
            opacity: an(frame, [punchAt + li * 5, punchAt + 11 + li * 5], [0, 1], SNAP),
            transform: `translateY(${an(frame, [punchAt + li * 5, punchAt + 13 + li * 5], [26, 0], SNAP)}px)`,
          }}
        >
          {line.parts.map((p, pi) => (
            <span key={pi} style={{color: p.acc ? accent : CREAM}}>
              {p.t}
            </span>
          ))}
        </div>
      ))}
      <div style={{width: an(frame, [punchAt + 8, punchAt + 26], [0, 110], SNAP), height: 5, background: accent, margin: "14px auto 0", borderRadius: 3}} />
    </div>
  );
};

const BrandFoot: React.FC<{accent: string; text?: string}> = ({accent, text}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 44,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 14,
        letterSpacing: 4,
        color: MUTED,
        opacity: 0.75 * an(frame, [10, 24], [0, 1]),
      }}
    >
      ANYTHING • <span style={{color: accent}}>{text ?? "FOLLOW करना मत भूलना"}</span>
    </div>
  );
};

// ── vector birds ──
const WING_PTS = "0,0 26,-22 52,-30 76,-28 60,-16 68,-8 46,-2 54,4 30,6 18,10 0,4";

const Bird: React.FC<{
  size: number;
  wingAngle?: number;
  flip?: boolean;
  body?: string;
  wing?: string;
  eye?: string | null;
  burn?: number;
  farOpacity?: number;
}> = ({size, wingAngle = -28, flip = false, body = PANEL, wing = PANEL, eye = GOLD, burn = 0, farOpacity = 0.8}) => {
  const frame = useCurrentFrame();
  const wingScale = size * 0.62;
  const tip = (k: number) => {
    const a = ((wingAngle + k) * Math.PI) / 180;
    return {x: Math.cos(a) * wingScale, y: Math.sin(a) * wingScale};
  };
  const emberDots = burn > 0 ? Array.from({length: 9}) : [];
  return (
    <svg width={size * 1.3} height={size * 1.1} viewBox={`${-size * 0.65} ${-size * 0.6} ${size * 1.3} ${size * 1.1}`} style={{transform: flip ? "scaleX(-1)" : undefined}}>
      {/* far wing */}
      <g transform={`translate(${size * 0.04} ${-size * 0.02}) rotate(${wingAngle + 22})`} opacity={farOpacity}>
        <polygon points={WING_PTS} fill={wing} scale={0.86} transform={`scale(${wingScale * 0.86 / 76})`} />
      </g>
      {/* tail */}
      <g transform={`translate(${-size * 0.3} 0)`}>
        <polygon points="0,-6 -34,-16 -30,0 -34,16 0,6" fill={body} />
      </g>
      {/* body */}
      <ellipse cx={0} cy={0} rx={size * 0.3} ry={size * 0.105} fill={body} />
      {/* near wing */}
      <g transform={`translate(${size * 0.02} ${-size * 0.03}) rotate(${wingAngle})`}>
        <polygon points={WING_PTS} fill={wing} transform={`scale(${wingScale / 76})`} />
        {/* charred / ember tip */}
        {burn > 0 ? (
          <g transform={`scale(${wingScale / 76})`}>
            <polygon points="46,-2 76,-28 68,-8" fill={RED} opacity={burn * 0.85} />
            <polygon points="52,-30 76,-28 60,-16" fill="#1A0E08" opacity={burn} />
          </g>
        ) : null}
      </g>
      {/* ember particles at tips */}
      {emberDots.map((_, i) => {
        const t = tip(22);
        const px = t.x + jit(frame, `emb${i}`, size * 0.1);
        const py = t.y + jit(frame, `emb2${i}`, size * 0.1) - ((frame * (1 + random(`sp${i}`) * 2)) % (size * 0.5));
        return <circle key={i} cx={px} cy={py} r={2 + random(`r${i}`) * 3} fill={i % 2 ? EMBER : RED} opacity={(1 - burn) * 0.9 * random(`o${frame}-${i}`)} />;
      })}
      {/* neck + head + beak */}
      <circle cx={size * 0.3} cy={-size * 0.05} r={size * 0.09} fill={body} />
      <polygon points={`${size * 0.37},${-size * 0.07} ${size * 0.52},${-size * 0.02} ${size * 0.37},${size * 0.01}`} fill={GOLD} opacity={0.9} />
      {eye ? <circle cx={size * 0.33} cy={-size * 0.08} r={size * 0.022} fill={eye} /> : null}
    </svg>
  );
};

const Feather: React.FC<{size: number; color?: string; opacity?: number}> = ({size, color = CREAM, opacity = 1}) => (
  <svg width={size} height={size * 1.7} viewBox="0 0 20 34" style={{opacity}}>
    <path d="M10 1 C 17 10 17 24 10 33 C 3 24 3 10 10 1 Z" fill={color} />
    <line x1={10} y1={2} x2={10} y2={33} stroke={BG} strokeWidth={1.4} opacity={0.5} />
  </svg>
);

const Sun: React.FC<{x: number; y: number; r: number; heat?: boolean; frame: number}> = ({x, y, r, heat, frame}) => (
  <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute", inset: 0}}>
    <circle cx={x} cy={y} r={r * 1.7} fill={heat ? RED : EMBER} opacity={0.14} />
    <circle cx={x} cy={y} r={r * 1.3} fill={heat ? RED : EMBER} opacity={0.2} />
    <circle cx={x} cy={y} r={r} fill={heat ? "#FF5A3C" : EMBER} />
    {Array.from({length: 14}).map((_, i) => {
      const a = (i * Math.PI) / 7 + frame / 120;
      return (
        <line
          key={i}
          x1={x + Math.cos(a) * (r + 14)}
          y1={y + Math.sin(a) * (r + 14)}
          x2={x + Math.cos(a) * (r + 34)}
          y2={y + Math.sin(a) * (r + 34)}
          stroke={heat ? RED : GOLD}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.8}
        />
      );
    })}
  </svg>
);

// ── Scene 1: hook / mystery reveal ──
const HookArt: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = an(frame, [86, 116], [-260, 0], SNAP);
  const nameIn = an(frame, [130, 142], [0, 1], SNAP);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 62% 40%, rgba(255,200,87,0.10) 0%, rgba(10,13,26,0) 58%)"}} />
      <div style={{position: "absolute", top: 400, left: 190, transform: `translateX(${reveal}px)`}}>
        <Bird size={430} wingAngle={-16} body="#05060C" wing="#0A0C18" eye={GOLD} farOpacity={0.5} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 900,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: nameIn,
          transform: `translateY(${(1 - nameIn) * 26}px)`,
        }}
      >
        <div style={{fontSize: 22, color: MUTED, fontWeight: 700, letterSpacing: 4}}>उस भाई का नाम है…</div>
        <div style={{fontSize: 86, fontWeight: 900, color: GOLD, letterSpacing: 6, marginTop: 6, textShadow: "0 0 34px rgba(255,200,87,0.3)"}}>सम्पाति</div>
      </div>
      {/* question marks drifting */}
      {[
        {x: 120, y: 260, s: 44, d: 0},
        {x: 600, y: 340, s: 34, d: 9},
        {x: 90, y: 560, s: 30, d: 17},
      ].map((q, i) => (
        <div key={i} style={{position: "absolute", left: q.x, top: q.y + Math.sin(frame / 24 + q.d) * 12, color: GOLD, fontSize: q.s, fontWeight: 900, opacity: 0.5 + Math.sin(frame / 15 + q.d) * 0.25}}>
          ?
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ── Scene 2: flight toward the sun ──
const FlightArt: React.FC = () => {
  const frame = useCurrentFrame();
  const flap = Math.sin(frame / 9);
  const glide1 = an(frame, [0, 200], [0, -90]);
  const glide2 = an(frame, [0, 200], [0, -60]);
  return (
    <AbsoluteFill style={{backgroundColor: SKY}}>
      <AbsoluteFill style={{background: "linear-gradient(180deg, #05070F 0%, #0E1430 55%, #1A1A30 100%)"}} />
      <Sun x={360} y={330} r={92} frame={frame} />
      {/* wind streaks */}
      {Array.from({length: 7}).map((_, i) => {
        const y = 480 + i * 90;
        const x = ((frame * (7 + i * 2)) % 900) - 180;
        return <div key={i} style={{position: "absolute", left: x, top: y, width: 150 + i * 20, height: 2, background: "rgba(244,236,221,0.13)", borderRadius: 2}} />;
      })}
      {/* clouds */}
      {[
        {x: 90, y: 560, s: 1.1, o: 0.16},
        {x: 430, y: 700, s: 1.4, o: 0.12},
        {x: 160, y: 840, s: 1.7, o: 0.09},
      ].map((c, i) => (
        <div key={i} style={{position: "absolute", left: c.x + frame * 0.4 * (i + 1), top: c.y, opacity: c.o}}>
          <div style={{width: 210 * c.s, height: 34 * c.s, borderRadius: 999, background: CREAM}} />
        </div>
      ))}
      {/* Jatayu (small, leading) */}
      <div style={{position: "absolute", top: 470 + glide1, left: 300, transform: `rotate(${flap * 2}deg)`}}>
        <Bird size={150} wingAngle={-34 + flap * 9} body="#2A1E10" wing="#4A3316" eye={GOLD} />
      </div>
      {/* Sampati (big, behind) */}
      <div style={{position: "absolute", top: 640 + glide2, left: 60, transform: `rotate(${flap * 1.6}deg)`}}>
        <Bird size={260} wingAngle={-30 + flap * 8} body="#0B0E1C" wing="#161A34" eye={GOLD} />
      </div>
      {/* altitude rings */}
      {[880, 960].map((y, i) => (
        <div key={i} style={{position: "absolute", top: y, left: 110, width: 500, height: 3, background: `rgba(255,200,87,${0.16 - i * 0.05})`, borderRadius: 2}} />
      ))}
      <div style={{position: "absolute", top: 940, left: 0, right: 0, textAlign: "center", color: MUTED, fontSize: 17, fontWeight: 700, letterSpacing: 5}}>
        JATAYU + SAMPATI • दो भाई
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: danger / melting feathers ──
const DangerArt: React.FC = () => {
  const frame = useCurrentFrame();
  const shake = an(frame, [150, 260], [0, 1]) * jit(frame, "heat", 3);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: "linear-gradient(180deg, #1C0A08 0%, #2A0E08 50%, #0A0D1A 100%)"}} />
      <Sun x={360} y={300} r={150} heat frame={frame} />
      {/* heat rings rising */}
      {Array.from({length: 5}).map((_, i) => {
        const p = ((frame + i * 26) % 130) / 130;
        const y = 480 - p * 130;
        return <div key={i} style={{position: "absolute", left: 310, top: y, width: 100, height: 20, borderRadius: 999, border: "2px solid rgba(255,90,60,0.3)", transform: `scale(${1 + p * 1.6})`, opacity: (1 - p) * 0.5}} />;
      })}
      {/* Jatayu struggling near the sun */}
      <div style={{position: "absolute", top: 480, left: 190, transform: `translateX(${shake}px) rotate(${Math.sin(frame / 7) * 4}deg)`}}>
        <Bird size={240} wingAngle={-20 + Math.sin(frame / 5) * 14} body="#180C06" wing="#301408" eye={RED} />
      </div>
      {/* falling feathers */}
      {Array.from({length: 10}).map((_, i) => {
        const delay = i * 22;
        const p = ((frame + delay) % 190) / 190;
        const x = 250 + random(`fx${i}`) * 220 + Math.sin(frame / 20 + i) * 30;
        const y = 560 + p * 420;
        const o = (1 - p) * 0.9;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, transform: `rotate(${p * 260 + i * 40}deg)`, opacity: o}}>
            <Feather size={16 + random(`fs${i}`) * 10} color={i % 3 === 0 ? EMBER : CREAM} />
          </div>
        );
      })}
      <div style={{position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", color: RED, fontSize: 19, fontWeight: 800, letterSpacing: 5, opacity: 0.8 + Math.sin(frame / 4) * 0.2}}>
        ⚠ JATAYU खतरे में
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: the sacrifice ──
const SacrificeArt: React.FC = () => {
  const frame = useCurrentFrame();
  const spread = an(frame, [10, 34], [-4, -38], SNAP);
  const burn = an(frame, [70, 250], [0, 1]);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 50% 40%, rgba(255,122,26,0.20) 0%, rgba(10,13,26,0) 62%)"}} />
      {/* Sampati above, wings spread wide shielding */}
      <div style={{position: "absolute", top: 420, left: 120, transform: `rotate(${Math.sin(frame / 10) * 1.4}deg)`}}>
        <Bird size={330} wingAngle={spread} body="#0B0E1C" wing="#1A1430" eye={GOLD} burn={burn} farOpacity={0.9} />
      </div>
      {/* Jatayu tucked underneath */}
      <div style={{position: "absolute", top: 700, left: 250, opacity: an(frame, [16, 30], [0, 1])}}>
        <Bird size={190} wingAngle={-6} body="#2A1E10" wing="#4A3316" eye={GOLD} />
      </div>
      {/* rising ash */}
      {Array.from({length: 14}).map((_, i) => {
        const p = ((frame + i * 18) % 160) / 160;
        const x = 120 + random(`ax${i}`) * 480;
        const y = 700 - p * 420;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, opacity: (1 - p) * 0.75 * burn}}>
            <Feather size={10 + random(`as${i}`) * 8} color={i % 2 ? "#6B4A34" : "#3A2A20"} />
          </div>
        );
      })}
      {/* glow under the shield */}
      <div style={{position: "absolute", top: 640, left: 150, width: 420, height: 26, borderRadius: 999, background: EMBER, opacity: 0.22 * burn, filter: "blur(14px)"}} />
      <div style={{position: "absolute", top: 1010, left: 0, right: 0, textAlign: "center", color: EMBER, fontSize: 22, fontWeight: 800, letterSpacing: 6, opacity: an(frame, [40, 56], [0, 1])}}>
        SACRIFICE
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5: life on the ground ──
const GroundedArt: React.FC = () => {
  const frame = useCurrentFrame();
  const breath = Math.sin(frame / 16) * 2;
  const dusk = an(frame, [120, 240], [0, 1]);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${dusk > 0.5 ? "#0B0A14" : "#0A0D1A"} 0%, #12101E 60%, #17121F 100%)`}} />
      {/* setting / rising sun small on horizon */}
      <div style={{position: "absolute", top: 520 - dusk * 40, left: 250, opacity: 0.5 + dusk * 0.3}}>
        <Sun x={110} y={110} r={46} frame={frame} />
      </div>
      {/* cliff */}
      <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute"}}>
        <path d="M0 980 L 150 940 L 300 962 L 460 938 L 720 970 L 720 1280 L 0 1280 Z" fill={PANEL} />
        <line x1={0} y1={968} x2={720} y2={980} stroke={GOLD} strokeWidth={2} opacity={0.25} />
        {/* grass tufts */}
        {[80, 200, 520, 640].map((x, i) => (
          <g key={i} opacity={0.5}>
            <line x1={x} y1={952} x2={x - 8} y2={930} stroke={GOLD} strokeWidth={2} />
            <line x1={x + 6} y1={952} x2={x + 8} y2={928} stroke={GOLD} strokeWidth={2} />
          </g>
        ))}
      </svg>
      {/* grounded Sampati — folded wing stumps */}
      <div style={{position: "absolute", top: 700 + breath, left: 210}}>
        <svg width={300} height={260} viewBox="0 0 300 260">
          {/* body upright */}
          <ellipse cx={150} cy={140} rx={62} ry={78} fill="#0B0E1C" />
          {/* wing stumps folded */}
          <path d="M92 100 C 70 130 68 170 80 200 C 96 190 104 160 104 130 Z" fill="#1A1430" />
          <path d="M208 100 C 230 130 232 170 220 200 C 204 190 196 160 196 130 Z" fill="#1A1430" />
          {/* head */}
          <circle cx={150} cy={64} r={30} fill="#0B0E1C" />
          <polygon points="166,54 216,66 166,74" fill={GOLD} opacity={0.9} />
          <circle cx={158} cy={58} r={6} fill={GOLD} />
          {/* tail on ground */}
          <polygon points="110,204 40,232 46,244 120,224" fill="#0B0E1C" />
        </svg>
      </div>
      {/* drifting feathers (memories of flight) */}
      {Array.from({length: 5}).map((_, i) => {
        const p = ((frame + i * 40) % 220) / 220;
        const x = 120 + i * 110 + Math.sin(frame / 24 + i) * 26;
        const y = 420 + p * 400;
        return (
          <div key={i} style={{position: "absolute", left: x, top: y, opacity: (1 - p) * 0.4, transform: `rotate(${p * 200}deg)`}}>
            <Feather size={13} color={MUTED} />
          </div>
        );
      })}
      {/* years passing */}
      <div
        style={{
          position: "absolute",
          top: 596,
          left: 0,
          right: 0,
          textAlign: "center",
          color: MUTED,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 6,
          opacity: an(frame, [130, 150], [0, 1]) * 0.85,
        }}
      >
        सालों तक…
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 6: eagle vision / Lanka reveal ──
const VisionArt: React.FC = () => {
  const frame = useCurrentFrame();
  const irisIn = an(frame, [8, 30], [0, 1], SNAP);
  const pathP = an(frame, [40, 130], [0, 1], SNAP);
  const islandIn = an(frame, [70, 100], [0, 1], SNAP);
  const monkeysIn = an(frame, [110, 130], [0, 1], SNAP);
  const scan = Math.sin(frame / 12) * 3;
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: "radial-gradient(ellipse at 30% 42%, rgba(255,200,87,0.14) 0%, rgba(10,13,26,0) 55%)"}} />
      {/* giant eye (Sampati's sight) */}
      <div style={{position: "absolute", top: 380, left: 60, opacity: irisIn}}>
        <svg width={300} height={190} viewBox="0 0 300 190">
          <path d="M10 95 C 70 30 230 30 290 95 C 230 160 70 160 10 95 Z" fill="#0B0E1C" stroke={GOLD} strokeWidth={3} />
          <circle cx={150} cy={95} r={44} fill={GOLD} opacity={0.9 + Math.sin(frame / 8) * 0.1} />
          <circle cx={150} cy={95} r={20} fill="#12100A" />
          <circle cx={158} cy={86} r={7} fill={CREAM} opacity={0.9} />
          {Array.from({length: 12}).map((_, i) => {
            const a = (i * Math.PI) / 6 + frame / 90;
            return <line key={i} x1={150 + Math.cos(a) * 24} y1={95 + Math.sin(a) * 24} x2={150 + Math.cos(a) * 42} y2={95 + Math.sin(a) * 42} stroke="#12100A" strokeWidth={3} opacity={0.7} />;
          })}
        </svg>
        <div style={{textAlign: "center", color: MUTED, fontSize: 15, fontWeight: 800, letterSpacing: 4, marginTop: 4}}>SAMPATI की दूर तक देखने वाली नज़र</div>
      </div>
      {/* dotted flight path to Lanka */}
      <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute"}}>
        {Array.from({length: 14}).map((_, i) => {
          const p = i / 13;
          if (p > pathP) return null;
          const x = 330 + p * 300;
          const y = 470 - Math.sin(p * Math.PI * 0.9) * 130 + p * 60;
          return <circle key={i} cx={x} cy={y} r={5} fill={GOLD} opacity={0.7 * (1 - Math.abs(p - pathP) * 2)} />;
        })}
      </svg>
      {/* vision bubble: Lanka island + Sita in grove */}
      {islandIn > 0.01 ? (
        <div style={{position: "absolute", top: 330, left: 420, opacity: islandIn, transform: `scale(${0.9 + islandIn * 0.1})`}}>
          <svg width={280} height={280} viewBox="0 0 280 280">
            <circle cx={140} cy={140} r={128} fill="#0D1226" stroke={GOLD} strokeWidth={3} />
            <circle cx={140} cy={140} r={112} fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="4 8" opacity={0.5} />
            {/* sea */}
            <circle cx={140} cy={140} r={96} fill="#0A1E38" opacity={0.8} />
            {/* island */}
            <path d="M70 160 L 120 118 L 200 132 L 224 168 L 180 196 L 100 190 Z" fill="#2E3A22" stroke={GOLD} strokeWidth={2} />
            {/* Ashoka grove + Sita silhouette */}
            <circle cx={150} cy={150} r={20} fill="#1C2E16" />
            <circle cx={150} cy={136} r={10} fill={CREAM} opacity={0.95} />
            <path d="M150 146 c-12 0 -15 16 -15 26 h30 c0 -10 -3 -26 -15 -26 z" fill={CREAM} opacity={0.95} />
            {/* waves */}
            {[210, 224, 238].map((y, i) => (
              <path key={i} d={`M${60 + i * 10} ${y} q 14 -8 28 0 q 14 8 28 0`} fill="none" stroke="#3E5C7E" strokeWidth={2.5} />
            ))}
            <text x={140} y={262} fill={GOLD} fontSize={22} fontWeight={900} textAnchor="middle" fontFamily="OdishaSans" letterSpacing={6}>
              LANKA
            </text>
          </svg>
          {/* scan line shimmer */}
          <div style={{position: "absolute", top: 30 + scan, left: 20, width: 240, height: 2, background: GOLD, opacity: 0.35, borderRadius: 2}} />
        </div>
      ) : null}
      {/* vanar sena listening */}
      {monkeysIn > 0.01 ? (
        <div style={{position: "absolute", top: 880, left: 90, display: "flex", gap: 34, opacity: monkeysIn}}>
          {[0, 1, 2].map((i) => (
            <svg key={i} width={110} height={130} viewBox="0 0 110 130" style={{transform: `translateY(${Math.sin(frame / 10 + i * 2) * 3}px)`}}>
              <circle cx={55} cy={30} r={24} fill="#3A2C18" />
              <circle cx={32} cy={16} r={8} fill="#3A2C18" />
              <circle cx={78} cy={16} r={8} fill="#3A2C18" />
              <ellipse cx={55} cy={30} rx={14} ry={10} fill="#5A4426" />
              <path d="M55 54 c-24 0 -32 30 -32 56 h64 c0 -26 -8 -56 -32 -56 z" fill="#3A2C18" />
              <path d="M23 84 q -18 10 -20 30 l 14 2 q 4 -16 12 -22 z" fill="#3A2C18" />
              <path d="M87 84 q 18 10 20 30 l -14 2 q -4 -16 -12 -22 z" fill="#3A2C18" />
              <circle cx={55} cy={30} r={2.6} fill={GOLD} />
            </svg>
          ))}
        </div>
      ) : null}
      <div style={{position: "absolute", top: 1030, left: 0, right: 0, textAlign: "center", color: GOLD, fontSize: 19, fontWeight: 800, letterSpacing: 4, opacity: an(frame, [150, 170], [0, 1])}}>
        राम की खोज → पूरी
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 7: ending + CTA ──
const EndingArt: React.FC = () => {
  const frame = useCurrentFrame();
  const qIn = an(frame, [8, 26], [0, 1], SNAP);
  const cardIn = an(frame, [92, 110], [0, 1], SNAP);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: "linear-gradient(180deg, #0A0D1A 0%, #141226 60%, #241612 100%)"}} />
      {/* sunrise horizon */}
      <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute"}}>
        <circle cx={360} cy={1130} r={150} fill={EMBER} opacity={0.32} />
        <circle cx={360} cy={1130} r={90} fill={EMBER} opacity={0.5} />
        <line x1={0} y1={1130} x2={720} y2={1130} stroke={GOLD} strokeWidth={2.5} opacity={0.4} />
        {/* path to manzil */}
        <path d="M360 1120 C 300 1040 300 960 360 880 C 420 800 420 740 360 680" fill="none" stroke={GOLD} strokeWidth={2.5} strokeDasharray="2 12" opacity={0.6} />
        {/* small bird flying up the path (Jatayu's flight continues) */}
        {(() => {
          const p = ((frame + 30) % 150) / 150;
          const bx = 360 - Math.sin(p * Math.PI) * 60;
          const by = 1120 - p * 450;
          const o = p > 0.92 ? (1 - p) * 12 : 1;
          return (
            <g transform={`translate(${bx} ${by}) scale(${0.9 - p * 0.35})`} opacity={o * 0.95}>
              <Bird size={90} wingAngle={-30 + Math.sin(frame / 6) * 10} body="#1C1420" wing="#2E2438" eye={GOLD} farOpacity={0.6} />
            </g>
          );
        })()}
      </svg>
      {/* falling feather center */}
      {(() => {
        const p = (frame % 130) / 130;
        return (
          <div style={{position: "absolute", top: 300 + p * 200, left: 330 + Math.sin(frame / 18) * 20, opacity: (1 - p) * 0.85, transform: `rotate(${p * 220}deg)`}}>
            <Feather size={22} color={CREAM} />
          </div>
        );
      })()}
      {/* the quote */}
      <div style={{position: "absolute", top: 566, left: 40, right: 40, textAlign: "center", opacity: qIn}}>
        <div style={{fontFamily: "OdishaSans", fontWeight: 800, fontSize: 36, lineHeight: 1.5, color: CREAM}}>
          कभी-कभी जो खुद उड़ नहीं सकता…
          <br />
          <span style={{color: GOLD}}>वही दूसरों को manzil तक</span>
          <br />
          पहुँचा देता है।
        </div>
      </div>
      {/* follow card */}
      <div style={{position: "absolute", top: 920, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: cardIn, transform: `translateY(${(1 - cardIn) * 24}px)`}}>
        <div style={{position: "relative", width: 420, height: 110, borderRadius: 28, background: "linear-gradient(120deg, #FF7A1A, #FF9A1A)", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, boxShadow: "0 14px 44px rgba(255,122,26,0.35)"}}>
          {[0, 1].map((i) => {
            const p = ((frame + i * 30) % 60) / 60;
            return <div key={i} style={{position: "absolute", inset: 0, borderRadius: 28, border: `3px solid ${GOLD}`, transform: `scale(${1 + p * 0.3})`, opacity: (1 - p) * 0.5}} />;
          })}
          <WingIcon size={34} color={CREAM} />
          <span style={{fontFamily: "OdishaSans", fontWeight: 900, fontSize: 40, letterSpacing: 4, color: "#0A0D1A"}}>FOLLOW</span>
        </div>
      </div>
      <div style={{position: "absolute", top: 1054, left: 0, right: 0, textAlign: "center", fontFamily: "OdishaSans", fontWeight: 900, fontSize: 30, color: CREAM, opacity: cardIn, letterSpacing: 2}}>
        ANYTHING
      </div>
      {/* source citation */}
      <div style={{position: "absolute", bottom: 44, left: 0, right: 0, textAlign: "center", fontSize: 14, letterSpacing: 1.5, color: MUTED, opacity: cardIn * 0.9}}>
        SOURCE: VALMIKI RAMAYANA • KISHKINDHA KANDA, SARGA 56–58
      </div>
    </AbsoluteFill>
  );
};

// ── scene shells ──
const SCENES: {Comp: React.FC; kicker: string; head: {parts: {t: string; acc?: boolean}[]}[]; accent: string; captions: Chunk[]; voDurF: number; voStart?: number; foot?: string}[] = [
  {
    Comp: HookArt,
    kicker: "रामायण का अनसुना किस्सा",
    head: [
      {parts: [{t: "JATAYU"}]},
      {parts: [{t: "का भाई?", acc: true}]},
    ],
    accent: GOLD,
    voDurF: VO[0].durF,
    captions: [
      {w: 2.2, tokens: [{t: "Jatayu को तो आप जानते हैं…"}]},
      {w: 3, tokens: [{t: "लेकिन क्या आप उस "}, {t: "भाई", acc: true}, {t: " को जानते हैं…"}]},
      {w: 3, tokens: [{t: "जिसने Jatayu की जान बचाने के लिए…"}]},
      {w: 2, tokens: [{t: "अपनी उड़ान ही खो दी?", acc: true}]},
    ],
  },
  {
    Comp: FlightArt,
    kicker: "दो भाई • एक सपना",
    head: [{parts: [{t: "सूर्य की तरफ़ "}, {t: "उड़ान", acc: true}]}],
    accent: GOLD,
    voDurF: VO[1].durF,
    captions: [
      {w: 2.8, tokens: [{t: "ये है "}, {t: "SAMPATI", acc: true}, {t: " — Jatayu का बड़ा भाई"}]},
      {w: 3, tokens: [{t: "जवानी में दोनों भाई "}, {t: "Surya dev", acc: true}, {t: " की तरफ़ उड़े"}]},
      {w: 2.4, tokens: [{t: "आसमान की सबसे "}, {t: "ऊँची height", acc: true}, {t: " छूने!"}]},
    ],
  },
  {
    Comp: DangerArt,
    kicker: "आसमान की आग",
    head: [{parts: [{t: "पंख "}, {t: "पिघलने लगे!", acc: true}]}],
    accent: EMBER,
    voDurF: VO[2].durF,
    captions: [
      {w: 2.6, tokens: [{t: "Surya की गर्मी सहना "}, {t: "आसान नहीं", acc: true}, {t: " था"}]},
      {w: 2.2, tokens: [{t: "Jatayu ऊपर जाता गया…"}]},
      {w: 2.6, tokens: [{t: "और उसके पंख "}, {t: "पिघलने लगे!", acc: true}]},
    ],
  },
  {
    Comp: SacrificeArt,
    kicker: "इसी पल के लिए — एक भाई",
    head: [{parts: [{t: "पंख "}, {t: "उसके ऊपर", acc: true}]}],
    accent: EMBER,
    voDurF: VO[3].durF,
    captions: [
      {w: 2, tokens: [{t: "तभी Sampati "}, {t: "आगे बढ़ा", acc: true}]},
      {w: 3, tokens: [{t: "अपने पंख Jatayu के "}, {t: "ऊपर फैला दिए!", acc: true}]},
      {w: 1.6, tokens: [{t: "भाई बच गया…"}]},
      {w: 2.4, tokens: [{t: "पर Sampati के पंख "}, {t: "जल गए।", acc: true}]},
    ],
  },
  {
    Comp: GroundedArt,
    kicker: "बलिदान की कीमत",
    head: [{parts: [{t: "ज़मीन पर… "}, {t: "हमेशा के लिए", acc: true}]}],
    accent: GOLD,
    voDurF: VO[4].durF,
    captions: [
      {w: 2.6, tokens: [{t: "सालों तक Sampati "}, {t: "ज़मीन पर", acc: true}, {t: " रहा"}]},
      {w: 1.8, tokens: [{t: "उड़ना भूल गया…"}]},
      {w: 2.4, tokens: [{t: "बस "}, {t: "आसमान", acc: true}, {t: " देखता रहा।"}]},
      {w: 2.6, tokens: [{t: "और तभी उसकी तेज़ "}, {t: "नज़र", acc: true}, {t: " काम आई…"}]},
    ],
  },
  {
    Comp: VisionArt,
    kicker: "ईगल विज़न • लंका की खोज",
    head: [{parts: [{t: "SITA"}]}, {parts: [{t: "का पता", acc: true}]}],
    accent: GOLD,
    voDurF: VO[5].durF,
    captions: [
      {w: 2.6, tokens: [{t: "उसी Sampati ने "}, {t: "vanar sena", acc: true}, {t: " को बताया…"}]},
      {w: 2.8, tokens: [{t: "Sita mata — "}, {t: "लंका में है!", acc: true}]},
      {w: 2.2, tokens: [{t: "राम की सबसे बड़ी खोज…"}]},
      {w: 2.6, tokens: [{t: "इसी भाई की "}, {t: "नज़र", acc: true}, {t: " से पूरी हुई!"}]},
    ],
  },
  {
    Comp: EndingArt,
    kicker: "कहानी की सीख",
    head: [],
    accent: GOLD,
    voDurF: VO[6].durF,
    foot: "रामायण की अनसुनी कहानियाँ",
    captions: [
      {w: 1.2, tokens: [{t: "कभी-कभी…"}]},
      {w: 2.4, tokens: [{t: "जो खुद उड़ नहीं सकता…"}]},
      {w: 3.4, tokens: [{t: "वही दूसरों को "}, {t: "manzil तक", acc: true}, {t: " पहुँचा देता है।"}]},
    ],
  },
];

const SceneShell: React.FC<{idx: number}> = ({idx}) => {
  const s = SCENES[idx];
  const Comp = s.Comp;
  const frame = useCurrentFrame();
  const headFades = s.head.length > 0 && idx < 6;
  const headOut = headFades ? an(frame, [s.voDurF - 34, s.voDurF - 18], [1, 0]) : 1;
  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <FlashCut accent={s.accent} />
      <Comp />
      <AbsoluteFill style={{opacity: headOut}}>
        <Header idx={idx} accent={s.accent} />
        {s.head.length > 0 ? <Headline lines={s.head} accent={s.accent} big={idx === 0 ? 66 : 58} punchAt={idx === 0 ? 8 : 4} /> : null}
        <Kicker text={s.kicker} accent={s.accent} />
      </AbsoluteFill>
      <Progress accent={s.accent} />
      <Vignette />
      <Captions chunks={s.captions} voDurF={s.voDurF} voStart={s.voStart} accent={s.accent} bottom={idx === 6 ? 452 : 196} />
      <Grain />
      {idx < 6 ? <BrandFoot accent={s.accent} text={s.foot} /> : null}
      <Audio src={staticFile(VO[idx].src)} />
    </AbsoluteFill>
  );
};

export const SampatiUntold: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Sampati fonts"));
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
      <Audio src={staticFile("sampati/bed.mp3")} volume={0.85} />
      {SCENES.map((_, i) => (
        <Sequence key={i} from={sceneStarts[i]} durationInFrames={SCENE_DURS[i]} name={`${String(i + 1).padStart(2, "0")} · Sampati`}>
          <SceneShell idx={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
