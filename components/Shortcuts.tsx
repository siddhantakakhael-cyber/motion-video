"use client";

import { useUI } from "@/lib/ui";
import { IconClose } from "./icons";

const GROUPS = [
  {
    title: "Playback",
    items: [
      ["Play / pause", "Space"],
      ["Previous / next frame", "← →"],
      ["Jump one second", "Shift + ← →"],
      ["Go to start / end", "Home / End"],
    ],
  },
  {
    title: "Editing",
    items: [
      ["Undo", "⌘ / Ctrl + Z"],
      ["Redo", "⇧ + ⌘ / Ctrl + Z"],
      ["Duplicate layer", "⌘ / Ctrl + D"],
      ["Delete layer", "⌫"],
      ["Deselect", "Esc"],
    ],
  },
  {
    title: "Output",
    items: [
      ["Export video", "⌘ / Ctrl + E"],
      ["Zoom timeline", "⌘ / Ctrl + scroll"],
    ],
  },
];

export default function Shortcuts() {
  const open = useUI((s) => s.showShortcuts);
  const setOpen = useUI((s) => s.setShortcuts);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-white/10 bg-ink-850 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">Keyboard shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06] hover:text-white"
          >
            <IconClose width={15} height={15} />
          </button>
        </div>
        <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map(([label, key]) => (
                  <li key={label} className="flex items-center justify-between gap-3 text-[11px] text-zinc-400">
                    <span>{label}</span>
                    <kbd className="shrink-0 rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                      {key}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-white/[0.07] px-5 py-2.5 text-[10px] text-zinc-600">
          Shortcuts pause while you are typing in a text field.
        </p>
      </div>
    </div>
  );
}
