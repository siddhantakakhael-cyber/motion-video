"use client";

import { useEffect, useState } from "react";
import { IconImage, IconSparkles } from "./icons";
import AIPanel from "./AIPanel";
import MediaPanel from "./MediaPanel";

export default function LeftPanel({ initialTab = "ai" }: { initialTab?: "ai" | "media" }) {
  const [tab, setTab] = useState<"ai" | "media">(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] px-2 py-1.5">
        {(
          [
            { id: "ai" as const, label: "AI Director", icon: <IconSparkles width={12} height={12} /> },
            { id: "media" as const, label: "Media", icon: <IconImage width={12} height={12} /> },
          ]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium transition ${
              tab === t.id
                ? "bg-white/[0.07] text-white shadow-sm ring-1 ring-white/10"
                : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">{tab === "ai" ? <AIPanel /> : <MediaPanel />}</div>
    </div>
  );
}
