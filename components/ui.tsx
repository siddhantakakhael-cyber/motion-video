"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { SWATCHES } from "@/lib/types";

type Variant = "primary" | "default" | "ghost" | "danger" | "soft";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_24px_-8px_rgba(139,92,246,0.8)] hover:from-violet-400 hover:to-violet-500",
  default:
    "bg-ink-700 text-zinc-200 ring-1 ring-white/10 hover:bg-ink-600 hover:text-white",
  ghost: "text-zinc-400 hover:bg-white/5 hover:text-white",
  danger: "bg-red-500/10 text-red-300 ring-1 ring-red-400/20 hover:bg-red-500/20 hover:text-red-200",
  soft: "bg-violet-500/10 text-violet-200 ring-1 ring-violet-400/20 hover:bg-violet-500/20",
};

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "h-7 px-2.5 text-[11px] gap-1.5 rounded-md",
    md: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    lg: "h-10 px-4 text-sm gap-2 rounded-xl",
  };
  return (
    <button
      {...rest}
      className={`inline-flex select-none items-center justify-center font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  active,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      {...rest}
      title={label}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-500" title={hint}>
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? <Label hint={hint}>{label}</Label> : null}
      {children}
    </div>
  );
}

const inputBase =
  "h-8 w-full rounded-lg border border-white/10 bg-ink-900/80 px-2.5 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/15";

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${inputBase} ${className}`} />;
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  className = "",
  onEditStart,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  className?: string;
  onEditStart?: () => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(Math.round(value * 100) / 100));
  }, [value, focused]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    else setDraft(String(value));
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="number"
        value={draft}
        step={step}
        min={min}
        max={max}
        onFocus={() => {
          setFocused(true);
          onEditStart?.();
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          if (e.target.value !== "" && e.target.value !== "-") commit(e.target.value);
        }}
        className={`${inputBase} pr-7 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  onCommit?: () => void;
}) {
  return (
    <input
      type="range"
      className="studio-range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerDown={() => onCommit?.()}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex rounded-lg bg-ink-900/80 p-0.5 ring-1 ring-white/10 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`flex h-7 flex-1 items-center justify-center gap-1 rounded-[6px] px-2 text-[11px] font-medium transition-colors ${
            value === opt.value
              ? "bg-ink-600 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`h-8 w-full rounded-lg border border-white/10 bg-ink-900/80 px-2.5 text-xs text-zinc-200 outline-none transition focus:border-violet-400/60 [&>option]:bg-ink-850 ${className}`}
    >
      {children}
    </select>
  );
}

export function ColorInput({
  value,
  onChange,
  allowAlpha = false,
}: {
  value: string;
  onChange: (v: string) => void;
  allowAlpha?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Pick a colour"
        onClick={() => setOpen((o) => !o)}
        className="h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/15 transition hover:ring-white/40"
        style={{
          background:
            "conic-gradient(#3f3f46 25%, #18181b 0 50%, #3f3f46 0 75%, #18181b 0) 0 0/8px 8px",
        }}
      >
        <span className="block h-full w-full" style={{ background: value }} />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={`${inputBase} font-mono text-[11px]`}
      />
      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-white/10 bg-ink-850 p-2 shadow-2xl">
            <div className="grid grid-cols-5 gap-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="h-6 w-full rounded-md ring-1 ring-white/10 transition hover:scale-105"
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
              {allowAlpha ? "Type any CSS colour — rgba() supported." : "Type any hex value."}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs text-zinc-300"
    >
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          checked ? "bg-violet-500" : "bg-ink-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            checked ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3.5 pb-2 pt-3.5">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{title}</h3>
      {action}
    </div>
  );
}

export function Divider() {
  return <div className="mx-3.5 my-3 h-px bg-white/[0.06]" />;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-4 text-[11px] leading-relaxed text-zinc-500">
      {children}
    </p>
  );
}
