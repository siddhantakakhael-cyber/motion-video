import { create } from "zustand";

export interface Toast {
  id: string;
  title: string;
  detail?: string;
  tone?: "info" | "success" | "error";
}

interface UIState {
  toasts: Toast[];
  exportOpen: boolean;
  exportState: "idle" | "rendering" | "done" | "error";
  exportProgress: number;
  exportNote: string;
  exportError: string | null;
  exportInfo: { name: string; size: number; ext: string } | null;
  safeGuides: boolean;
  showShortcuts: boolean;

  toast: (title: string, detail?: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  openExport: () => void;
  closeExport: () => void;
  setExport: (patch: Partial<Pick<UIState, "exportState" | "exportProgress" | "exportNote" | "exportError" | "exportInfo">>) => void;
  toggleGuides: () => void;
  setShortcuts: (open: boolean) => void;
}

let toastSeq = 0;

export const useUI = create<UIState>((set) => ({
  toasts: [],
  exportOpen: false,
  exportState: "idle",
  exportProgress: 0,
  exportNote: "",
  exportError: null,
  exportInfo: null,
  safeGuides: true,
  showShortcuts: false,

  toast: (title, detail, tone = "info") => {
    const id = `t${++toastSeq}`;
    set((s) => ({ toasts: [...s.toasts, { id, title, detail, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openExport: () =>
    set({ exportOpen: true, exportState: "idle", exportProgress: 0, exportNote: "", exportError: null, exportInfo: null }),
  closeExport: () => set({ exportOpen: false }),
  setExport: (patch) => set(patch),
  toggleGuides: () => set((s) => ({ safeGuides: !s.safeGuides })),
  setShortcuts: (showShortcuts) => set({ showShortcuts }),
}));
