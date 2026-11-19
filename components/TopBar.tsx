"use client";

import { useEffect, useRef, useState } from "react";
import { starterProject } from "@/lib/starter";
import { useStudio } from "@/lib/store";
import { useUI } from "@/lib/ui";
import {
  IconCheck,
  IconDownload,
  IconKeyboard,
  IconLogo,
  IconRedo,
  IconTrash,
  IconUndo,
} from "./icons";
import { Button, IconButton } from "./ui";

export default function TopBar() {
  const project = useStudio((s) => s.project);
  const setProject = useStudio((s) => s.setProject);
  const past = useStudio((s) => s.past.length);
  const future = useStudio((s) => s.future.length);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const newProject = useStudio((s) => s.newProject);
  const loadProject = useStudio((s) => s.loadProject);
  const saveState = useStudio((s) => s.saveState);
  const setPlaying = useStudio((s) => s.setPlaying);
  const openExport = useUI((s) => s.openExport);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const toast = useUI((s) => s.toast);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const dot =
    saveState === "saved" ? "bg-emerald-400" : saveState === "saving" ? "bg-amber-400 animate-pulse" : "bg-zinc-500";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.07] bg-ink-950 px-3 sm:px-4">
      <div className="flex items-center gap-2.5">
        <IconLogo />
        <div className="hidden leading-tight sm:block">
          <p className="text-[12.5px] font-semibold tracking-tight text-white">Motion Studio</p>
          <p className="text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">browser video editor</p>
        </div>
      </div>

      <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />

      <input
        value={project.name}
        onChange={(e) => setProject({ ...project, name: e.target.value }, { history: false })}
        spellCheck={false}
        className="h-7 w-[110px] min-w-0 rounded-md bg-transparent px-1.5 text-xs font-medium text-zinc-300 outline-none transition hover:bg-white/[0.04] focus:bg-white/[0.06] focus:text-white sm:w-[180px]"
        title="Project name"
      />

      <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-500 ring-1 ring-white/5 sm:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {saveState === "saved" ? "Saved locally" : saveState === "saving" ? "Saving…" : "Unsaved"}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-0.5 sm:flex">
          <IconButton label="Undo (⌘Z)" onClick={undo} disabled={!past}>
            <IconUndo width={15} height={15} />
          </IconButton>
          <IconButton label="Redo (⇧⌘Z)" onClick={redo} disabled={!future}>
            <IconRedo width={15} height={15} />
          </IconButton>
        </div>
        <IconButton label="Keyboard shortcuts" onClick={() => setShortcuts(true)} className="hidden sm:inline-flex">
          <IconKeyboard width={15} height={15} />
        </IconButton>

        <div className="relative" ref={menuRef}>
          <IconButton label="Project menu" onClick={() => setMenuOpen((o) => !o)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          </IconButton>
          {menuOpen ? (
            <div className="absolute right-0 top-9 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-ink-850 p-1 shadow-2xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPlaying(false);
                  newProject();
                  toast("New project", "Blank 9:16 canvas ready");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-zinc-300 hover:bg-white/[0.06]"
              >
                <IconCheck width={13} height={13} className="text-violet-300" /> New blank project
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setPlaying(false);
                  loadProject(starterProject());
                  toast("Demo loaded", "A 20s reel you can edit", "success");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-zinc-300 hover:bg-white/[0.06]"
              >
                <IconRedo width={13} height={13} className="text-sky-300" /> Load demo storyboard
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShortcuts(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-zinc-300 hover:bg-white/[0.06] sm:hidden"
              >
                <IconKeyboard width={13} height={13} className="text-zinc-400" /> Shortcuts
              </button>
              <div className="my-1 h-px bg-white/[0.07]" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm("Clear every layer? This can be undone with ⌘Z.")) {
                    useStudio.setState({ project: { ...project, layers: [], duration: 8 }, past: [...useStudio.getState().past, project], future: [] });
                    toast("Timeline cleared", "Undo is available");
                  }
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-red-300 hover:bg-red-500/10"
              >
                <IconTrash width={13} height={13} /> Clear timeline
              </button>
            </div>
          ) : null}
        </div>

        <Button variant="primary" size="md" className="ml-1.5" onClick={openExport}>
          <IconDownload width={14} height={14} />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </header>
  );
}
