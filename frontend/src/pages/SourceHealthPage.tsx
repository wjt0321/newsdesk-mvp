import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { listSourceHealth } from "../api/sources";

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle; tone: string }
> = {
  healthy: { label: "健康", icon: CheckCircle, tone: "text-emerald-600 bg-emerald-50" },
  degraded: { label: "降级", icon: AlertTriangle, tone: "text-amber-600 bg-amber-50" },
  broken: { label: "损坏", icon: XCircle, tone: "text-red-600 bg-red-50" },
  silent: { label: "静默", icon: AlertTriangle, tone: "text-slate-600 bg-slate-50" },
  noisy: { label: "嘈杂", icon: AlertTriangle, tone: "text-purple-600 bg-purple-50" },
  disabled: { label: "已禁用", icon: XCircle, tone: "text-text-secondary bg-background" },
};

export function SourceHealthPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: health = [], isLoading, error, refetch } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-surface rounded mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-2">来源健康度</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
          <p className="font-medium">加载来源健康度失败</p>
          <p className="text-sm mb-3">{error instanceof Error ? error.message : String(error)}</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm bg-white border border-red-200 rounded-lg hover:bg-red-100 transition"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const enabled = health.filter((h) => h.enabled);
  const byStatus: Record<string, number> = {};
  enabled.forEach((h) => {
    byStatus[h.status] = (byStatus[h.status] || 0) + 1;
  });

  const totalArticles = health.reduce((sum, h) => sum + h.article_count_24h, 0);
  const totalStories = health.reduce((sum, h) => sum + h.story_count_24h, 0);

  const filteredHealth =
    statusFilter === "all" ? health : health.filter((h) => h.status === statusFilter);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">来源健康度</h2>
        <p className="text-sm text-text-secondary">
          {enabled.length} 个已启用来源 · {totalArticles} 篇文章 · {totalStories} 条报道（最近24小时）
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(byStatus).map(([status, count]) => {
          const config = statusConfig[status] || statusConfig.disabled;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={`flex items-center gap-3 p-3 rounded-xl border border-border text-left transition ${
                statusFilter === status ? "ring-2 ring-accent" : ""
              } ${config.tone}`}
            >
              <config.icon className="w-5 h-5" />
              <div>
                <p className="text-xs opacity-80">{config.label}</p>
                <p className="text-lg font-semibold">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-text-secondary">筛选：</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-surface"
        >
          <option value="all">全部状态</option>
          {Object.keys(statusConfig).map((status) => (
            <option key={status} value={status}>
              {statusConfig[status]?.label || status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">来源</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">分类</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">状态</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">24小时文章</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">24小时报道</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">错误</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">上次成功</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">建议操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredHealth.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                  没有符合条件的数据
                </td>
              </tr>
            )}
            {filteredHealth.map((source) => {
              const config = statusConfig[source.status] || statusConfig.disabled;
              return (
                <tr key={source.id} className="hover:bg-background/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{source.name}</p>
                    <p className="text-xs text-text-secondary truncate max-w-[200px]">{source.url}</p>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{source.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.tone}`}>
                      <config.icon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{source.article_count_24h}</td>
                  <td className="px-4 py-3 text-right">{source.story_count_24h}</td>
                  <td className="px-4 py-3 text-right">
                    {source.error_count}
                    {source.consecutive_failures > 0 && (
                      <span className="block text-xs text-text-secondary">
                        {source.consecutive_failures} 次连续失败
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {source.last_success_at
                      ? new Date(source.last_success_at).toLocaleString()
                      : "从未"}
                    {source.latest_error && (
                      <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={source.latest_error}>
                        {source.latest_error}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-[240px]">
                    {source.suggested_action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
