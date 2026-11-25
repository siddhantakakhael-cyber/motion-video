/* Seeta-Ram — vector art per scene.
 * Every builder returns { root, update(local, p) }. Pure function of time,
 * so window.seek(t) stays reproducible. No photos, no AI stills.
 */
window.Art = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const GOLD = "#D4AF37";

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

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

  function rad(id, stops, cx = "50%", cy = "50%", r = "50%") {
    const g = el("radialGradient", { id, cx, cy, r });
    stops.forEach(([offset, color, opacity = 1]) =>
      g.appendChild(el("stop", { offset, "stop-color": color, "stop-opacity": opacity }))
    );
    return g;
  }

  function field(host, sceneIndex) {
    const root = svg();
    const defs = el("defs");
    /* soft gold field behind the scene, tinted per scene */
    const tints = [
      [[0, GOLD, 0.06], [0.45, GOLD, 0.02], [1, GOLD, 0]],
      [[0, GOLD, 0.09], [0.45, GOLD, 0.03], [1, GOLD, 0]],
      [[0, GOLD, 0.05], [0.45, GOLD, 0.015], [1, GOLD, 0]],
      [[0, "#E50914", 0.05], [0.45, "#E50914", 0.015], [1, "#E50914", 0]],
      [[0, GOLD, 0.08], [0.45, GOLD, 0.025], [1, GOLD, 0]],
    ];
    defs.appendChild(rad(`fieldGrad${sceneIndex}`, tints[sceneIndex], "50%", "38%", "68%"));
    root.appendChild(defs);

    root.appendChild(
      el("rect", { width: 1080, height: 1920, fill: `url(#fieldGrad${sceneIndex})` })
    );

    /* horizon hairline — a faint gold rule near the top of the safe zone */
    const horizon = el("rect", {
      x: 260,
      y: 340,
      width: 560,
      height: 1.4,
      fill: GOLD,
      opacity: 0.25,
    });
    root.appendChild(horizon);

    host.appendChild(root);

    return {
      root,
      update(local, p) {
        const k = easeOut(clamp(local / 1.6));
        horizon.setAttribute("opacity", String(0.25 * k));
      },
    };
  }

  return { field };
})();
