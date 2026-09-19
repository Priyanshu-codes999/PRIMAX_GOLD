import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/format";

export function SearchInput({
  className,
  icon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <div className={cn("relative", className)}>
      {icon}
      <input
        {...props}
        className={cn(
          "h-9 w-full rounded-lg border border-ink-700 bg-ink-900/70 text-[12px] text-fog-200",
          "placeholder:text-fog-600 focus:border-gold-400/40 focus:outline-none focus:ring-2 focus:ring-gold-400/12",
          icon ? "pl-9 pr-3" : "px-3",
        )}
      />
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className={cn(
          "h-9 w-full appearance-none rounded-lg border border-ink-700 bg-ink-900/70 px-3 pr-8",
          "text-[12px] text-fog-200 focus:border-gold-400/40 focus:outline-none focus:ring-2 focus:ring-gold-400/12",
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fog-500" />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-fog-200">{label}</p>
        {description ? <p className="mt-0.5 text-[11px] leading-relaxed text-fog-500">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-gold-400/50 bg-gold-400/80" : "border-ink-600 bg-ink-750",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[18px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-ink-700 bg-ink-900/60 p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors",
            size === "sm" ? "px-2.5 py-1 text-[10.5px]" : "px-3 py-1.5 text-[11.5px]",
            value === option.value
              ? "bg-ink-700 text-fog-100 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]"
              : "text-fog-500 hover:bg-ink-800 hover:text-fog-300",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "gain" | "loss" | "gold" | "info";
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-2",
        tone === "gain" && "border-gain-500/20 bg-gain-500/[0.07]",
        tone === "loss" && "border-loss-500/20 bg-loss-500/[0.07]",
        tone === "gold" && "border-gold-400/20 bg-gold-400/[0.07]",
        tone === "info" && "border-info-500/20 bg-info-500/[0.07]",
        tone === "neutral" && "border-ink-700 bg-ink-880",
      )}
    >
      {icon ? <span className="text-fog-500">{icon}</span> : null}
      <div>
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-fog-500">{label}</p>
        <div
          className={cn(
            "mt-0.5 font-mono text-[12.5px]",
            tone === "gain" && "text-gain-400",
            tone === "loss" && "text-loss-400",
            tone === "gold" && "text-gold-300",
            tone === "info" && "text-info-400",
            tone === "neutral" && "text-fog-200",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
