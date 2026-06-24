import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Activity,
  Database,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import { listSourceHealth } from "../api/sources";
import { SectionHeader } from "./ui/SectionHeader";

export function HealthStats() {
  const { data: health = [], isLoading } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-24 bg-surface-subtle rounded mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-subtle rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const enabled = health.filter((h) => h.enabled);
  const healthy = enabled.filter((h) => h.status === "healthy").length;
  const problems = enabled.filter((h) =>
    ["broken", "degraded", "silent", "noisy"].includes(h.status)
  );
  const problemCount = problems.length;
  const totalArticles = health.reduce((sum, h) => sum + h.article_count_24h, 0);
  const totalStories = health.reduce((sum, h) => sum + h.story_count_24h, 0);

  return (
    <section className="bg-surface border border-border rounded-2xl p-5">
      <SectionHeader title="源健康摘要" icon={Activity} />

      {problemCount > 0 && (
        <div className="mb-4 bg-amber/5 border border-amber/20 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <div className="text-sm min-w-0">
            <p className="font-medium text-text-primary">
              {problemCount} 个来源需要关注
            </p>
            <p className="text-text-secondary truncate">
              {problems.map((s) => s.name).join(", ")}
            </p>
            <Link
              to="/source-health"
              className="text-xs text-accent hover:underline mt-1 inline-block"
            >
              查看详情 →
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <StatRow
          icon={CheckCircle2}
          label="健康来源"
          value={`${healthy}/${enabled.length}`}
          tone={problemCount > 0 ? "text-amber" : "text-emerald-600"}
        />
        <StatRow
          icon={Database}
          label="24h 文章"
          value={totalArticles.toString()}
          tone="text-accent"
        />
        <StatRow
          icon={Layers}
          label="24h 报道"
          value={totalStories.toString()}
          tone="text-text-primary"
        />
      </div>
    </section>
  );
}

interface StatRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}

function StatRow({ icon: Icon, label, value, tone }: StatRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-subtle/50">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon className="w-4 h-4 text-text-tertiary" />
        <span>{label}</span>
      </div>
      <span className={clsx("text-sm font-semibold tabular-nums", tone)}>
        {value}
      </span>
    </div>
  );
}
