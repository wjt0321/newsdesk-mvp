import { useQuery } from "@tanstack/react-query";
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
      label: "Source health",
      value: enabled.length > 0 ? `${healthy}/${enabled.length} healthy` : "No sources",
      sub: problemCount > 0 ? `${problemCount} need attention` : "All good",
      icon: Activity,
      tone: problemCount > 0 ? "text-amber-600" : "text-emerald-600",
    },
    {
      label: "Fetched articles",
      value: totalArticles.toString(),
      sub: "Last 24 hours",
      icon: Database,
      tone: "text-blue-600",
    },
    {
      label: "New stories",
      value: totalStories.toString(),
      sub: "Last 24 hours",
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
              {problemCount} source{problemCount > 1 ? "s" : ""} need attention
            </p>
            <p className="text-amber-700">{problems.map((s) => s.name).join(", ")}</p>
            <a href="#/sources" className="text-amber-800 underline hover:text-amber-900">
              Go to Sources →
            </a>
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
                {problemCount > 0 && item.label === "Source health" && (
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
