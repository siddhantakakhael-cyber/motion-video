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

// ───────────────────────── palette & helpers ─────────────────────────
const BG = "#0D0A12";
const PANEL = "#181022";
const CREAM = "#F4ECDD";
const MUTED = "#B7AB9C";
const AMBER = "#FFB03A";
const ORANGE = "#FF6B1A";
const GOLD = "#FFD98A";
const RED = "#FF4D5E";

const EASE = Easing.bezier(0.42, 0, 0.58, 1);
const SNAP = Easing.bezier(0.19, 1, 0.22, 1);

const an = (frame: number, range: number[], out: number[], easing = EASE) =>
  interpolate(frame, range, out, {easing, extrapolateLeft: "clamp", extrapolateRight: "clamp"});

const hasDeva = (s: string) => /[\u0900-\u097F]/.test(s);

type Token = {t: string; acc?: boolean};
type CaptionChunk = {w: number; tokens: Token[]};
type HeadLine = {parts: Token[]};

export const VOICE_SCENES: {
  vo: string;
  durS: number;
  kicker: string;
  tag: string;
  accent: string;
  head: HeadLine[];
  stat?: string[];
  captions: CaptionChunk[];
}[] = [
  {
    vo: "odisha/vo-01-hook.mp3",
    durS: 9.38,
    kicker: "एक कहानी जो कोई नहीं बताता",
    tag: "ODISHA • ANCIENT SCIENCE",
    accent: AMBER,
    head: [{parts: [{t: "रुको!"}]}],
    captions: [
      {w: 1.2, tokens: [{t: "रुको!", acc: true}]},
      {w: 3.0, tokens: [{t: "ये मंदिर सिर्फ़ पत्थर नहीं है..."}]},
      {w: 3.4, tokens: [{t: "ये एक "}, {t: "ANCIENT MACHINE", acc: true}, {t: " है!"}]},
      {w: 3.7, tokens: [{t: "ओडिशा की "}, {t: "science", acc: true}, {t: " दिमाग़ हिला देगी!"}]},
      {w: 1.8, tokens: [{t: "Believe", acc: true}, {t: " करो!"}]},
    ],
  },
  {
    vo: "odisha/vo-02-konark.mp3",
    durS: 11.26,
    kicker: "कोणार्क सूर्य मंदिर • 1250 CE",
    tag: "KONARK • SUN TEMPLE",
    accent: AMBER,
    head: [
      {parts: [{t: "24 पत्थर के "}, {t: "पहिये", acc: true}]},
      {parts: [{t: "और एक "}, {t: "HIDDEN", acc: true}, {t: " राज़"}]},
    ],
    stat: ["1250 CE", "24 WHEELS", "SODASHA RATH"],
    captions: [
      {w: 3.4, tokens: [{t: "ये है "}, {t: "KONARK SUN TEMPLE", acc: true}]},
      {w: 3.2, tokens: [{t: "सोलह सौ साल पुराना "}, {t: "WONDER", acc: true}]},
      {w: 2.6, tokens: [{t: "चौबीस पत्थर के पहिये..."}]},
      {w: 2.7, tokens: [{t: "हर पहिये में आठ "}, {t: "SPOKES", acc: true}]},
      {w: 3.4, tokens: [{t: "और ये सिर्फ़ "}, {t: "decoration", acc: true}, {t: " नहीं है!"}]},
    ],
  },
  {
    vo: "odisha/vo-03-sundial.mp3",
    durS: 12.65,
    kicker: "सूर्य घड़ी • 800 साल पुरानी timekeeping",
    tag: "SUN DIAL • Vedic Timekeeping",
    accent: GOLD,
    head: [
      {parts: [{t: "ये घड़ी चलती है…", acc: false}]},
      {parts: [{t: "सिर्फ़ "}, {t: "सूरज", acc: true}, {t: " से!"}]},
    ],
    stat: ["SUN DIAL", "6 AM – 6 PM", "0 ELECTRICITY"],
    captions: [
      {w: 3.2, tokens: [{t: "सुबह से शाम तक — "}, {t: "EXACT TIME", acc: true}]},
      {w: 3.2, tokens: [{t: "सूरज की रोशनी "}, {t: "spokes", acc: true}, {t: " पर गिरती है"}]},
      {w: 3.3, tokens: [{t: "और "}, {t: "shadow", acc: true}, {t: " से minute तक का time!"}]},
      {w: 2.6, tokens: [{t: "ना "}, {t: "battery", acc: true}, {t: ", ना "}, {t: "electricity", acc: true}]},
      {w: 2.0, tokens: [{t: "सिर्फ़ "}, {t: "SCIENCE", acc: true}, {t: "!"}]},
    ],
  },
  {
    vo: "odisha/vo-04-magnet.mp3",
    durS: 12.53,
    kicker: "मान्यता • जो आज भी debate है",
    tag: "The Floating Idol",
    accent: AMBER,
    head: [
      {parts: [{t: "72 TON का ", acc: true}, {t: "MAGNET?"}]},
      {parts: [{t: "मूर्ति ", acc: false}, {t: "हवा में", acc: true}, {t: " तैरती थी!"}]},
    ],
    stat: ["72 TON MAGNET", "FLOATING IDOL", "LEGEND"],
    captions: [
      {w: 3.4, tokens: [{t: "चोटी पर था "}, {t: "72 TON", acc: true}, {t: " का "}, {t: "MAGNET", acc: true}]},
      {w: 3.0, tokens: [{t: "मूर्ति हवा में "}, {t: "FLOAT", acc: true}, {t: " करती थी!"}]},
      {w: 2.9, tokens: [{t: "Sailors के "}, {t: "COMPASS", acc: true}, {t: " बेकार!"}]},
      {w: 1.8, tokens: [{t: "REAL", acc: true}, {t: " ya "}, {t: "MYTH", acc: true}, {t: "?"}]},
      {w: 2.6, tokens: [{t: "आज भी debate चल रहा है!"}]},
    ],
  },
  {
    vo: "odisha/vo-05-lingaraj.mp3",
    durS: 13.9,
    kicker: "भुवनेश्वर • लिंगराज मंदिर",
    tag: "LINGARAJ • 11th Century",
    accent: AMBER,
    head: [
      {parts: [{t: "180 FT", acc: true}, {t: " ऊँचा…"}]},
      {parts: [{t: "बिना "}, {t: "CRANE", acc: true}, {t: "!"}]},
    ],
    stat: ["11TH CENTURY", "180 FT", "NO CRANE"],
    captions: [
      {w: 3.2, tokens: [{t: "Bhubaneswar का "}, {t: "LINGARAJ", acc: true}, {t: " Temple"}]},
      {w: 3.2, tokens: [{t: "11th सदी में "}, {t: "180 FEET", acc: true}, {t: " ऊँचा!"}]},
      {w: 2.7, tokens: [{t: "बिना "}, {t: "crane", acc: true}, {t: ", बिना "}, {t: "cement", acc: true}, {t: "!"}]},
      {w: 3.1, tokens: [{t: "गीली "}, {t: "brick ramp", acc: true}, {t: " से चढ़ाया!"}]},
      {w: 2.3, tokens: [{t: "PURE", acc: true}, {t: " "}, {t: "ENGINEERING", acc: true}, {t: "!"}]},
    ],
  },
  {
    vo: "odisha/vo-06-ratna.mp3",
    durS: 15.22,
    kicker: "सबसे बड़ा रहस्य • रत्न भंडार",
    tag: "RATNA BHANDAR • Mystery",
    accent: RED,
    head: [
      {parts: [{t: "चाबी खोई है…", acc: false}]},
      {parts: [{t: "1978", acc: true}, {t: " से!"}]},
    ],
    stat: ["SECRET TREASURY", "KEY LOST • 1978", "UNOPENED"],
    captions: [
      {w: 3.6, tokens: [{t: "सबसे बड़ा "}, {t: "MYSTERY", acc: true}, {t: " — "}, {t: "RATNA BHANDAR", acc: true}]},
      {w: 2.7, tokens: [{t: "मंदिर का "}, {t: "SECRET TREASURY", acc: true}]},
      {w: 3.0, tokens: [{t: "चाबी खोई है "}, {t: "1978", acc: true}, {t: " से!"}]},
      {w: 2.7, tokens: [{t: "Scientists", acc: true}, {t: ", "}, {t: "ASI", acc: true}, {t: " — सब हैरान!"}]},
      {w: 3.0, tokens: [{t: "अंदर क्या है? कोई नहीं जानता!"}]},
    ],
  },
  {
    vo: "odisha/vo-07-khandagiri.mp3",
    durS: 13.97,
    kicker: "खंडगिरी-उदयगिरी • खरवेल की गुफाएँ",
    tag: "KHANDAGIRI • 2nd Century BCE",
    accent: AMBER,
    head: [
      {parts: [{t: "चट्टान काटकर", acc: false}, {t: " बना शहर"}]},
      {parts: [{t: "2000", acc: true}, {t: " साल पुराना!"}]},
    ],
    stat: ["2ND C. BCE", "ROCK CUT", "JAIN CAVES"],
    captions: [
      {w: 3.4, tokens: [{t: "राजा "}, {t: "KHARAVELA", acc: true}, {t: " की "}, {t: "caves", acc: true}]},
      {w: 2.9, tokens: [{t: "Jain "}, {t: "MONKS", acc: true}, {t: " यहाँ रहते थे"}]},
      {w: 2.9, tokens: [{t: "ROCK CUT", acc: true}, {t: " architecture!"}]},
      {w: 3.0, tokens: [{t: "बिना machine — सिर्फ़ हथौड़े से!"}]},
      {w: 1.9, tokens: [{t: "MIND", acc: true}, {t: " "}, {t: "BLOWN", acc: true}, {t: "!"}]},
    ],
  },
  {
    vo: "odisha/vo-08-cta.mp3",
    durS: 10.7,
    kicker: "नया चैनल • आपके साथ शुरू",
    tag: "FOLLOW • ANYTHING",
    accent: ORANGE,
    head: [
      {parts: [{t: "FOLLOW", acc: true}, {t: " करो"}]},
      {parts: [{t: "ANYTHING", acc: true}]},
    ],
    captions: [
      {w: 3.2, tokens: [{t: "ये कहानियाँ books में नहीं मिलतीं!"}]},
      {w: 2.7, tokens: [{t: "Hidden "}, {t: "SECRETS", acc: true}, {t: " के लिए —"}]},
      {w: 3.0, tokens: [{t: "follow", acc: true}, {t: " करो "}, {t: "Anything", acc: true}, {t: "!"}]},
      {w: 3.0, tokens: [{t: "अगली कहानी और भी "}, {t: "बड़ी", acc: true}, {t: " है!"}]},
    ],
  },
];

export const SCENE_PAD = 10;
export const SCENE_TAIL = 30;
export const sceneFrames = VOICE_SCENES.map((s, i) =>
  Math.round(s.durS * 30) + (i === VOICE_SCENES.length - 1 ? SCENE_TAIL : SCENE_PAD)
);
export const sceneStarts = sceneFrames.map((_, i) =>
  sceneFrames.slice(0, i).reduce((a, b) => a + b, 0)
);
export const totalFrames = sceneFrames.reduce((a, b) => a + b, 0);

// ───────────────────────── shared pieces ─────────────────────────
const Grain: React.FC = () => (
  <svg width={720} height={1280} viewBox="0 0 720 1280" style={{position: "absolute", opacity: 0.055}}>
    <filter id="grainF">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={720} height={1280} filter="url(#grainF)" />
  </svg>
);

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 86%, rgba(0,0,0,0.65) 100%)",
    }}
  />
);

const SunMark: React.FC<{size?: number; color?: string}> = ({size = 16, color = AMBER}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: "inline-block", verticalAlign: "middle"}}>
    <circle cx={12} cy={12} r={5} fill={color} />
    {Array.from({length: 8}).map((_, i) => {
      const a = (i * Math.PI) / 4;
      return (
        <line
          key={i}
          x1={12 + Math.cos(a) * 7.5}
          y1={12 + Math.sin(a) * 7.5}
          x2={12 + Math.cos(a) * 10.5}
          y2={12 + Math.sin(a) * 10.5}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      );
    })}
  </svg>
);

const FlashCut: React.FC<{accent?: string}> = ({accent = AMBER}) => {
  const frame = useCurrentFrame();
  const o = an(frame, [0, 2, 7], [0.92, 0.5, 0]);
  const o2 = an(frame, [0, 9], [0.5, 0]);
  return (
    <>
      <AbsoluteFill style={{background: CREAM, opacity: o}} />
      <AbsoluteFill style={{background: accent, opacity: o2, mixBlendMode: "screen"}} />
    </>
  );
};

const Header: React.FC<{idx: number; accent: string}> = ({idx, accent}) => {
  const frame = useCurrentFrame();
  const inP = an(frame, [2, 12], [0, 1], SNAP);
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
        opacity: inP,
        transform: `translateY(${(1 - inP) * -14}px)`,
      }}
    >
      <div style={{display: "flex", alignItems: "center", gap: 9, color: MUTED, fontSize: 15, fontWeight: 700, letterSpacing: 3.5}}>
        <SunMark size={15} color={accent} />
        ODISHA × ANCIENT SCIENCE
      </div>
      <div style={{color: accent, fontSize: 15, fontWeight: 700, letterSpacing: 3}}>
        {String(idx + 1).padStart(2, "0")}/{String(VOICE_SCENES.length).padStart(2, "0")}
      </div>
    </div>
  );
};

const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.09)", display: "flex", gap: 2}}>
      {sceneFrames.map((len, i) => {
        const start = sceneStarts[i];
        const local = frame - start;
        const fill = Math.min(1, Math.max(0, local / len));
        return (
          <div key={i} style={{flex: len, position: "relative"}}>
            <div style={{position: "absolute", inset: 0, background: AMBER, width: `${fill * 100}%`}} />
          </div>
        );
      })}
    </div>
  );
};

const Headline: React.FC<{lines: HeadLine[]; accent: string; big?: number; punchAt?: number; center?: boolean; top?: number}> = ({
  lines,
  accent,
  big = 62,
  punchAt = 4,
  center = true,
  top = 172,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 44,
        right: 44,
        textAlign: center ? "center" : "left",
        fontFamily: "OdishaSans",
        fontWeight: 800,
        color: CREAM,
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            fontSize: big,
            lineHeight: 1.22,
            marginTop: li === 0 ? 0 : 6,
            opacity: an(frame, [punchAt + li * 5, punchAt + 11 + li * 5], [0, 1], SNAP),
            transform: `translateY(${an(frame, [punchAt + li * 5, punchAt + 13 + li * 5], [26, 0], SNAP)}px) scale(${an(
              frame,
              [punchAt + li * 5, punchAt + 12 + li * 5],
              [1.06, 1],
              SNAP
            )})`,
          }}
        >
          {line.parts.map((p, pi) => {
            const latin = !hasDeva(p.t);
            return (
              <span
                key={pi}
                style={{
                  color: p.acc ? accent : CREAM,
                  letterSpacing: latin ? 1.5 : 0,
                  WebkitTextStroke: p.acc || latin ? "1.6px currentColor" : undefined,
                }}
              >
                {p.t}
              </span>
            );
          })}
        </div>
      ))}
      <div
        style={{
          width: an(frame, [punchAt + 8, punchAt + 26], [0, 110], SNAP),
          height: 5,
          background: accent,
          margin: center ? "14px auto 0" : "14px 0 0",
          borderRadius: 3,
        }}
      />
    </div>
  );
};

const StatStrip: React.FC<{stats: string[]; accent: string}> = ({stats, accent}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        top: 936,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        gap: 12,
        opacity: an(frame, [16, 28], [0, 1]),
        transform: `translateY(${an(frame, [16, 28], [14, 0], SNAP)}px)`,
      }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            padding: "13px 6px",
            borderRadius: 14,
            background: PANEL,
            border: "1px solid rgba(244,236,221,0.14)",
            textAlign: "center",
            color: i === 0 ? accent : CREAM,
            fontSize: 15.5,
            fontWeight: 700,
            letterSpacing: 1.2,
            opacity: an(frame, [18 + i * 4, 30 + i * 4], [0, 1]),
            transform: `translateY(${an(frame, [18 + i * 4, 30 + i * 4], [10, 0], SNAP)}px)`,
          }}
        >
          {s}
        </div>
      ))}
    </div>
  );
};

const Captions: React.FC<{chunks: CaptionChunk[]; voFrames: number; accent: string}> = ({
  chunks,
  voFrames,
  accent,
}) => {
  const frame = useCurrentFrame();
  const startF = 6;
  const usable = Math.max(60, voFrames - startF - 8);
  const totalW = chunks.reduce((a, c) => a + c.w, 0);
  const lens = chunks.map((c) => Math.max(16, Math.round((usable * c.w) / totalW)));
  const starts: number[] = [];
  let acc = startF;
  for (const l of lens) {
    starts.push(acc);
    acc += l;
  }
  let idx = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (frame >= starts[i]) idx = i;
  }
  const chunk = chunks[idx];
  const local = frame - starts[idx];
  const pop = an(local, [0, 7], [0, 1], SNAP);
  return (
    <div style={{position: "absolute", left: 36, right: 36, bottom: 218, display: "flex", justifyContent: "center"}}>
      <div
        key={idx}
        style={{
          maxWidth: 640,
          background: "rgba(9,7,13,0.78)",
          border: "1px solid rgba(244,236,221,0.12)",
          borderRadius: 18,
          padding: "16px 26px",
          textAlign: "center",
          fontFamily: "OdishaSans",
          fontWeight: 800,
          fontSize: 31,
          lineHeight: 1.42,
          color: CREAM,
          opacity: pop,
          transform: `translateY(${(1 - pop) * 20}px) scale(${0.97 + pop * 0.03})`,
          boxShadow: "0 10px 34px rgba(0,0,0,0.45)",
        }}
      >
        {chunk.tokens.map((tk, i) => (
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

const BrandFoot: React.FC<{accent: string}> = ({accent}) => {
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
      ANYTHING • <span style={{color: accent}}>FOLLOW करना मत भूलना</span>
    </div>
  );
};

const SceneShell: React.FC<{
  idx: number;
  accent: string;
  glow: string;
  children: React.ReactNode;
  vo: string;
  voFrames: number;
  captions: CaptionChunk[];
  showBrandFoot?: boolean;
}> = ({idx, accent, glow, children, vo, voFrames, captions, showBrandFoot = true}) => {
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <AbsoluteFill style={{background: glow}} />
      <FlashCut accent={accent} />
      <Header idx={idx} accent={accent} />
      <Progress />
      <Vignette />
      {children}
      <StatWrap idx={idx} accent={accent} />
      <Captions chunks={captions} voFrames={voFrames} accent={accent} />
      <Grain />
      {showBrandFoot ? <BrandFoot accent={accent} /> : null}
      <Audio src={staticFile(vo)} />
    </AbsoluteFill>
  );
};

const StatWrap: React.FC<{idx: number; accent: string}> = ({idx, accent}) => {
  const s = VOICE_SCENES[idx];
  return s.stat ? <StatStrip stats={s.stat} accent={accent} /> : null;
};

// ───────────────────────── vector art ─────────────────────────
const Wheel: React.FC<{size: number; accent?: string; spin?: number}> = ({size, accent = AMBER, spin = 0}) => {
  const spokes = Array.from({length: 8});
  const beads = Array.from({length: 24});
  return (
    <svg width={size} height={size} viewBox="0 0 480 480" style={{transform: `rotate(${spin}deg)`}}>
      <circle cx={240} cy={240} r={218} fill="none" stroke={accent} strokeWidth={13} />
      <circle cx={240} cy={240} r={192} fill="none" stroke={accent} strokeWidth={4} opacity={0.8} />
      <circle cx={240} cy={240} r={172} fill="none" stroke={accent} strokeWidth={2} opacity={0.45} />
      {beads.map((_, i) => {
        const a = (i * Math.PI * 2) / 24;
        return <circle key={i} cx={240 + Math.cos(a) * 205} cy={240 + Math.sin(a) * 205} r={5} fill={GOLD} opacity={0.9} />;
      })}
      {spokes.map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x = 240 + Math.cos(a) * 170;
        const y = 240 + Math.sin(a) * 170;
        return <line key={i} x1={240} y1={240} x2={x} y2={y} stroke={accent} strokeWidth={15} strokeLinecap="round" />;
      })}
      {spokes.map((_, i) => {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        const x = 240 + Math.cos(a) * 165;
        const y = 240 + Math.sin(a) * 165;
        return <line key={i} x1={240} y1={240} x2={x} y2={y} stroke={accent} strokeWidth={5} opacity={0.65} strokeLinecap="round" />;
      })}
      <circle cx={240} cy={240} r={40} fill={PANEL} stroke={accent} strokeWidth={7} />
      <circle cx={240} cy={240} r={13} fill={GOLD} />
      {spokes.map((_, i) => {
        const a = (i * Math.PI) / 4;
        return <circle key={i} cx={240 + Math.cos(a) * 27} cy={240 + Math.sin(a) * 27} r={4.5} fill={accent} />;
      })}
    </svg>
  );
};

const TempleChariot: React.FC<{accent?: string; opacity?: number}> = ({accent = AMBER, opacity = 1}) => {
  const tiers = [350, 306, 264, 224, 186, 150];
  const wheel = (cx: number, cy: number, r: number, key: number) => (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={accent} strokeWidth={7} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke={accent} strokeWidth={2.5} opacity={0.7} />
      {Array.from({length: 8}).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + Math.cos(a) * r}
            y2={cy + Math.sin(a) * r}
            stroke={accent}
            strokeWidth={4.5}
            opacity={0.85}
          />
        );
      })}
    </g>
  );
  return (
    <svg width={560} height={470} viewBox="0 0 560 470" style={{opacity}}>
      {/* sun behind */}
      <circle cx={430} cy={110} r={64} fill={ORANGE} opacity={0.9} />
      {Array.from({length: 12}).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line
            key={i}
            x1={430 + Math.cos(a) * 74}
            y1={110 + Math.sin(a) * 74}
            x2={430 + Math.cos(a) * 96}
            y2={110 + Math.sin(a) * 96}
            stroke={ORANGE}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
      {/* platform */}
      <rect x={62} y={352} width={436} height={34} rx={7} fill={PANEL} stroke={accent} strokeWidth={3} />
      <rect x={100} y={388} width={360} height={20} rx={5} fill={PANEL} stroke={accent} strokeWidth={2.5} />
      <rect x={132} y={410} width={296} height={18} rx={5} fill={PANEL} stroke={accent} strokeWidth={2.5} />
      {/* chamber */}
      <rect x={108} y={238} width={344} height={114} fill={PANEL} stroke={accent} strokeWidth={3} />
      {/* door */}
      <path d="M250 352 v-58 a30 30 0 0 1 60 0 v58 z" fill={BG} stroke={GOLD} strokeWidth={3} />
      {/* tower tiers */}
      {tiers.map((w, i) => {
        const y = 238 - (i + 1) * 32;
        const x = 280 - w / 2;
        return <rect key={i} x={x} y={y} width={w} height={30} rx={4} fill={PANEL} stroke={accent} strokeWidth={2.5} />;
      })}
      {/* finial */}
      <rect x={262} y={28} width={36} height={14} rx={3} fill={GOLD} />
      <circle cx={280} cy={16} r={9} fill={GOLD} />
      {/* wheels */}
      {wheel(160, 300, 52, 1)}
      {wheel(280, 300, 52, 2)}
      {wheel(400, 300, 52, 3)}
    </svg>
  );
};

const SunDialArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const p = an(frame, [8, 150], [0.03, 0.97]);
  const a = Math.PI * (1 - p); // π (left horizon) -> 0 (right horizon)
  const sunX = 240 + Math.cos(a) * 300;
  const sunY = 340 - Math.sin(a) * 300;
  const shX = -Math.cos(a) * 168; // shadow mirrors the sun
  const shY = Math.sin(a) * 168;
  const timeLabel = ["6 AM", "9 AM", "12 PM", "3 PM", "6 PM"];
  return (
    <div style={{position: "relative", width: 480, height: 480}}>
      <svg width={480} height={480} viewBox="0 0 480 480" style={{position: "absolute", top: 0, left: 0}}>
        {/* sun path arc */}
        <path d="M-70 340 A 310 310 0 0 1 550 340" fill="none" stroke={accent} strokeWidth={2.5} strokeDasharray="4 12" opacity={0.55} />
        {timeLabel.map((t, i) => {
          const la = Math.PI - (i * Math.PI) / 4;
          const x = 240 + Math.cos(la) * 322;
          const y = 340 - Math.sin(la) * 322;
          return (
            <text key={i} x={x} y={y + 6} fill={MUTED} fontSize={17} fontWeight={700} textAnchor="middle" fontFamily="OdishaSans">
              {t}
            </text>
          );
        })}
        {/* light beam */}
        <line x1={sunX} y1={sunY} x2={240} y2={340} stroke={GOLD} strokeWidth={3} opacity={0.5} strokeDasharray="3 8" />
        {/* shadow needle */}
        <line x1={240} y1={340} x2={240 + shX} y2={340 + shY} stroke={CREAM} strokeWidth={7} strokeLinecap="round" opacity={0.92} />
        <circle cx={240 + shX} cy={340 + shY} r={9} fill={CREAM} opacity={0.95} />
        {/* sun */}
        <circle cx={sunX} cy={sunY} r={26} fill={ORANGE} />
        {Array.from({length: 10}).map((_, i) => {
          const ra = (i * Math.PI) / 5 + frame / 90;
          return (
            <line
              key={i}
              x1={sunX + Math.cos(ra) * 32}
              y1={sunY + Math.sin(ra) * 32}
              x2={sunX + Math.cos(ra) * 44}
              y2={sunY + Math.sin(ra) * 44}
              stroke={ORANGE}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div style={{position: "absolute", top: 100, left: 0}}>
        <Wheel size={480} accent={accent} />
      </div>
    </div>
  );
};

const MagnetArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const floatY = Math.sin(frame / 13) * 13;
  const wob = Math.sin(frame / 9) * 9 + Math.sin(frame / 23) * 4;
  return (
    <svg width={520} height={520} viewBox="0 0 520 520">
      {/* field arcs */}
      {[130, 170, 210].map((r, i) => (
        <ellipse key={i} cx={260} cy={250} rx={r} ry={r * 0.62} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="3 10" opacity={0.4 - i * 0.09} />
      ))}
      {/* floating idol */}
      <g transform={`translate(0 ${floatY})`}>
        <circle cx={260} cy={158} r={26} fill={PANEL} stroke={GOLD} strokeWidth={3} />
        <path
          d="M260 192 c-52 0 -70 62 -70 104 h140 c0 -42 -18 -104 -70 -104 z"
          fill={PANEL}
          stroke={GOLD}
          strokeWidth={3}
        />
        {/* halo */}
        <circle cx={260} cy={150} r={44} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeDasharray="2 7" opacity={0.8} />
        {/* glow under idol */}
        <ellipse cx={260} cy={318} rx={54} ry={9} fill={ORANGE} opacity={0.28} />
      </g>
      {/* magnet */}
      <path
        d="M148 330 v-118 a112 112 0 0 1 224 0 v118"
        fill="none"
        stroke={RED}
        strokeWidth={44}
        strokeLinecap="butt"
        opacity={0.92}
      />
      <rect x={124} y={326} width={48} height={44} rx={6} fill={CREAM} />
      <rect x={348} y={326} width={48} height={44} rx={6} fill={RED} />
      <text x={148} y={356} fill={BG} fontSize={26} fontWeight={900} textAnchor="middle" fontFamily="OdishaSans">
        S
      </text>
      <text x={372} y={356} fill={CREAM} fontSize={26} fontWeight={900} textAnchor="middle" fontFamily="OdishaSans">
        N
      </text>
      {/* compass */}
      <g transform="translate(428 452)">
        <circle r={56} fill={PANEL} stroke={CREAM} strokeWidth={3} />
        <g transform={`rotate(${wob})`}>
          <polygon points="0,-40 10,0 0,8 -10,0" fill={RED} />
          <polygon points="0,40 10,0 0,-8 -10,0" fill={CREAM} opacity={0.85} />
        </g>
        <text y={-42} fill={MUTED} fontSize={16} fontWeight={800} textAnchor="middle" fontFamily="OdishaSans">
          N
        </text>
      </g>
      {/* 72 TON tag */}
      <g transform="translate(76 452)">
        <rect x={-66} y={-30} width={132} height={54} rx={12} fill={PANEL} stroke={accent} strokeWidth={2.5} />
        <text y={6} fill={accent} fontSize={24} fontWeight={900} textAnchor="middle" fontFamily="OdishaSans" letterSpacing={2}>
          72 TON
        </text>
      </g>
    </svg>
  );
};

const DeulArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const build = an(frame, [10, 120], [0, 1], SNAP);
  const H = 400;
  const bricks = Array.from({length: 14});
  const rampDots = [0, 1, 2].map((i) => ((frame + i * 26) % 78) / 78);
  return (
    <svg width={520} height={560} viewBox="0 0 520 560">
      <defs>
        <clipPath id="deulClip">
          <rect x={0} y={480 - H * build} width={520} height={H * build + 4} />
        </clipPath>
      </defs>
      {/* measure line */}
      <g opacity={an(frame, [24, 40], [0, 1])}>
        <line x1={452} y1={80} x2={452} y2={480} stroke={MUTED} strokeWidth={2.5} />
        {[80, 155, 230, 305, 380, 455].map((y, i) => (
          <line key={i} x1={442} y1={y} x2={462} y2={y} stroke={MUTED} strokeWidth={2.5} />
        ))}
        <text x={430} y={72} fill={accent} fontSize={22} fontWeight={900} textAnchor="end" fontFamily="OdishaSans" letterSpacing={2}>
          180 FT
        </text>
      </g>
      {/* ramp */}
      <line x1={74} y1={490} x2={216} y2={252} stroke={MUTED} strokeWidth={5} opacity={0.55} />
      {rampDots.map((p, i) => {
        const x = 74 + (216 - 74) * p;
        const y = 490 + (252 - 490) * p;
        return <rect key={i} x={x - 9} y={y - 9} width={18} height={12} rx={2} fill={GOLD} opacity={0.85} transform={`rotate(${35} ${x} ${y})`} />;
      })}
      {/* tower */}
      <g clipPath="url(#deulClip)">
        <path
          d="M160 480 C 170 400 180 340 204 268 C 222 210 236 150 244 96 L 276 96 C 284 150 298 210 316 268 C 340 340 350 400 360 480 Z"
          fill={PANEL}
          stroke={accent}
          strokeWidth={4}
        />
        {/* vertical pagas (ribs) */}
        <path d="M206 470 C 216 380 232 300 250 108" fill="none" stroke={accent} strokeWidth={2} opacity={0.6} />
        <path d="M314 470 C 304 380 288 300 270 108" fill="none" stroke={accent} strokeWidth={2} opacity={0.6} />
        <path d="M260 470 L 260 100" fill="none" stroke={accent} strokeWidth={2} opacity={0.35} />
        {/* brick courses */}
        {bricks.map((_, i) => (
          <line key={i} x1={168} y1={110 + i * 26} x2={352} y2={110 + i * 26} stroke={accent} strokeWidth={1.6} opacity={0.32} />
        ))}
        {/* door */}
        <path d="M238 480 v-64 a22 22 0 0 1 44 0 v64 z" fill={BG} stroke={GOLD} strokeWidth={3} />
      </g>
      {/* amalaka + kalasha (appear after build) */}
      <g opacity={an(frame, [118, 132], [0, 1], SNAP)}>
        <ellipse cx={260} cy={92} rx={44} ry={13} fill={PANEL} stroke={accent} strokeWidth={3} />
        <circle cx={260} cy={64} r={11} fill={GOLD} />
        <line x1={260} y1={78} x2={260} y2={86} stroke={GOLD} strokeWidth={4} />
      </g>
      {/* ground */}
      <line x1={60} y1={482} x2={470} y2={482} stroke={accent} strokeWidth={4} />
    </svg>
  );
};

const VaultArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const stamp = an(frame, [150, 156], [0, 1], SNAP);
  const glowPulse = 0.5 + Math.sin(frame / 10) * 0.2;
  return (
    <svg width={520} height={560} viewBox="0 0 520 560">
      <defs>
        <radialGradient id="vaultGlow">
          <stop offset="0%" stopColor={RED} stopOpacity={0.55 * glowPulse} />
          <stop offset="100%" stopColor={RED} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={260} cy={290} r={210} fill="url(#vaultGlow)" />
      {/* door frame */}
      <path d="M132 520 v-300 a128 128 0 0 1 256 0 v300 z" fill={PANEL} stroke={accent} strokeWidth={5} />
      <path d="M156 520 v-282 a104 104 0 0 1 208 0 v282 z" fill={BG} stroke={accent} strokeWidth={3} opacity={0.9} />
      {/* panel lines */}
      <line x1={260} y1={236} x2={260} y2={520} stroke={accent} strokeWidth={2.4} opacity={0.5} />
      <line x1={168} y1={330} x2={352} y2={330} stroke={accent} strokeWidth={2.4} opacity={0.5} />
      <line x1={168} y1={430} x2={352} y2={430} stroke={accent} strokeWidth={2.4} opacity={0.5} />
      {/* chains */}
      <g opacity={0.85}>
        <line x1={150} y1={300} x2={370} y2={352} stroke={MUTED} strokeWidth={6} strokeLinecap="round" />
        {[0.15, 0.35, 0.55, 0.75].map((p, i) => (
          <circle key={i} cx={150 + (370 - 150) * p} cy={300 + (352 - 300) * p} r={9} fill={BG} stroke={MUTED} strokeWidth={3.5} />
        ))}
      </g>
      {/* central lock */}
      <circle cx={260} cy={330} r={62} fill={PANEL} stroke={GOLD} strokeWidth={5} />
      <circle cx={260} cy={318} r={16} fill={BG} stroke={GOLD} strokeWidth={4} />
      <path d="M260 330 l14 34 h-28 z" fill={GOLD} />
      {/* question marks drifting */}
      {[
        {x: 96, y: 150, s: 46, d: 0},
        {x: 420, y: 120, s: 34, d: 12},
        {x: 448, y: 260, s: 28, d: 22},
      ].map((q, i) => {
        const dy = Math.sin(frame / 22 + q.d) * 12;
        const o = 0.55 + Math.sin(frame / 16 + q.d) * 0.3;
        return (
          <text key={i} x={q.x} y={q.y + dy} fill={RED} fontSize={q.s} fontWeight={900} textAnchor="middle" opacity={o} fontFamily="OdishaSans">
            ?
          </text>
        );
      })}
      {/* 1978 stamp */}
      <g transform="rotate(-11 260 470)" opacity={stamp}>
        <rect x={158} y={440} width={204} height={64} rx={10} fill="none" stroke={RED} strokeWidth={5} opacity={0.9} />
        <text x={260} y={484} fill={RED} fontSize={38} fontWeight={900} textAnchor="middle" fontFamily="OdishaSans" letterSpacing={6}>
          1978
        </text>
      </g>
    </svg>
  );
};

const CavesArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const strikes = [30, 62, 94, 126];
  const near = strikes.reduce((best, s) => {
    const d = Math.abs(frame - s);
    return d < best.d ? {d, s} : best;
  }, {d: 999, s: 0});
  const spark = near.d <= 5;
  const chiselShake = spark ? Math.sin(frame * 3) * 3 : 0;
  return (
    <svg width={560} height={500} viewBox="0 0 560 500">
      {/* hill */}
      <path d="M20 470 Q 280 40 540 470 Z" fill={PANEL} stroke={accent} strokeWidth={4} />
      {/* caves */}
      <path d="M212 470 v-96 a68 68 0 0 1 136 0 v96 z" fill={BG} stroke={accent} strokeWidth={3} />
      <path d="M108 470 v-64 a40 40 0 0 1 80 0 v64 z" fill={BG} stroke={accent} strokeWidth={2.5} />
      <path d="M372 470 v-52 a34 34 0 0 1 68 0 v52 z" fill={BG} stroke={accent} strokeWidth={2.5} />
      {/* monk silhouette */}
      <g opacity={0.95}>
        <circle cx={280} cy={392} r={15} fill={GOLD} />
        <path d="M280 410 c-26 0 -34 34 -34 60 h68 c0 -26 -8 -60 -34 -60 z" fill={GOLD} />
      </g>
      {/* chisel + hand from corner */}
      <g transform={`translate(${chiselShake} ${chiselShake})`}>
        <line x1={470} y1={150} x2={352} y2={292} stroke={CREAM} strokeWidth={9} strokeLinecap="round" />
        <line x1={470} y1={150} x2={500} y2={118} stroke={CREAM} strokeWidth={16} strokeLinecap="round" opacity={0.85} />
        {spark ? (
          <g>
            {[0, 1, 2, 3, 4].map((i) => {
              const a = Math.PI * 0.75 + (i - 2) * 0.3;
              const r = 20 + i * 9;
              return (
                <circle key={i} cx={352 + Math.cos(a) * r} cy={292 - Math.sin(a) * r * 0.7} r={3.5 + (5 - near.d)} fill={GOLD} opacity={0.9 - near.d * 0.15} />
              );
            })}
          </g>
        ) : null}
      </g>
      {/* inscription marks */}
      {[130, 160, 190].map((y, i) => (
        <line key={i} x1={70} y1={y} x2={120} y2={y} stroke={accent} strokeWidth={3} opacity={0.5} strokeLinecap="round" />
      ))}
      {/* stars */}
      {[[60, 80], [500, 60], [520, 140]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={GOLD} opacity={0.6 + Math.sin(frame / 8 + i * 2) * 0.3} />
      ))}
    </svg>
  );
};

const CtaArt: React.FC<{accent: string}> = ({accent}) => {
  const frame = useCurrentFrame();
  const followed = frame > 74;
  const press = frame > 70 && frame < 78 ? 0.9 : 1;
  const icons = [
    {x: 96, delay: 20, type: "heart"},
    {x: 620, delay: 44, type: "comment"},
    {x: 560, delay: 70, type: "share"},
    {x: 140, delay: 92, type: "heart"},
  ];
  const icon = (type: string, color: string) => {
    if (type === "heart")
      return <path d="M0 -14 C -4 -26 -24 -26 -24 -8 C -24 6 -8 16 0 24 C 8 16 24 6 24 -8 C 24 -26 4 -26 0 -14 Z" fill={color} />;
    if (type === "comment")
      return (
        <g>
          <rect x={-26} y={-22} width={52} height={38} rx={12} fill={color} />
          <path d="M-6 16 L 0 30 L 10 16 Z" fill={color} />
        </g>
      );
    return (
      <g>
        <path d="M-22 -2 L 6 -2 M 6 -2 L -4 -12 M 6 -2 L -4 8" stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x={-26} y={-20} width={16} height={12} rx={3} fill={color} />
      </g>
    );
  };
  return (
    <div style={{position: "relative", width: 720, height: 620}}>
      {/* wordmark */}
      <svg width={720} height={200} viewBox="0 0 720 200" style={{position: "absolute", top: 8, left: 0}}>
        <defs>
          <linearGradient id="ctaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="50%" stopColor={ORANGE} />
            <stop offset="100%" stopColor={RED} />
          </linearGradient>
        </defs>
        <text
          x={360}
          y={120}
          textAnchor="middle"
          fontFamily="OdishaSerif"
          fontSize={104}
          fontWeight={900}
          fill="url(#ctaGrad)"
          stroke={CREAM}
          strokeWidth={2}
        >
          Anything
        </text>
        <text x={360} y={168} textAnchor="middle" fontFamily="OdishaSans" fontSize={22} fontWeight={700} fill={MUTED} letterSpacing={8}>
          ANCIENT SCIENCE • EVERY WEEK
        </text>
      </svg>
      {/* follow button */}
      <div
        style={{
          position: "absolute",
          top: 250,
          left: 210,
          width: 300,
          height: 92,
          transform: `scale(${press})`,
        }}
      >
        {[0, 1].map((i) => {
          const p = ((frame + i * 26) % 52) / 52;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 26,
                border: `3px solid ${followed ? AMBER : ORANGE}`,
                transform: `scale(${1 + p * 0.35})`,
                opacity: (1 - p) * 0.6,
              }}
            />
          );
        })}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 26,
            background: followed ? AMBER : "linear-gradient(120deg, #FF6B1A, #FF9A1A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: followed ? BG : CREAM,
            fontFamily: "OdishaSans",
            fontWeight: 900,
            fontSize: 34,
            letterSpacing: 3,
            boxShadow: "0 14px 40px rgba(255,107,26,0.35)",
          }}
        >
          {followed ? "✓ FOLLOWING" : "+ FOLLOW"}
        </div>
      </div>
      {/* next-up line with flame */}
      <div style={{position: "absolute", top: 396, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 12}}>
        <svg width={30} height={40} viewBox="0 0 30 40">
          <path
            d="M15 2 C 18 10 26 14 26 24 C 26 33 21 38 15 38 C 9 38 4 33 4 24 C 4 18 8 16 10 10 C 12 16 14 16 15 12 C 16 9 14 5 15 2 Z"
            fill={ORANGE}
            opacity={0.95}
          />
        </svg>
        <div style={{fontFamily: "OdishaSans", fontSize: 30, fontWeight: 800, color: CREAM}}>
          अगली कहानी और भी <span style={{color: accent}}>बड़ी</span> है
        </div>
      </div>
      {/* floating engagement icons */}
      {icons.map((ic, i) => {
        const t = ((frame - ic.delay) % 96) / 96;
        if (t < 0) return null;
        const y = 560 - t * 360;
        const x = ic.x + Math.sin((frame + i * 40) / 20) * 22;
        const o = t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) * 6.6 : 1;
        return (
          <div key={i} style={{position: "absolute", left: x - 26, top: y - 26, opacity: o * 0.9}}>
            {icon(ic.type, i % 2 ? AMBER : RED)}
          </div>
        );
      })}
      {/* confetti */}
      {Array.from({length: 26}).map((_, i) => {
        const seed = String(i);
        const t = ((frame + random(seed) * 90) % 100) / 100;
        const x = 40 + random(seed + "x") * 640;
        const y = -20 + t * 680;
        const rot = (frame + random(seed + "r") * 360) * (random(seed + "d") > 0.5 ? 1 : -1);
        const o = t > 0.9 ? (1 - t) * 10 : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 9,
              height: 13,
              borderRadius: 2,
              background: [AMBER, ORANGE, GOLD, RED, CREAM][i % 5],
              transform: `rotate(${rot}deg)`,
              opacity: o * 0.8,
            }}
          />
        );
      })}
    </div>
  );
};

// ───────────────────────── scenes ─────────────────────────
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = VOICE_SCENES[0];
  const accent = s.accent;
  const stampIn = an(frame, [0, 3, 8, 14], [1.5, 1.5, 0.98, 1], SNAP);
  const stampOut = an(frame, [76, 88], [1, 0]);
  const subIn = an(frame, [88, 98], [0, 1], SNAP);
  const artIn = an(frame, [10, 34], [0, 1], SNAP);
  const artScale = 1.12 - an(frame, [10, 120], [0, 0.12]) - an(frame, [104, 130], [0, 0.1]);
  const glow = "radial-gradient(ellipse at 50% 30%, rgba(255,107,26,0.22) 0%, rgba(13,10,18,0) 60%)";
  return (
    <SceneShell idx={0} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <div style={{position: "absolute", top: 150, left: 0, right: 0, textAlign: "center"}}>
        {stampOut > 0.02 ? (
          <div
            style={{
              fontFamily: "OdishaSans",
              fontSize: 168,
              fontWeight: 900,
              color: CREAM,
              WebkitTextStroke: `4px ${accent}`,
              opacity: stampOut,
              transform: `scale(${stampIn}) rotate(${an(frame, [0, 10], [-6, -2], SNAP)}deg)`,
            }}
          >
            रुको!
          </div>
        ) : (
          <div
            style={{
              fontFamily: "OdishaSans",
              fontSize: 58,
              fontWeight: 900,
              color: CREAM,
              opacity: subIn,
              transform: `translateY(${(1 - subIn) * 30}px)`,
            }}
          >
            ओडिशा की <span style={{color: accent}}>ANCIENT SCIENCE</span>
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: 330,
          left: 80,
          opacity: artIn,
          transform: `scale(${artScale}) translateY(${(1 - artIn) * 60}px)`,
        }}
      >
        <TempleChariot accent={accent} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 842,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "OdishaSans",
          fontWeight: 800,
          fontSize: 34,
          color: CREAM,
          opacity: an(frame, [46, 60], [0, 1]),
          transform: `translateY(${an(frame, [46, 60], [18, 0], SNAP)}px)`,
        }}
      >
        ये मंदिर है… एक <span style={{color: accent}}>MACHINE</span>
      </div>
    </SceneShell>
  );
};

const KonarkScene: React.FC = () => {
  const frame = useCurrentFrame();
  const s = VOICE_SCENES[1];
  const accent = s.accent;
  const count = Math.round(an(frame, [26, 78], [0, 24], SNAP));
  const artIn = an(frame, [6, 26], [0, 1], SNAP);
  const artScale = 1.14 - an(frame, [6, 110], [0, 0.14]);
  const glow = "radial-gradient(ellipse at 50% 34%, rgba(255,176,58,0.20) 0%, rgba(13,10,18,0) 62%)";
  return (
    <SceneShell idx={1} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={58} />
      <div style={{position: "absolute", top: 350, left: 130, opacity: artIn, transform: `scale(${artScale}) translateY(${(1 - artIn) * 50}px)`}}>
        <Wheel size={460} accent={accent} spin={frame * 0.7} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 512,
          left: 236,
          width: 248,
          height: 120,
          borderRadius: 28,
          background: "rgba(13,10,18,0.88)",
          border: `2.5px solid ${accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: an(frame, [26, 40], [0, 1]),
          transform: `scale(${an(frame, [26, 44], [0.7, 1], SNAP)}) rotate(-4deg)`,
        }}
      >
        <span
          style={{
            fontFamily: "OdishaSans",
            fontWeight: 900,
            fontSize: 74,
            color: GOLD,
            letterSpacing: 2,
          }}
        >
          {count}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 826,
          left: 0,
          right: 0,
          textAlign: "center",
          color: MUTED,
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: 4,
          opacity: an(frame, [40, 54], [0, 1]),
        }}
      >
        CARVED STONE WHEELS • 8 SPOKES EACH
      </div>
    </SceneShell>
  );
};

const SunDialScene: React.FC = () => {
  const s = VOICE_SCENES[2];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 30%, rgba(255,217,138,0.16) 0%, rgba(13,10,18,0) 60%)";
  return (
    <SceneShell idx={2} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={58} />
      <div style={{position: "absolute", top: 356, left: 80}}>
        <SunDialArt accent={accent} />
      </div>
    </SceneShell>
  );
};

const MagnetScene: React.FC = () => {
  const s = VOICE_SCENES[3];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 36%, rgba(255,77,94,0.14) 0%, rgba(13,10,18,0) 62%)";
  return (
    <SceneShell idx={3} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={58} />
      <div style={{position: "absolute", top: 340, left: 100}}>
        <MagnetArt accent={accent} />
      </div>
    </SceneShell>
  );
};

const DeulScene: React.FC = () => {
  const s = VOICE_SCENES[4];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 34%, rgba(255,176,58,0.18) 0%, rgba(13,10,18,0) 62%)";
  return (
    <SceneShell idx={4} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={58} />
      <div style={{position: "absolute", top: 320, left: 100}}>
        <DeulArt accent={accent} />
      </div>
    </SceneShell>
  );
};

const VaultScene: React.FC = () => {
  const s = VOICE_SCENES[5];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 34%, rgba(255,77,94,0.20) 0%, rgba(13,10,18,0) 62%)";
  return (
    <SceneShell idx={5} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={58} />
      <div style={{position: "absolute", top: 316, left: 100}}>
        <VaultArt accent={accent} />
      </div>
    </SceneShell>
  );
};

const CavesScene: React.FC = () => {
  const s = VOICE_SCENES[6];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 36%, rgba(255,176,58,0.16) 0%, rgba(13,10,18,0) 62%)";
  return (
    <SceneShell idx={6} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={56} />
      <div style={{position: "absolute", top: 340, left: 80}}>
        <CavesArt accent={accent} />
      </div>
    </SceneShell>
  );
};

const CtaScene: React.FC = () => {
  const s = VOICE_SCENES[7];
  const accent = s.accent;
  const glow = "radial-gradient(ellipse at 50% 40%, rgba(255,107,26,0.24) 0%, rgba(13,10,18,0) 64%)";
  return (
    <SceneShell idx={7} accent={accent} glow={glow} vo={s.vo} voFrames={Math.round(s.durS * 30)} captions={s.captions} showBrandFoot={false}>
      <Kicker text={s.kicker} accent={accent} />
      <Headline lines={s.head} accent={accent} big={64} punchAt={6} />
      <div style={{position: "absolute", top: 396, left: 0}}>
        <CtaArt accent={accent} />
      </div>
    </SceneShell>
  );
};

// ───────────────────────── root composition ─────────────────────────
const SCENE_COMPONENTS = [
  HookScene,
  KonarkScene,
  SunDialScene,
  MagnetScene,
  DeulScene,
  VaultScene,
  CavesScene,
  CtaScene,
];

export const OdishaAncientScience: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Odisha fonts"));
  useEffect(() => {
    const sans = new FontFace("OdishaSans", `url(${staticFile("NotoSansDevanagari.ttf")})`);
    const serif = new FontFace("OdishaSerif", `url(${staticFile("NotoSerifDevanagari.ttf")})`);
    Promise.all([sans.load(), serif.load()])
      .then((loaded) => {
        loaded.forEach((f) => document.fonts.add(f));
        continueRender(handle);
      })
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);

  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: "OdishaSans"}}>
      <Audio src={staticFile("odisha/bed.mp3")} volume={0.8} />
      {VOICE_SCENES.map((s, i) => {
        const Comp = SCENE_COMPONENTS[i];
        return (
          <Sequence
            key={i}
            from={sceneStarts[i]}
            durationInFrames={sceneFrames[i]}
            name={`${String(i + 1).padStart(2, "0")} · ${s.tag}`}
          >
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
