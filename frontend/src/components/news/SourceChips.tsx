interface SourceChipsProps {
  names: string[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

export function SourceChips({
  names,
  max = 4,
  size = "sm",
  className,
}: SourceChipsProps) {
  if (names.length === 0) return null;

  const visible = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className ?? ""}`}>
      {visible.map((name) => (
        <span
          key={name}
          className={`
            inline-flex items-center rounded-md bg-surface-subtle border border-border
            text-text-secondary truncate max-w-[120px]
            ${size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1"}
          `}
          title={name}
        >
          {name}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-[11px] text-text-tertiary">
          +{remaining}
        </span>
      )}
    </div>
  );
}
