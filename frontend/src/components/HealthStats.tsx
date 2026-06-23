import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, Database, Layers, AlertTriangle } from "lucide-react";
import { listSourceHealth } from "../api/sources";

export function HealthStats() {
  const { data: health = [], isLoading } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-surface border border-border rounded-xl" />
        ))}
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

  const items = [
    {
      label: "来源健康",
      value: enabled.length > 0 ? `${healthy}/${enabled.length} 健康` : "无来源",
      sub: problemCount > 0 ? `${problemCount} 个需要关注` : "正常",
      icon: Activity,
      tone: problemCount > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "已抓取文章",
      value: totalArticles.toString(),
      sub: "最近24小时",
      icon: Database,
      tone: "text-blue-600",
    },
    {
      label: "新报道",
      value: totalStories.toString(),
      sub: "最近24小时",
      icon: Layers,
      tone: "text-violet-600",
    },
  ];

  return (
    <div className="mb-6">
      {problemCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">
              {problemCount} 个来源需要关注
            </p>
            <p className="text-amber-700">{problems.map((s) => s.name).join(", ")}</p>
            <Link to="/sources" className="text-amber-800 underline hover:text-amber-900">
              前往来源管理 →
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-lg bg-background ${item.tone}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">{item.label}</p>
              <p className="text-lg font-semibold text-text-primary">{item.value}</p>
              <p className="text-xs text-text-secondary flex items-center gap-1">
                {problemCount > 0 && item.label === "来源健康" && (
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                )}
                {item.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
