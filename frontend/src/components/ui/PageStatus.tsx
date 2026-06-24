import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface PageLoadingProps {
  label?: string;
  className?: string;
}

interface PageErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  hint?: React.ReactNode;
  className?: string;
}

interface PageEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageLoading({
  label = "正在加载...",
  className = "py-20",
}: PageLoadingProps) {
  return (
    <div className={`flex items-center justify-center text-text-secondary ${className}`}>
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span>{label}</span>
    </div>
  );
}

export function PageError({
  title = "加载失败",
  description = "出了点问题，请重试。",
  onRetry,
  retryLabel = "重试",
  hint,
  className = "",
}: PageErrorProps) {
  return (
    <div
      className={`bg-surface border border-danger/20 rounded-2xl p-6 text-center ${className}`}
    >
      <AlertCircle className="w-8 h-8 text-danger mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary mb-4">{description}</p>
      {hint && <div className="text-xs text-text-tertiary mb-4">{hint}</div>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-danger text-white rounded-lg hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 transition-colors"
        >
          <Loader2 className="w-4 h-4" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function PageEmpty({
  icon,
  title,
  description,
  children,
  className = "",
}: PageEmptyProps) {
  return (
    <div className={className}>
      <EmptyState icon={icon} title={title} description={description}>
        {children}
      </EmptyState>
    </div>
  );
}
