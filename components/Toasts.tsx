"use client";

import { useUI } from "@/lib/ui";
import { IconCheck, IconClose } from "./icons";

export default function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[60] flex w-[300px] max-w-[calc(100vw-24px)] flex-col-reverse gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-fade-up rounded-xl border border-white/10 bg-ink-800/95 p-2.5 shadow-2xl backdrop-blur"
        >
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                t.tone === "success"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : t.tone === "error"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-violet-500/20 text-violet-300"
              }`}
            >
              {t.tone === "error" ? <IconClose width={10} height={10} /> : <IconCheck width={10} height={10} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-zinc-100">{t.title}</p>
              {t.detail ? <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{t.detail}</p> : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-zinc-600 transition hover:text-zinc-300"
              aria-label="Dismiss"
            >
              <IconClose width={12} height={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
