/* Rahasya Sutra Studio — motion kit (JS)
 *
 * Everything here is a pure function of time or of a seed, so window.seek(t)
 * always draws the same frame. No timers, no rAF, no Math.random().
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  /* deterministic 0..1 sequence for a seed */
  function rand(seed) {
    let s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function svg(w, h, viewBox) {
    const el = document.createElementNS(NS, "svg");
    el.setAttribute("viewBox", viewBox ?? `0 0 ${w} ${h}`);
    el.setAttribute("width", String(w));
    el.setAttribute("height", String(h));
    el.style.display = "block";
    el.style.overflow = "visible";
    return el;
  }

  function path(d, stroke, width, extra = {}) {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", extra.fill ?? "none");
    p.setAttribute("stroke", stroke ?? "#d4af37");
    p.setAttribute("stroke-width", String(width ?? 3));
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    if (extra.opacity != null) p.setAttribute("opacity", String(extra.opacity));
    if (extra.dash) p.setAttribute("stroke-dasharray", extra.dash);
    return p;
  }

  function circle(cx, cy, r, stroke, width, extra = {}) {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", String(cx));
    c.setAttribute("cy", String(cy));
    c.setAttribute("r", String(r));
    c.setAttribute("fill", extra.fill ?? "none");
    c.setAttribute("stroke", stroke ?? "#d4af37");
    c.setAttribute("stroke-width", String(width ?? 3));
    if (extra.opacity != null) c.setAttribute("opacity", String(extra.opacity));
    if (extra.dash) c.setAttribute("stroke-dasharray", extra.dash);
    return c;
  }

  /**
   * Sudarshan chakra: ornate rim, 16 honed spokes, hub, and a slow flame edge.
   * Drawn gold on transparent so it can sit over a black stage.
   */
  function chakra(opts = {}) {
    const spokes = opts.spokes ?? 16;
    const size = opts.size ?? 720;
    const c = size / 2;
    const rOuter = c * 0.94;
    const root = svg(size, size, `0 0 ${size} ${size}`);
    const gold = opts.color ?? "#d4af37";

    const g = document.createElementNS(NS, "g");
    root.appendChild(g);

    /* flame edge */
    for (let i = 0; i < spokes * 2; i++) {
      const a = (i / (spokes * 2)) * Math.PI * 2;
      const r0 = rOuter * 1.01;
      const r1 = rOuter * 1.09;
      const spread = Math.PI / (spokes * 2.6);
      const d = [
        `M ${c + Math.cos(a - spread) * r0} ${c + Math.sin(a - spread) * r0}`,
        `Q ${c + Math.cos(a) * r1} ${c + Math.sin(a) * r1} ${c + Math.cos(a + spread) * r0} ${c + Math.sin(a + spread) * r0}`,
      ].join(" ");
      g.appendChild(path(d, gold, 1.6, { opacity: 0.5 }));
    }

    /* rim + bead ring */
    g.appendChild(circle(c, c, rOuter * 0.97, gold, size * 0.006));
    g.appendChild(circle(c, c, rOuter * 0.9, gold, size * 0.0025, { opacity: 0.65 }));
    for (let i = 0; i < spokes * 2; i++) {
      const a = (i / (spokes * 2)) * Math.PI * 2;
      g.appendChild(circle(c + Math.cos(a) * rOuter * 0.935, c + Math.sin(a) * rOuter * 0.935, size * 0.006, gold, 0, { fill: gold, opacity: 0.85 }));
    }

    /* spokes */
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const r0 = rOuter * 0.3;
      const r1 = rOuter * 0.86;
      const x0 = c + Math.cos(a) * r0;
      const y0 = c + Math.sin(a) * r0;
      const x1 = c + Math.cos(a) * r1;
      const y1 = c + Math.sin(a) * r1;
      const nx = Math.cos(a + Math.PI / 2);
      const ny = Math.sin(a + Math.PI / 2);
      const w = size * 0.014;
      const d = [
        `M ${x0 + nx * w} ${y0 + ny * w}`,
        `L ${x1 + nx * w * 0.35} ${y1 + ny * w * 0.35}`,
        `L ${x1} ${y1}`,
        `L ${x1 - nx * w * 0.35} ${y1 - ny * w * 0.35}`,
        `L ${x0 - nx * w} ${y0 - ny * w}`,
        `Z`,
      ].join(" ");
      g.appendChild(path(d, gold, size * 0.0035, { opacity: 0.92 }));
    }

    /* hub */
    g.appendChild(circle(c, c, rOuter * 0.3, gold, size * 0.004));
    g.appendChild(circle(c, c, rOuter * 0.22, gold, size * 0.002, { opacity: 0.7 }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.appendChild(circle(c + Math.cos(a) * rOuter * 0.26, c + Math.sin(a) * rOuter * 0.26, size * 0.008, gold, 0, { fill: gold, opacity: 0.7 }));
    }

    root.dataset.spin = "1";
    return root;
  }

  /** Sacred-geometry mandala: rings, petals, triangles, dots. The "room" behind the type. */
  function mandala(opts = {}) {
    const petals = opts.petals ?? 24;
    const size = opts.size ?? 1400;
    const c = size / 2;
    const gold = opts.color ?? "#d4af37";
    const root = svg(size, size, `0 0 ${size} ${size}`);
    const g = document.createElementNS(NS, "g");
    root.appendChild(g);

    const rings = [0.46, 0.38, 0.3, 0.16, 0.09];
    rings.forEach((r, i) =>
      g.appendChild(circle(c, c, size * r, gold, i % 2 ? 1 : 1.6, { opacity: i % 2 ? 0.4 : 0.6 }))
    );

    /* petal ring */
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      const r0 = size * 0.3;
      const r1 = size * 0.44;
      const sway = Math.PI / petals * 1.5;
      const d = [
        `M ${c + Math.cos(a - sway) * r0} ${c + Math.sin(a - sway) * r0}`,
        `Q ${c + Math.cos(a) * (r1 + size * 0.02)} ${c + Math.sin(a) * (r1 + size * 0.02)} ${c + Math.cos(a + sway) * r0} ${c + Math.sin(a + sway) * r0}`,
      ].join(" ");
      g.appendChild(path(d, gold, 1.1, { opacity: 0.42 }));
    }

    /* star polygons */
    for (const [count, radius, opacity] of [
      [12, 0.28, 0.35],
      [8, 0.2, 0.3],
    ]) {
      const pts = [];
      for (let i = 0; i < count * 2; i++) {
        const a = (i / (count * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = size * radius * (i % 2 ? 0.55 : 1);
        pts.push(`${c + Math.cos(a) * r} ${c + Math.sin(a) * r}`);
      }
      const poly = document.createElementNS(NS, "polygon");
      poly.setAttribute("points", pts.join(" "));
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", gold);
      poly.setAttribute("stroke-width", "1");
      poly.setAttribute("opacity", String(opacity));
      g.appendChild(poly);
    }

    /* tick ring */
    for (let i = 0; i < petals * 3; i++) {
      const a = (i / (petals * 3)) * Math.PI * 2;
      const r = size * 0.475;
      g.appendChild(circle(c + Math.cos(a) * r, c + Math.sin(a) * r, i % 3 ? 1.2 : 2.2, gold, 0, { fill: gold, opacity: i % 3 ? 0.3 : 0.55 }));
    }

    return root;
  }

  /**
   * Camera shake: deterministic impulses with exponential decay.
   * pass [] of hits: {at, amp, decay, rot, seed}
   */
  function shake(t, hits) {
    let x = 0;
    let y = 0;
    let rot = 0;
    for (const hit of hits) {
      const dt = t - hit.at;
      if (dt < 0) continue;
      const env = Math.exp(-dt / (hit.decay ?? 0.12));
      const amp = (hit.amp ?? 12) * env;
      const seed = hit.seed ?? 1;
      x += Math.sin(dt * 62 * (0.8 + rand(seed)) + seed) * amp;
      y += Math.cos(dt * 71 * (0.8 + rand(seed + 1)) + seed) * amp * 0.7;
      rot += Math.sin(dt * 48 + seed * 2) * (hit.rot ?? 0.25) * env;
    }
    return { x, y, rot };
  }

  /** Rise + fade entrance. Sets opacity and transform on the node. */
  function enter(node, local, at, opts = {}) {
    const dur = opts.dur ?? 0.55;
    const rise = opts.rise ?? 42;
    const k = easeOutExpo(clamp((local - at) / dur));
    node.style.opacity = String(k);
    node.style.transform = `translate3d(0, ${(rise * (1 - k)).toFixed(2)}px, 0)`;
    return k;
  }

  /** Grow a hairline to n px with the same ease. */
  function grow(node, local, at, opts = {}) {
    const dur = opts.dur ?? 0.7;
    const width = opts.width ?? 220;
    const k = easeOutCubic(clamp((local - at) / dur));
    node.style.width = `${(width * k).toFixed(1)}px`;
    node.style.opacity = String(0.35 + 0.65 * k);
    return k;
  }

  /** Gold motes that drift upward. Returns a function of time. */
  function dust(container, count = 20, seed = 7) {
    const motes = [];
    for (let i = 0; i < count; i++) {
      const r = rand(seed + i * 3.7);
      const el = document.createElement("i");
      el.style.left = `${6 + r * 88}%`;
      el.style.top = `${12 + rand(seed + i * 9.1) * 70}%`;
      container.appendChild(el);
      motes.push({ el, r, speed: 16 + rand(seed + i) * 34 });
    }
    return function update(t) {
      for (const m of motes) {
        const rise = (t * m.speed) % 720;
        const sway = Math.sin(t * 0.5 + m.r * 6.28) * 22;
        m.el.style.transform = `translate3d(${sway.toFixed(1)}px, ${(-rise).toFixed(1)}px, 0) scale(${(0.55 + m.r).toFixed(2)})`;
        m.el.style.opacity = String(clamp(0.12 + 0.35 * Math.sin(t * 0.8 + m.r * 5)));
      }
    };
  }

  window.Brand = {
    clamp,
    lerp,
    easeOutExpo,
    easeOutCubic,
    easeInOutCubic,
    rand,
    chakra,
    mandala,
    shake,
    enter,
    grow,
    dust,
    NS,
  };
})();
