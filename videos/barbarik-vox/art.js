/* Barbarik (Vox-style explainer) — vector art.
 *
 * Every builder returns { root, update(local, p) }. `local` is seconds since the
 * scene started, `p` is 0..1 through the scene. Nothing here reads the clock,
 * so window.seek(t) stays reproducible.
 */
window.Art = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const GOLD = "#D4AF37";
  const GOLD_LIGHT = "#F0D68F";
  const CRIMSON = "#E50914";
  const BONE = "#F5F5F0";

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const rand = (seed) => {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  function el(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      node.setAttribute(k, String(v));
    }
    return node;
  }

  function svg() {
    return el("svg", { viewBox: "0 0 1080 1920", width: 1080, height: 1920 });
  }

  function lin(id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
    const g = el("linearGradient", { id, x1, y1, x2, y2 });
    stops.forEach(([offset, color, opacity = 1]) =>
      g.appendChild(el("stop", { offset, "stop-color": color, "stop-opacity": opacity }))
    );
    return g;
  }

  function rad(id, stops, cx = "50%", cy = "50%", r = "50%") {
    const g = el("radialGradient", { id, cx, cy, r });
    stops.forEach(([offset, color, opacity = 1]) =>
      g.appendChild(el("stop", { offset, "stop-color": color, "stop-opacity": opacity }))
    );
    return g;
  }

  /* ---------------------------------------------------------------- figures */

  /** Warrior meditating, cross-legged, front view. Origin = base of the figure. */
  function meditatingFigure(color = "#060607", rim = GOLD) {
    const g = el("g");
    g.appendChild(el("circle", { cx: 0, cy: -70, r: 176, fill: "none", stroke: rim, "stroke-width": 1, "stroke-opacity": 0.14 }));
    g.appendChild(el("circle", { cx: 0, cy: -70, r: 132, fill: "none", stroke: rim, "stroke-width": 1.4, "stroke-opacity": 0.3 }));
    /* crossed legs */
    g.appendChild(
      el("path", {
        d: "M -118 10 Q -128 -18 -96 -32 L -58 -40 Q -30 -8 0 -8 Q 30 -8 58 -40 L 96 -32 Q 128 -18 118 10 Q 88 40 0 40 Q -88 40 -118 10 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.6,
        "stroke-opacity": 0.55,
      })
    );
    /* torso */
    g.appendChild(
      el("path", {
        d: "M -52 -34 Q -66 -84 -44 -116 L 44 -116 Q 66 -84 52 -34 Q 24 -20 0 -20 Q -24 -20 -52 -34 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.6,
        "stroke-opacity": 0.55,
      })
    );
    /* arms resting into dhyana mudra */
    g.appendChild(
      el("path", {
        d: "M -46 -94 Q -50 -42 -14 -32 Q 0 -26 14 -32 Q 50 -42 46 -94",
        fill: "none",
        stroke: rim,
        "stroke-width": 3,
        "stroke-opacity": 0.32,
      })
    );
    /* head + ushnisha */
    g.appendChild(el("circle", { cx: 0, cy: -146, r: 27, fill: color, stroke: rim, "stroke-width": 1.6, "stroke-opacity": 0.6 }));
    g.appendChild(el("path", { d: "M -10 -172 Q 0 -183 10 -172 Q 0 -165 -10 -172 Z", fill: color, stroke: rim, "stroke-width": 1.2, "stroke-opacity": 0.5 }));
    return g;
  }

  /** Standing divine figure, crown, one arm raised holding a wheel. */
  function divineFigure(color = "#060607", rim = GOLD) {
    const g = el("g");
    /* halo behind the head */
    g.appendChild(el("circle", { cx: 0, cy: -182, r: 62, fill: "none", stroke: rim, "stroke-width": 1.6, "stroke-opacity": 0.55 }));
    g.appendChild(el("circle", { cx: 0, cy: -182, r: 88, fill: "none", stroke: rim, "stroke-width": 1, "stroke-opacity": 0.24 }));
    /* mukut */
    g.appendChild(
      el("path", {
        d: "M -26 -236 Q -18 -264 0 -264 Q 18 -264 26 -236 Q 16 -221 0 -221 Q -16 -221 -26 -236 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.4,
        "stroke-opacity": 0.6,
      })
    );
    g.appendChild(el("path", { d: "M -17 -240 L 0 -256 L 17 -240", fill: "none", stroke: rim, "stroke-width": 1.1, "stroke-opacity": 0.45 }));
    /* head */
    g.appendChild(el("circle", { cx: 0, cy: -196, r: 30, fill: color, stroke: rim, "stroke-width": 1.6, "stroke-opacity": 0.65 }));
    /* shoulders, torso, dhoti */
    g.appendChild(
      el("path", {
        d: "M -78 -132 Q -30 -162 30 -158 Q 78 -146 86 -108 L 62 -6 Q 44 56 26 104 L -26 104 Q -44 56 -62 -6 L -86 -108 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.7,
        "stroke-opacity": 0.55,
      })
    );
    /* left arm bends to the conch, right arm lifts the chakra */
    g.appendChild(el("path", { d: "M -74 -126 Q -112 -142 -118 -104", fill: "none", stroke: rim, "stroke-width": 9, "stroke-linecap": "round", "stroke-opacity": 0.72 }));
    g.appendChild(el("path", { d: "M 74 -126 Q 120 -148 128 -196", fill: "none", stroke: rim, "stroke-width": 9, "stroke-linecap": "round", "stroke-opacity": 0.72 }));

    /* conch */
    g.appendChild(
      el("path", {
        d: "M -132 -104 Q -150 -96 -144 -78 Q -138 -62 -120 -70 Q -108 -80 -118 -96 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.4,
        "stroke-opacity": 0.6,
      })
    );

    /* sudarshan on the fingertip */
    const wheel = el("g", { transform: "translate(128 -212)" });
    wheel.appendChild(el("circle", { cx: 0, cy: 0, r: 30, fill: "none", stroke: rim, "stroke-width": 1.8, "stroke-opacity": 0.85 }));
    wheel.appendChild(el("circle", { cx: 0, cy: 0, r: 10, fill: "none", stroke: rim, "stroke-width": 1.2, "stroke-opacity": 0.7 }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      wheel.appendChild(
        el("line", {
          x1: Math.cos(a) * 10,
          y1: Math.sin(a) * 10,
          x2: Math.cos(a) * 30,
          y2: Math.sin(a) * 30,
          stroke: rim,
          "stroke-width": 1.3,
          "stroke-opacity": 0.65,
        })
      );
    }
    g.appendChild(wheel);
    /* sash and dhoti folds */
    g.appendChild(el("path", { d: "M -58 -44 Q 0 4 58 -44", fill: "none", stroke: rim, "stroke-width": 2, "stroke-opacity": 0.32 }));
    g.appendChild(el("path", { d: "M -16 14 L -6 96 M 8 14 L 18 96", fill: "none", stroke: rim, "stroke-width": 1.2, "stroke-opacity": 0.22 }));
    return g;
  }

  /** Standing figure seen from behind — head, shoulders, robe. Reads at any size. */
  function standingSilhouette(color = "#060607", rim = GOLD) {
    const g = el("g");
    g.appendChild(el("ellipse", { cx: 0, cy: 138, rx: 92, ry: 16, fill: "none", stroke: rim, "stroke-width": 1.2, "stroke-opacity": 0.3 }));
    g.appendChild(
      el("path", {
        d: "M -48 -232 Q 0 -254 48 -232 L 64 -70 Q 44 74 30 132 L -30 132 Q -44 74 -64 -70 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.6,
        "stroke-opacity": 0.55,
      })
    );
    g.appendChild(el("circle", { cx: 0, cy: -256, r: 21, fill: color, stroke: rim, "stroke-width": 1.5, "stroke-opacity": 0.6 }));
    g.appendChild(el("path", { d: "M -52 -196 Q 0 -160 52 -196", fill: "none", stroke: rim, "stroke-width": 7, "stroke-linecap": "round", "stroke-opacity": 0.5 }));
    g.appendChild(el("path", { d: "M 0 -120 L 0 120", fill: "none", stroke: rim, "stroke-width": 1, "stroke-opacity": 0.18 }));
    return g;
  }

  /** Kneeling warrior, side profile, hands folded. */
  function kneelingFigure(color = "#060607", rim = GOLD) {
    const g = el("g");
    /* folded legs */
    g.appendChild(
      el("path", {
        d: "M -92 30 Q -104 0 -70 -12 L 44 -12 Q 78 0 80 30 Q 68 52 0 52 Q -66 52 -92 30 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.6,
        "stroke-opacity": 0.55,
      })
    );
    /* torso leaning in */
    g.appendChild(
      el("path", {
        d: "M -58 -6 Q -76 -60 -46 -104 L 20 -104 Q 46 -66 40 -6 Q 0 16 -58 -6 Z",
        fill: color,
        stroke: rim,
        "stroke-width": 1.6,
        "stroke-opacity": 0.55,
      })
    );
    /* bowed head */
    g.appendChild(el("circle", { cx: 6, cy: -128, r: 26, fill: color, stroke: rim, "stroke-width": 1.5, "stroke-opacity": 0.6 }));
    /* folded hands */
    g.appendChild(el("path", { d: "M 0 -96 L -8 -56 L 2 -30", fill: "none", stroke: rim, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-opacity": 0.6 }));
    g.appendChild(el("path", { d: "M 14 -96 L 12 -56 L 6 -30", fill: "none", stroke: rim, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-opacity": 0.6 }));
    return g;
  }

  /* ------------------------------------------------------------------ scene 1 */

  function hook(host) {
    const root = svg();
    const defs = el("defs");
    defs.appendChild(rad("hookSky", [[0, "#171208", 1], [0.55, "#0c0a07", 1], [1, "#0a0a0a", 1]], "50%", "38%", "70%"));
    defs.appendChild(
      lin("hookHorizon", [[0, GOLD, 0], [0.5, GOLD, 0.5], [1, GOLD, 0]], 0, 0, 1, 0)
    );
    defs.appendChild(lin("hookMist", [[0, "#0a0a0a", 0], [0.5, "#d4af37", 0.1], [1, "#0a0a0a", 0]], 0, 0, 0, 1));
    defs.appendChild(rad("warriorGlow", [[0, GOLD, 0.4], [0.45, GOLD, 0.14], [1, GOLD, 0]]));
    const fieldClip = el("clipPath", { id: "fieldClip" });
    fieldClip.appendChild(el("rect", { x: 0, y: 1150, width: 1080, height: 780 }));
    defs.appendChild(fieldClip);
    root.appendChild(defs);

    root.appendChild(el("rect", { width: 1080, height: 1920, fill: "url(#hookSky)" }));

    const horizon = 1240;
    root.appendChild(el("rect", { x: 0, y: horizon - 1, width: 1080, height: 2, fill: "url(#hookHorizon)", opacity: 0.55 }));

    /* three ridges, far to near */
    const ridges = [];
    const ridgeData = [
      { y: 1120, amp: 90, opacity: 0.3, fill: "#0b0b0c" },
      { y: 1220, amp: 120, opacity: 0.52, fill: "#080809" },
      { y: 1350, amp: 150, opacity: 0.86, fill: "#050506" },
    ];
    ridgeData.forEach((r, idx) => {
      const pts = ["M -40 1920 L -40 " + r.y];
      for (let x = -40; x <= 1120; x += 90) {
        const y = r.y - Math.abs(Math.sin((x + idx * 200) / 260)) * r.amp - Math.sin(x / 90 + idx) * 18;
        pts.push(`L ${x} ${y.toFixed(1)}`);
      }
      pts.push("L 1120 1920 Z");
      const p = el("path", { d: pts.join(" "), fill: r.fill, stroke: GOLD, "stroke-width": 1.3, "stroke-opacity": 0.55, opacity: r.opacity });
      ridges.push(p);
      root.appendChild(p);
    });

    /* mist bands */
    const mist = el("g");
    for (let i = 0; i < 3; i++) {
      mist.appendChild(el("rect", { x: -120, y: 1150 + i * 90, width: 1320, height: 120, fill: "url(#hookMist)", opacity: 0.5 - i * 0.1 }));
    }
    root.appendChild(mist);


    /* battlefield: perspective grid below the horizon */
    const grid = el("g", { opacity: 0.3, "clip-path": "url(#fieldClip)" });
    for (let i = 1; i <= 9; i++) {
      const y = horizon + Math.pow(i / 9, 1.9) * 640;
      grid.appendChild(el("line", { x1: 0, y1: y, x2: 1080, y2: y, stroke: GOLD, "stroke-width": i > 7 ? 1.6 : 1 }));
    }
    for (let i = -9; i <= 9; i++) {
      grid.appendChild(el("line", { x1: 540, y1: horizon, x2: 540 + i * 190, y2: 1920, stroke: GOLD, "stroke-width": 1 }));
    }
    /* army marks on the grid */
    for (let i = 0; i < 44; i++) {
      const r = rand(i + 3);
      const y = 1300 + r * 520;
      const spread = ((y - horizon) / 680) * 620;
      const x = 540 + (rand(i + 17) * 2 - 1) * spread;
      grid.appendChild(el("rect", { x, y, width: 3.2, height: 10 + r * 6, fill: GOLD, opacity: 0.5 }));
    }
    root.appendChild(grid);

    root.appendChild(grid);
    root.appendChild(el("rect", { x: 0, y: 1160, width: 1080, height: 6, fill: GOLD, opacity: 0.05 }));

    /* the meditating warrior on the peak */
    const warriorGroup = el("g", { opacity: 0 });
    const aura = el("circle", { cx: 540, cy: 1180, r: 320, fill: "url(#warriorGlow)" });
    warriorGroup.appendChild(aura);
    const warrior = meditatingFigure();
    warrior.setAttribute("transform", "translate(540 1288) scale(1.16)");
    warriorGroup.appendChild(warrior);
    warriorGroup.appendChild(el("circle", { cx: 540, cy: 1288, r: 186, fill: "none", stroke: GOLD, "stroke-width": 1, "stroke-opacity": 0.2 }));
    root.appendChild(warriorGroup);

    /* spinning chakra, the hook */
    const chakraWrap = el("g");
    const wheel = window.Brand.chakra({ size: 760, spokes: 16 });
    wheel.setAttribute("x", "-380");
    wheel.setAttribute("y", "-380");
    chakraWrap.appendChild(wheel);
    const glow = el("circle", { cx: 0, cy: 0, r: 330, fill: GOLD, opacity: 0.05 });
    chakraWrap.insertBefore(glow, wheel);
    root.appendChild(chakraWrap);

    host.appendChild(root);

    return {
      root,
      update(local, p) {
        const out = easeInOut(clamp(local / 2.6));
        chakraWrap.setAttribute(
          "transform",
          `translate(540 ${lerp(880, 470, out).toFixed(1)}) rotate(${(local * 132).toFixed(2)})`
        );
        const s = lerp(1.34, 0.34, out);
        wheel.setAttribute("width", String(760 * s));
        wheel.setAttribute("height", String(760 * s));
        wheel.setAttribute("x", String(-380 * s));
        wheel.setAttribute("y", String(-380 * s));
        glow.setAttribute("r", String(330 * s));
        chakraWrap.setAttribute("opacity", String(lerp(1, 0.5, out)));

        const reveal = easeOut(clamp((local - 1.4) / 2.0));
        warriorGroup.setAttribute("opacity", String(reveal * 0.96));
        ridges.forEach((r, i) => r.setAttribute("opacity", String(r.__base ?? (r.__base = Number(r.getAttribute("opacity"))) * reveal)));
        grid.setAttribute("opacity", String(0.24 * reveal));
        mist.setAttribute("transform", `translate(${(Math.sin(local * 0.5) * 16).toFixed(2)} 0)`);
        warriorGroup.setAttribute("transform", `translate(0 ${(Math.sin(local * 0.7) * 4).toFixed(2)})`);
      },
    };
  }

  /* ------------------------------------------------------------------ scene 2 */

  function arrows(host) {
    const root = svg();
    const defs = el("defs");
    defs.appendChild(lin("trailGrad", [[0, GOLD, 0], [0.55, GOLD_LIGHT, 0.85], [1, "#7ec8ff", 0.9]], 0, 0, 1, 0));
    defs.appendChild(rad("lockGlow", [[0, GOLD, 0.55], [0.6, GOLD, 0.12], [1, GOLD, 0]]));
    root.appendChild(defs);

    root.appendChild(el("rect", { width: 1080, height: 1920, fill: "#0a0a0a" }));

    /* geometric battlefield grid */
    const grid = el("g", { opacity: 0.14 });
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      grid.appendChild(el("line", { x1: lerp(-80, 1160, t), y1: 560, x2: lerp(-80, 1160, t), y2: 1180, stroke: GOLD, "stroke-width": 0.9 }));
      grid.appendChild(el("line", { x1: -80, y1: lerp(560, 1180, t), x2: 1160, y2: lerp(560, 1180, t), stroke: GOLD, "stroke-width": 0.9 }));
    }
    /* diagonals for depth */
    for (let i = -3; i <= 3; i++) {
      grid.appendChild(el("line", { x1: 540 + i * 240, y1: 560, x2: 540 + i * 420, y2: 1180, stroke: GOLD, "stroke-width": 0.8, opacity: 0.6 }));
    }
    root.appendChild(grid);

    const targets = [
      { x: 300, y: 830, at: 0.7 },
      { x: 620, y: 1010, at: 2.4 },
      { x: 810, y: 780, at: 4.2 },
    ];

    const targetGroups = targets.map((t) => {
      const g = el("g", { transform: `translate(${t.x} ${t.y})` });
      g.appendChild(el("circle", { cx: 0, cy: 0, r: 120, fill: "url(#lockGlow)", opacity: 0 }));
      const ring = el("circle", { cx: 0, cy: 0, r: 54, fill: "none", stroke: GOLD, "stroke-width": 1.6, "stroke-dasharray": "6 8", opacity: 0.4 });
      g.appendChild(ring);
      g.appendChild(el("circle", { cx: 0, cy: 0, r: 34, fill: "none", stroke: GOLD, "stroke-width": 1, opacity: 0.28 }));
      g.appendChild(el("circle", { cx: 0, cy: 0, r: 4, fill: GOLD, opacity: 0.85 }));
      g.appendChild(el("line", { x1: -70, y1: 0, x2: -46, y2: 0, stroke: GOLD, "stroke-width": 1.2, opacity: 0.5 }));
      g.appendChild(el("line", { x1: 46, y1: 0, x2: 70, y2: 0, stroke: GOLD, "stroke-width": 1.2, opacity: 0.5 }));
      root.appendChild(g);
      return { g, ring, t };
    });

    const arrowGroups = targets.map((t, i) => {
      const g = el("g");
      const trail = el("line", { x1: 0, y1: 0, x2: 0, y2: 0, stroke: "url(#trailGrad)", "stroke-width": 3, "stroke-linecap": "round", opacity: 0 });
      root.appendChild(trail);
      /* shaft from -120..0, head at 0 */
      g.appendChild(el("line", { x1: -130, y1: 0, x2: -8, y2: 0, stroke: GOLD_LIGHT, "stroke-width": 4, "stroke-linecap": "round" }));
      g.appendChild(el("path", { d: "M 2 0 L -22 -11 L -16 0 L -22 11 Z", fill: GOLD_LIGHT }));
      g.appendChild(el("line", { x1: -130, y1: 0, x2: -152, y2: -13, stroke: GOLD_LIGHT, "stroke-width": 3, "stroke-linecap": "round" }));
      g.appendChild(el("line", { x1: -130, y1: 0, x2: -152, y2: 13, stroke: GOLD_LIGHT, "stroke-width": 3, "stroke-linecap": "round" }));
      root.appendChild(g);
      return { g, trail, t, from: { x: -260 - i * 90, y: -420 + i * 120 } };
    });

    host.appendChild(root);

    return {
      root,
      update(local) {
        grid.setAttribute("opacity", String(0.12 + 0.1 * easeOut(clamp(local / 1.2))));

        targetGroups.forEach(({ g, ring, t }, i) => {
          const k = easeOutExpo(clamp((local - t.at) / 0.5));
          g.setAttribute("opacity", String(0.42 + 0.58 * k));
          ring.setAttribute("stroke-dashoffset", String((local * 26 + i * 12).toFixed(1)));
          const glowCircle = g.firstChild;
          glowCircle.setAttribute("opacity", String(k * 0.75));
        });

        arrowGroups.forEach(({ g, trail, t, from }, i) => {
          const k = easeOutExpo(clamp((local - t.at) / 0.55));
          if (k <= 0.001) {
            g.setAttribute("opacity", "0");
            trail.setAttribute("opacity", "0");
            return;
          }
          const startX = t.x + from.x;
          const startY = t.y + from.y;
          const x = lerp(startX, t.x, k);
          const y = lerp(startY, t.y, k);
          const angle = (Math.atan2(t.y - startY, t.x - startX) * 180) / Math.PI;
          g.setAttribute("opacity", "1");
          g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(2)})`);
          trail.setAttribute("x1", String(startX));
          trail.setAttribute("y1", String(startY));
          trail.setAttribute("x2", String(x - Math.cos((angle * Math.PI) / 180) * 60));
          trail.setAttribute("y2", String(y - Math.sin((angle * Math.PI) / 180) * 60));
          trail.setAttribute("opacity", String(0.55 * (1 - k * 0.55)));

          /* lock flash */
          const after = local - t.at - 0.55;
          if (after > 0) {
            const pulse = Math.exp(-after / 0.16);
            const ring = targetGroups[i].ring;
            ring.setAttribute("r", String(54 + pulse * 34));
            ring.setAttribute("stroke-opacity", String(0.4 + pulse * 0.55));
          }
        });
      },
    };
  }

  /* ------------------------------------------------------------------ scene 3 */

  function sacrifice(host) {
    const root = svg();
    const defs = el("defs");
    defs.appendChild(rad("auraGlow", [[0, GOLD, 0.5], [0.45, GOLD, 0.16], [1, GOLD, 0]]));
    defs.appendChild(rad("flashGrad", [[0, "#fff6dd", 1], [0.5, GOLD, 0.75], [1, GOLD, 0]]));
    defs.appendChild(rad("moonGlow", [[0, "#f7ecc9", 0.2], [0.7, GOLD, 0.07], [1, GOLD, 0]]));
    defs.appendChild(rad("moonFace", [[0, "#f8f0d6", 0.62], [0.55, "#e8dcb6", 0.34], [1, "#cbb887", 0.12]]));
    root.appendChild(defs);

    root.appendChild(el("rect", { width: 1080, height: 1920, fill: "#0a0a0a" }));

    /* --- phase A: the meeting --- */
    const meet = el("g");
    meet.appendChild(el("ellipse", { cx: 540, cy: 1560, rx: 520, ry: 150, fill: "url(#auraGlow)", opacity: 0.5 }));

    const auraCenter = { x: 400, y: 640 };
    const glow = el("circle", { cx: auraCenter.x, cy: auraCenter.y, r: 420, fill: "url(#auraGlow)" });
    meet.appendChild(glow);

    const rays = el("g", { opacity: 0.55 });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      rays.appendChild(
        el("line", {
          x1: auraCenter.x + Math.cos(a) * 120,
          y1: auraCenter.y + Math.sin(a) * 120,
          x2: auraCenter.x + Math.cos(a) * (i % 2 ? 300 : 400),
          y2: auraCenter.y + Math.sin(a) * (i % 2 ? 300 : 400),
          stroke: GOLD,
          "stroke-width": i % 2 ? 1 : 2,
          "stroke-opacity": 0.5,
        })
      );
    }
    meet.appendChild(rays);
    meet.appendChild(el("circle", { cx: auraCenter.x, cy: auraCenter.y, r: 190, fill: "none", stroke: GOLD, "stroke-width": 1.4, "stroke-opacity": 0.5 }));
    meet.appendChild(el("circle", { cx: auraCenter.x, cy: auraCenter.y, r: 250, fill: "none", stroke: GOLD, "stroke-width": 1, "stroke-opacity": 0.25 }));

    const presence = standingSilhouette();
    presence.setAttribute("transform", `translate(${auraCenter.x} ${auraCenter.y + 120}) scale(0.8)`);
    meet.appendChild(presence);

    const floatWheel = el("g", { transform: `translate(${auraCenter.x} ${auraCenter.y - 300})` });
    const miniWheel = window.Brand.chakra({ size: 190, spokes: 12 });
    miniWheel.setAttribute("x", "-95");
    miniWheel.setAttribute("y", "-95");
    floatWheel.appendChild(miniWheel);
    meet.appendChild(floatWheel);

    const kneel = kneelingFigure();
    kneel.setAttribute("transform", "translate(842 986) scale(1.12) scale(-1 1)");
    meet.appendChild(kneel);
    meet.appendChild(el("ellipse", { cx: 842, cy: 1034, rx: 140, ry: 20, fill: "none", stroke: GOLD, "stroke-width": 1, "stroke-opacity": 0.2 }));
    root.appendChild(meet);

    /* --- flash --- */
    const flash = el("rect", { x: 0, y: 0, width: 1080, height: 1920, fill: "url(#flashGrad)", opacity: 0 });
    root.appendChild(flash);

    /* --- phase C: the moon on the cliff --- */
    const moonScene = el("g", { opacity: 0 });
    moonScene.appendChild(el("circle", { cx: 540, cy: 560, r: 460, fill: "url(#moonGlow)" }));
    moonScene.appendChild(el("circle", { cx: 540, cy: 560, r: 232, fill: "url(#moonFace)" }));
    moonScene.appendChild(el("circle", { cx: 540, cy: 560, r: 232, fill: "none", stroke: GOLD, "stroke-width": 1.8, "stroke-opacity": 0.7 }));
    moonScene.appendChild(el("circle", { cx: 540, cy: 560, r: 214, fill: "none", stroke: GOLD, "stroke-width": 0.8, "stroke-opacity": 0.22 }));
    /* surface craters, vector only */
    [
      [470, 480, 34],
      [596, 630, 46],
      [620, 485, 22],
      [468, 640, 26],
    ].forEach(([x, y, r]) => moonScene.appendChild(el("circle", { cx: x, cy: y, r, fill: "#8a7c55", opacity: 0.16 })));

    const cliff = el("path", {
      d: "M -40 1920 L -40 1090 L 170 1022 L 330 1064 L 540 1002 L 740 1058 L 940 1008 L 1120 1072 L 1120 1920 Z",
      fill: "#0b0b0c",
      stroke: GOLD,
      "stroke-width": 1.4,
      "stroke-opacity": 0.38,
    });
    moonScene.appendChild(cliff);
    const tiny = standingSilhouette();
    tiny.setAttribute("transform", "translate(300 1000) scale(0.5)");
    moonScene.appendChild(tiny);
    moonScene.appendChild(el("ellipse", { cx: 300, cy: 1010, rx: 58, ry: 9, fill: "none", stroke: GOLD, "stroke-width": 1, "stroke-opacity": 0.28 }));
    root.appendChild(moonScene);

    host.appendChild(root);

    const FLASH_AT = 7.2;
    const MOON_AT = 8.0;

    return {
      root,
      update(local) {
        /* meeting: alive until the flash */
        const meetOut = clamp((local - (FLASH_AT + 0.35)) / 0.9);
        meet.setAttribute("opacity", String((1 - meetOut) * clamp(local / 0.6)));
        rays.setAttribute("transform", `rotate(${(local * 4).toFixed(2)} ${auraCenter.x} ${auraCenter.y})`);
        glow.setAttribute("opacity", String(0.7 + 0.3 * Math.sin(local * 1.4)));
        presence.setAttribute("transform", `translate(${auraCenter.x} ${auraCenter.y + 120 + Math.sin(local * 0.8) * 6}) scale(0.8)`);
        floatWheel.setAttribute("transform", `translate(${auraCenter.x} ${auraCenter.y - 300}) rotate(${(local * 90).toFixed(2)})`);
        miniWheel.setAttribute("width", "190");
        miniWheel.setAttribute("height", "190");

        /* flash: up in 0.35s, down in 0.55s */
        const f = clamp((local - FLASH_AT) / 0.4);
        const f2 = clamp((local - FLASH_AT - 0.4) / 0.7);
        flash.setAttribute("opacity", String(Math.max(0, Math.min(f, 1 - f2)) * 0.92));

        const moonIn = easeOut(clamp((local - MOON_AT) / 1.4));
        moonScene.setAttribute("opacity", String(moonIn));
        moonScene.setAttribute("transform", `translate(0 ${(18 * (1 - moonIn)).toFixed(1)})`);
        tiny.setAttribute("transform", `translate(300 ${(1000 + Math.sin(local * 0.6) * 2.4).toFixed(1)}) scale(0.5)`);
      },
    };
  }

  /* ------------------------------------------------------------------ scene 4 */

  function question(host) {
    const root = svg();
    const defs = el("defs");
    defs.appendChild(rad("auraGlow2", [[0, GOLD, 0.45], [0.5, GOLD, 0.12], [1, GOLD, 0]]));
    root.appendChild(defs);

    root.appendChild(el("rect", { width: 1080, height: 1920, fill: "#0a0a0a" }));

    /* split panels */
    root.appendChild(el("rect", { x: 0, y: 420, width: 520, height: 680, fill: "#0c0c0d", opacity: 0.65 }));
    root.appendChild(el("rect", { x: 560, y: 420, width: 520, height: 680, fill: "#0d0c0a", opacity: 0.65 }));

    const divider = el("line", { x1: 540, y1: 420, x2: 540, y2: 420, stroke: GOLD, "stroke-width": 1.6, "stroke-opacity": 0.55 });
    root.appendChild(divider);

    /* left: five warrior emblems */
    const emblems = [];
    const spots = [
      [170, 620],
      [370, 620],
      [270, 790],
      [150, 960],
      [390, 960],
    ];
    spots.forEach(([x, y], i) => {
      const g = el("g", { transform: `translate(${x} ${y})` });
      const shield = el("path", {
        d: "M 0 -58 L 46 -34 L 46 18 Q 46 54 0 72 Q -46 54 -46 18 L -46 -34 Z",
        fill: "#0f0f10",
        stroke: GOLD,
        "stroke-width": 1.6,
      });
      g.appendChild(shield);
      g.appendChild(el("circle", { cx: 0, cy: 4, r: 15, fill: "none", stroke: GOLD, "stroke-width": 1.6, "stroke-opacity": 0.85 }));
      g.appendChild(el("circle", { cx: 0, cy: 4, r: 4, fill: GOLD, opacity: 0.7 }));
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.appendChild(
          el("line", {
            x1: Math.cos(a) * 5,
            y1: 4 + Math.sin(a) * 5,
            x2: Math.cos(a) * 15,
            y2: 4 + Math.sin(a) * 15,
            stroke: GOLD,
            "stroke-width": 1.1,
            "stroke-opacity": 0.7,
          })
        );
      }
      const num = el("text", {
        x: 34,
        y: 62,
        fill: GOLD,
        "font-family": "Inter, sans-serif",
        "font-size": 20,
        "font-weight": 800,
        opacity: 0.55,
      });
      num.textContent = String(i + 1);
      g.appendChild(num);
      root.appendChild(g);
      emblems.push(g);
    });

    /* right: divine aura with soundwave pulses */
    const auraX = 820;
    const auraY = 760;
    root.appendChild(el("circle", { cx: auraX, cy: auraY, r: 330, fill: "url(#auraGlow2)" }));
    const face = el("g", { transform: `translate(${auraX} ${auraY})` });
    face.appendChild(el("circle", { cx: 0, cy: 0, r: 92, fill: "url(#auraGlow2)" }));
    const seated = meditatingFigure("#050505", GOLD);
    seated.setAttribute("transform", "scale(0.62)");
    face.appendChild(seated);
    face.appendChild(el("circle", { cx: 0, cy: 0, r: 124, fill: "none", stroke: GOLD, "stroke-width": 1.2, "stroke-opacity": 0.26 }));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      face.appendChild(
        el("line", {
          x1: Math.cos(a) * 106,
          y1: Math.sin(a) * 106,
          x2: Math.cos(a) * (i % 2 ? 146 : 162),
          y2: Math.sin(a) * (i % 2 ? 146 : 162),
          stroke: GOLD,
          "stroke-width": i % 2 ? 1 : 1.6,
          "stroke-opacity": 0.3,
        })
      );
    }
    face.appendChild(el("circle", { cx: 0, cy: -6, r: 74, fill: "none", stroke: GOLD, "stroke-width": 1.1, "stroke-opacity": 0.3 }));
    root.appendChild(face);

    const waves = [];
    for (let i = 0; i < 4; i++) {
      const w = el("circle", { cx: auraX, cy: auraY, r: 120, fill: "none", stroke: GOLD, "stroke-width": 1.4, opacity: 0 });
      root.appendChild(w);
      waves.push(w);
    }

    host.appendChild(root);

    return {
      root,
      update(local) {
        const grow = easeOut(clamp(local / 0.8));
        divider.setAttribute("y2", String(lerp(420, 1100, grow)));

        emblems.forEach((g, i) => {
          const k = easeOut(clamp((local - 0.35 - i * 0.22) / 0.5));
          g.setAttribute("opacity", String(k));
          g.setAttribute("transform", `translate(${spots[i][0]} ${spots[i][1] + (1 - k) * 26})`);
        });

        waves.forEach((w, i) => {
          const phase = ((local * 0.55 + i * 0.25) % 1);
          w.setAttribute("r", String(110 + phase * 260));
          w.setAttribute("opacity", String((1 - phase) * 0.42));
        });

        face.setAttribute("transform", `translate(${auraX} ${auraY + Math.sin(local * 0.9) * 5})`);
      },
    };
  }

  /* ------------------------------------------------------------------ scene 5 */

  function reveal(host) {
    const root = svg();
    const defs = el("defs");
    defs.appendChild(rad("finalGlow", [[0, GOLD, 0.42], [0.45, GOLD, 0.12], [1, GOLD, 0]]));
    root.appendChild(defs);

    root.appendChild(el("rect", { width: 1080, height: 1920, fill: "#0a0a0a" }));
    root.appendChild(el("circle", { cx: 540, cy: 820, r: 520, fill: "url(#finalGlow)" }));

    /* embers */
    const embers = [];
    for (let i = 0; i < 40; i++) {
      const e = el("circle", { cx: 0, cy: 0, r: 1.6 + rand(i + 40) * 2.6, fill: GOLD, opacity: 0.55 });
      root.appendChild(e);
      embers.push({ e, seed: rand(i + 7), speed: 120 + rand(i + 21) * 240, x: 120 + rand(i + 33) * 840 });
    }

    /* particles that spiral in */
    const particles = [];
    for (let i = 0; i < 78; i++) {
      const p = el("circle", { cx: 0, cy: 0, r: 1.6 + rand(i) * 2.2, fill: i % 7 === 0 ? "#fff3d1" : GOLD, opacity: 0.8 });
      root.appendChild(p);
      particles.push({ p, seed: rand(i * 3.3), radius: 300 + rand(i * 7.1) * 460, speed: rand(i * 1.7) * 0.5 + 0.4 });
    }

    /* the wheel */
    const wheelWrap = el("g");
    const wheel = window.Brand.chakra({ size: 700, spokes: 16 });
    wheel.setAttribute("x", "-350");
    wheel.setAttribute("y", "-350");
    wheelWrap.appendChild(wheel);
    root.appendChild(wheelWrap);

    /* the divine silhouette behind the wheel */
    const figure = standingSilhouette("#040404", GOLD);
    figure.setAttribute("transform", "translate(540 1010) scale(1.06)");
    figure.setAttribute("opacity", 0);
    root.appendChild(figure);

    host.appendChild(root);

    return {
      root,
      update(local, p) {
        const converge = easeInOut(clamp(local / 2.4));
        const cx = 540;
        const cy = 780;

        particles.forEach(({ p: node, seed, radius, speed }) => {
          const angle = seed * Math.PI * 2 + local * speed;
          const r = lerp(radius, 96 + seed * 42, converge);
          node.setAttribute("cx", String(cx + Math.cos(angle) * r));
          node.setAttribute("cy", String(cy + Math.sin(angle) * r * 0.82));
          node.setAttribute("opacity", String(0.15 + 0.7 * converge * (0.5 + 0.5 * Math.sin(local * 2 + seed * 9))));
        });

        const wheelScale = lerp(0.5, 1, converge);
        wheelWrap.setAttribute("transform", `translate(${cx} ${cy}) rotate(${(local * 116).toFixed(2)})`);
        wheel.setAttribute("width", String(700 * wheelScale));
        wheel.setAttribute("height", String(700 * wheelScale));
        wheel.setAttribute("x", String(-350 * wheelScale));
        wheel.setAttribute("y", String(-350 * wheelScale));
        wheelWrap.setAttribute("opacity", String(0.25 + 0.75 * converge));

        const figIn = easeOut(clamp((local - 1.5) / 1.2));
        figure.setAttribute("opacity", String(figIn * 0.96));
        figure.setAttribute("transform", `translate(540 ${(1010 + Math.sin(local * 0.8) * 6).toFixed(1)}) scale(1.06)`);

        embers.forEach(({ e, seed, speed, x }) => {
          const y = 1560 - ((local * speed + seed * 900) % 1000);
          e.setAttribute("cx", String(x + Math.sin(local * 0.6 + seed * 7) * 26));
          e.setAttribute("cy", String(y));
          e.setAttribute("opacity", String(0.1 + 0.6 * (0.5 + 0.5 * Math.sin(local * 2.4 + seed * 11))));
        });
      },
    };
  }

  return { hook, arrows, sacrifice, question, reveal, standingSilhouette };
})();
