import { useNavigate } from "react-router-dom";

interface Source {
  id: number;
  name: string;
}

interface SourceChipsProps {
  names?: string[];
  sources?: Source[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
  clickable?: boolean;
}

export function SourceChips({
  names,
  sources,
  max = 4,
  size = "sm",
  className,
  clickable = false,
}: SourceChipsProps) {
  const navigate = useNavigate();

  const items: Source[] =
    sources ||
    (names?.map((name) => ({ id: 0, name })) ?? []);

  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const remaining = items.length - max;

  function handleClick(e: React.MouseEvent, id: number) {
    if (!clickable || !id) return;
    e.stopPropagation();
    navigate(`/sources/${id}`);
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className ?? ""}`}>
      {visible.map((item) =>
        clickable && item.id ? (
          <button
            type="button"
            key={`${item.id}-${item.name}`}
            onClick={(e) => handleClick(e, item.id)}
            className={`
              inline-flex items-center rounded-md bg-surface-subtle border border-border
              text-text-secondary truncate max-w-[140px]
              ${size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1"}
              cursor-pointer hover:bg-accent/10 hover:text-accent hover:border-accent/30
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors
            `}
            aria-label={`打开来源：${item.name}`}
            title={item.name}
          >
            {item.name}
          </button>
        ) : (
          <span
            key={item.id ? `${item.id}-${item.name}` : item.name}
            className={`
              inline-flex items-center rounded-md bg-surface-subtle border border-border
              text-text-secondary truncate max-w-[140px]
              ${size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1"}
            `}
            title={item.name}
          >
            {item.name}
          </span>
        )
      )}
      {remaining > 0 && (
        <span className="text-[11px] text-text-tertiary">+{remaining}</span>
      )}
    </div>
  );
}
