import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/format";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gold-400 text-ink-950 hover:bg-gold-300 border border-gold-400/70 shadow-[0_1px_0_rgba(255,255,255,0.18)_inset] font-semibold",
  secondary:
    "bg-ink-750 text-fog-200 hover:bg-ink-700 border border-ink-600/70 font-medium",
  outline:
    "bg-transparent text-fog-300 hover:bg-ink-800 border border-ink-600/80 font-medium",
  ghost: "bg-transparent text-fog-300 hover:bg-ink-800 hover:text-fog-100 border border-transparent",
  danger:
    "bg-loss-500/12 text-loss-300 hover:bg-loss-500/20 border border-loss-500/35 font-medium",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400/70",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-inherit",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent",
        "text-fog-400 transition-colors hover:border-ink-600/70 hover:bg-ink-800 hover:text-fog-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400/60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
  size = "md",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "gain" | "loss" | "info" | "warn";
  className?: string;
  size?: "sm" | "md";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink-750 text-fog-300 border-ink-600/70",
    gold: "bg-gold-400/12 text-gold-300 border-gold-400/25",
    gain: "bg-gain-500/12 text-gain-300 border-gain-500/25",
    loss: "bg-loss-500/12 text-loss-300 border-loss-500/25",
    info: "bg-info-500/12 text-info-400 border-info-500/25",
    warn: "bg-warn-400/12 text-warn-400 border-warn-400/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
