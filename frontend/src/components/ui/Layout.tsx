import type { ReactNode } from "react";
import { cn } from "../../utils/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-ink-700/70 pb-5 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-400/85">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.015em] text-fog-100 sm:text-[25px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-fog-400">{description}</p>
        ) : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.15em] text-fog-300">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11px] text-fog-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  padded = true,
  flat = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  flat?: boolean;
}) {
  return (
    <section className={cn(flat ? "panel-flat" : "panel", padded && "p-4", className)}>
      {children}
    </section>
  );
}

export function KeyValueRow({
  label,
  value,
  valueClassName,
  labelClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  valueClassName?: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className={cn("text-[11.5px] text-fog-500", labelClassName)}>{label}</span>
      <span className={cn("text-right font-mono text-[12px] text-fog-200", valueClassName)}>{value}</span>
    </div>
  );
}
