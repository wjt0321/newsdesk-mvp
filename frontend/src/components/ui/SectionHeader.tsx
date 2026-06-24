import clsx from "clsx";

interface SectionHeaderProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between mb-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-text-tertiary" />}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
