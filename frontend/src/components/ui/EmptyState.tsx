import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center">
      <Icon className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
      <h3 className="text-base font-semibold text-text-primary mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
