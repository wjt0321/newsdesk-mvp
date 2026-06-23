import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { listSourceHealth } from "../api/sources";

const statusConfig: Record<
  string,
  { label: string; icon: typeof CheckCircle; tone: string }
> = {
  healthy: { label: "Healthy", icon: CheckCircle, tone: "text-emerald-600 bg-emerald-50" },
  degraded: { label: "Degraded", icon: AlertTriangle, tone: "text-amber-600 bg-amber-50" },
  broken: { label: "Broken", icon: XCircle, tone: "text-red-600 bg-red-50" },
  silent: { label: "Silent", icon: AlertTriangle, tone: "text-slate-600 bg-slate-50" },
  noisy: { label: "Noisy", icon: AlertTriangle, tone: "text-purple-600 bg-purple-50" },
  disabled: { label: "Disabled", icon: XCircle, tone: "text-text-secondary bg-background" },
};

export function SourceHealthPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: health = [], isLoading } = useQuery({
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
        <h2 className="text-2xl font-semibold">Source Health</h2>
        <p className="text-sm text-text-secondary">
          {enabled.length} enabled sources · {totalArticles} articles · {totalStories} stories in the last 24h
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
        <span className="text-sm text-text-secondary">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-surface"
        >
          <option value="all">All statuses</option>
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
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Source</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Category</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">24h Articles</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">24h Stories</th>
              <th className="text-right px-4 py-3 font-medium text-text-secondary">Errors</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Last Success</th>
              <th className="text-left px-4 py-3 font-medium text-text-secondary">Suggested Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
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
                        {source.consecutive_failures} consecutive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {source.last_success_at
                      ? new Date(source.last_success_at).toLocaleString()
                      : "Never"}
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
