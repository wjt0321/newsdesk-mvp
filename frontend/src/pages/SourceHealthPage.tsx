import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  VolumeX,
  Megaphone,
  Ban,
  Database,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listSourceHealth } from "../api/sources";
import { HealthMetricCard } from "../components/health/HealthMetricCard";
import { SourceActionBadge } from "../components/health/SourceActionBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import clsx from "clsx";

type HealthStatus = "healthy" | "degraded" | "broken" | "silent" | "noisy" | "disabled";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "danger" | "muted";
}

const statusConfig: Record<HealthStatus, StatusConfig> = {
  healthy: { label: "健康", icon: CheckCircle2, tone: "success" },
  degraded: { label: "降级", icon: AlertTriangle, tone: "warning" },
  broken: { label: "损坏", icon: XCircle, tone: "danger" },
  silent: { label: "静默", icon: VolumeX, tone: "muted" },
  noisy: { label: "嘈杂", icon: Megaphone, tone: "warning" },
  disabled: { label: "已禁用", icon: Ban, tone: "muted" },
};

const statusOrder: HealthStatus[] = [
  "broken",
  "degraded",
  "silent",
  "noisy",
  "healthy",
  "disabled",
];

export function SourceHealthPage() {
  const [statusFilter, setStatusFilter] = useState<HealthStatus | "all">("all");
  const { data: health = [], isLoading, error, refetch } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  const enabled = useMemo(() => health.filter((h) => h.enabled), [health]);
  const disabled = useMemo(() => health.filter((h) => !h.enabled), [health]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    health.forEach((h) => {
      map[h.status] = (map[h.status] || 0) + 1;
    });
    return map;
  }, [health]);

  const totalArticles = useMemo(
    () => health.reduce((sum, h) => sum + h.article_count_24h, 0),
    [health]
  );

  const sortedHealth = useMemo(() => {
    const sorted = [...health].sort((a, b) => {
      const idxA = statusOrder.indexOf(a.status);
      const idxB = statusOrder.indexOf(b.status);
      if (idxA !== idxB) return idxA - idxB;
      return b.error_count - a.error_count;
    });

    return statusFilter === "all"
      ? sorted
      : sorted.filter((h) => h.status === statusFilter);
  }, [health, statusFilter]);

  const allHealthy = enabled.length > 0 && enabled.every((h) => h.status === "healthy");

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-surface rounded mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-2">来源健康度</h2>
        <div className="bg-surface border border-danger/20 rounded-2xl p-6 text-danger">
          <p className="font-medium">加载来源健康度失败</p>
          <p className="text-sm text-text-secondary mb-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">来源健康度</h1>
        <p className="text-sm text-text-secondary mt-1">
          {enabled.length} 个已启用来源 · {disabled.length} 个已禁用 · {totalArticles} 篇文章（最近24小时）
        </p>
      </div>

      <section className="mb-6">
        <SectionHeader title="健康指标" icon={Activity} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <HealthMetricCard
            icon={CheckCircle2}
            label="健康"
            value={counts.healthy || 0}
            tone="success"
            active={statusFilter === "healthy"}
            onClick={() => toggleFilter("healthy")}
          />
          <HealthMetricCard
            icon={XCircle}
            label="损坏"
            value={counts.broken || 0}
            tone="danger"
            active={statusFilter === "broken"}
            onClick={() => toggleFilter("broken")}
          />
          <HealthMetricCard
            icon={VolumeX}
            label="静默"
            value={counts.silent || 0}
            tone="muted"
            active={statusFilter === "silent"}
            onClick={() => toggleFilter("silent")}
          />
          <HealthMetricCard
            icon={Megaphone}
            label="嘈杂"
            value={counts.noisy || 0}
            tone="warning"
            active={statusFilter === "noisy"}
            onClick={() => toggleFilter("noisy")}
          />
          <HealthMetricCard
            icon={Ban}
            label="已禁用"
            value={counts.disabled || 0}
            tone="muted"
            active={statusFilter === "disabled"}
            onClick={() => toggleFilter("disabled")}
          />
          <HealthMetricCard
            icon={Database}
            label="24h 文章"
            value={totalArticles}
            tone="default"
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          />
        </div>
      </section>

      <section className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", ...statusOrder] as const).map((status) => {
            const isAll = status === "all";
            const config = isAll ? null : statusConfig[status as HealthStatus];
            const active = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  active
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-surface border-border text-text-secondary hover:text-text-primary hover:border-accent/30"
                )}
              >
                {isAll ? "全部" : config!.label}
                {!isAll && (
                  <span
                    className={clsx(
                      "ml-1.5 tabular-nums",
                      active ? "text-white/80" : "text-text-tertiary"
                    )}
                  >
                    {counts[status] || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {allHealthy && statusFilter === "all" && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            暂无需要处理的来源，所有启用来源均健康。
          </p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-surface-subtle/70 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-text-secondary w-[22%] whitespace-nowrap">
                来源
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary w-[10%] whitespace-nowrap">
                分类
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary w-[10%] whitespace-nowrap">
                状态
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary w-[10%] whitespace-nowrap">
                24h 文章
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary w-[10%] whitespace-nowrap">
                24h 报道
              </th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary w-[8%] whitespace-nowrap">
                错误
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary w-[16%] whitespace-nowrap">
                上次成功 / 错误摘要
              </th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary w-[18%] whitespace-nowrap">
                建议操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedHealth.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-text-secondary">
                  <EmptyState
                    icon={CheckCircle2}
                    title="没有符合条件的数据"
                    description="调整筛选条件或等待新的抓取结果。"
                  />
                </td>
              </tr>
            )}
            {sortedHealth.map((source) => {
              const config = statusConfig[source.status] || statusConfig.disabled;
              return (
                <tr key={source.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <Link
                      to={`/sources/${source.id}`}
                      className="font-medium text-text-primary truncate hover:text-accent hover:underline"
                    >
                      {source.name}
                    </Link>
                    <p className="text-xs text-text-tertiary truncate max-w-[260px]">
                      {source.url}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top text-text-secondary whitespace-nowrap">
                    {source.category}
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        toneBg(config.tone)
                      )}
                    >
                      <config.icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                    {source.article_count_24h}
                  </td>
                  <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                    {source.story_count_24h}
                  </td>
                  <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                    <span className={source.error_count > 0 ? "text-danger font-medium" : ""}>
                      {source.error_count}
                    </span>
                    {source.consecutive_failures > 0 && (
                      <span className="block text-xs text-text-tertiary">
                        {source.consecutive_failures} 次连续失败
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="text-text-secondary text-xs whitespace-nowrap">
                      {source.last_success_at
                        ? new Date(source.last_success_at).toLocaleString("zh-CN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "从未"}
                    </p>
                    {source.latest_error && (
                      <p
                        className="text-xs text-danger mt-1 max-w-[240px] truncate"
                        title={source.latest_error}
                      >
                        {source.latest_error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <SourceActionBadge action={source.suggested_action} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  function toggleFilter(status: HealthStatus) {
    setStatusFilter((current) => (current === status ? "all" : status));
  }
}

function toneBg(tone: StatusConfig["tone"]): string {
  switch (tone) {
    case "success":
      return "bg-emerald-50 text-emerald-700";
    case "warning":
      return "bg-amber/10 text-amber";
    case "danger":
      return "bg-red-100 text-danger";
    case "muted":
      return "bg-surface-subtle text-text-secondary";
    default:
      return "bg-surface-subtle text-text-secondary";
  }
}
