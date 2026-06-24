import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface HealthMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
  active?: boolean;
  onClick?: () => void;
}

const toneClasses = {
  default: "text-text-primary",
  success: "text-emerald-600",
  warning: "text-amber",
  danger: "text-danger",
  muted: "text-text-secondary",
};

export function HealthMetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  active,
  onClick,
}: HealthMetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
        active
          ? "bg-surface border-accent shadow-sm"
          : "bg-surface border-border hover:border-accent/30 hover:shadow-sm"
      )}
    >
      <div
        className={clsx(
          "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-surface-subtle",
          toneClasses[tone]
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-text-tertiary uppercase tracking-wide">
          {label}
        </p>
        <p
          className={clsx(
            "text-lg font-semibold tabular-nums leading-tight",
            toneClasses[tone]
          )}
        >
          {value}
        </p>
      </div>
    </button>
  );
}
