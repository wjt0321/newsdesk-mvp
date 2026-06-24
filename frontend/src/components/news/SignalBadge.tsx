import clsx from "clsx";
import {
  Newspaper,
  ExternalLink,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

type SignalType =
  | "sources"
  | "articles"
  | "heat"
  | "confidence"
  | "time"
  | "review"
  | "healthy";

interface SignalBadgeProps {
  type: SignalType;
  value: string | number;
  className?: string;
}

const config: Record<
  SignalType,
  { icon: LucideIcon; label?: string; tone: string }
> = {
  sources: { icon: Newspaper, tone: "text-text-secondary" },
  articles: { icon: ExternalLink, tone: "text-text-secondary" },
  heat: { icon: Flame, tone: "text-amber" },
  confidence: { icon: CheckCircle2, tone: "text-text-secondary" },
  time: { icon: Clock, tone: "text-text-tertiary" },
  review: { icon: AlertTriangle, tone: "text-amber" },
  healthy: { icon: CheckCircle2, tone: "text-emerald-600" },
};

export function SignalBadge({ type, value, className }: SignalBadgeProps) {
  const { icon: Icon, tone } = config[type];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs tabular-nums",
        tone,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {value}
    </span>
  );
}

interface SignalGroupProps {
  story: {
    source_count: number;
    article_count: number;
    heat_score: number;
    confidence: number;
    needs_review: boolean;
  };
  showTime?: boolean;
  time?: string;
  className?: string;
}

export function SignalGroup({
  story,
  showTime,
  time,
  className,
}: SignalGroupProps) {
  return (
    <div className={clsx("flex items-center gap-3 flex-wrap", className)}>
      <SignalBadge type="sources" value={story.source_count} />
      <SignalBadge type="articles" value={story.article_count} />
      <SignalBadge type="heat" value={story.heat_score.toFixed(1)} />
      {story.needs_review ? (
        <SignalBadge type="review" value="待复核" />
      ) : story.confidence < 0.7 ? (
        <SignalBadge type="confidence" value={`${(story.confidence * 100).toFixed(0)}%`} />
      ) : null}
      {showTime && time && <SignalBadge type="time" value={time} />}
    </div>
  );
}
