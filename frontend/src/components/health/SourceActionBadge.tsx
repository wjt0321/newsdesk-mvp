import clsx from "clsx";

interface SourceActionBadgeProps {
  action: string;
  className?: string;
}

export function SourceActionBadge({ action, className }: SourceActionBadgeProps) {
  const normalized = action.toLowerCase();

  let tone = "default";
  if (normalized.includes("替换") || normalized.includes("url") || normalized.includes("修复")) {
    tone = "primary";
  } else if (normalized.includes("禁用") || normalized.includes("暂停")) {
    tone = "danger";
  } else if (normalized.includes("降低") || normalized.includes("频率")) {
    tone = "warning";
  } else if (normalized.includes("观察") || normalized.includes("监控")) {
    tone = "muted";
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
        tone === "primary" && "bg-accent/10 text-accent",
        tone === "danger" && "bg-red-100 text-danger",
        tone === "warning" && "bg-amber/10 text-amber",
        tone === "muted" && "bg-surface-subtle text-text-secondary",
        tone === "default" && "bg-surface-subtle text-text-secondary",
        className
      )}
    >
      {action}
    </span>
  );
}
