import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listSources,
  createSource,
  updateSource,
  deleteSource,
  triggerFetch,
  listSourceHealth,
} from "../api/sources";
import { formatRelativeTime } from "../lib/format";
import { badgeClassName, type StatusTone } from "../lib/statusStyles";
import type { Source } from "../api/types";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import {
  Loader2,
  RefreshCw,
  Radio,
  Plus,
  Power,
  PowerOff,
  AlertCircle,
  Clock,
  CheckCircle2,
  PauseCircle,
  Trash2,
  ChevronUp,
  Filter,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { openExternal } from "../lib/openExternal";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

type Health = "healthy" | "delayed" | "failing" | "paused";

function getSourceHealth(source: Source): Health {
  if (!source.enabled) return "paused";
  if (source.error_count > 0) return "failing";
  if (!source.last_fetched_at) return "delayed";
  const lastFetched = new Date(source.last_fetched_at).getTime();
  if (Date.now() - lastFetched > TWO_HOURS_MS) return "delayed";
  return "healthy";
}

const HEALTH_CONFIG: Record<
  Health,
  { label: string; icon: typeof CheckCircle2; tone: StatusTone }
> = {
  healthy: {
    label: "健康",
    icon: CheckCircle2,
    tone: "success",
  },
  delayed: {
    label: "延迟",
    icon: Clock,
    tone: "warning",
  },
  failing: {
    label: "故障",
    icon: AlertCircle,
    tone: "danger",
  },
  paused: {
    label: "已暂停",
    icon: PauseCircle,
    tone: "neutral",
  },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "出了点问题，请重试。";
}

const CATEGORY_MAP: Record<string, string> = {
  general: "综合",
  tech: "科技",
  technology: "科技",
  global: "全球",
  world: "全球",
  finance: "财经",
  games: "游戏",
  gaming: "游戏",
  science: "科学",
  sports: "体育",
  entertainment: "娱乐",
  politics: "政治",
  life: "生活",
  lifestyle: "生活",
  social: "社交",
};

function formatCategory(category: string): string {
  return CATEGORY_MAP[category.toLowerCase()] || category;
}

type HealthFilter = "all" | Health;

export function SourcesPage() {
  const queryClient = useQueryClient();

  const {
    data: sources = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["sources"],
    queryFn: listSources,
  });

  const { data: healthData = [] } = useQuery({
    queryKey: ["source-health"],
    queryFn: listSourceHealth,
  });

  const healthBySourceId = new Map(healthData.map((h) => [h.id, h]));

  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredSources = useMemo(() => {
    let result = sources;

    if (healthFilter !== "all") {
      result = result.filter((s) => getSourceHealth(s) === healthFilter);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sources, healthFilter, searchText]);

  const [form, setForm] = useState({
    name: "",
    url: "",
    category: "general",
    type: "rss",
    language: "zh",
    region: "CN",
  });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryInput, setCategoryInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createMutation = useMutation({
    mutationFn: createSource,
    onSuccess: () => {
      setMutationError(null);
      toast.success("来源已添加");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["source-health"] });
      setForm({
        name: "",
        url: "",
        category: "general",
        type: "rss",
        language: "zh",
        region: "CN",
      });
      setShowAddForm(false);
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      toast.error(`添加来源失败：${message}`);
      console.error("Failed to create source:", err);
    },
  });

  const fetchMutation = useMutation({
    mutationFn: triggerFetch,
    onSuccess: () => {
      setMutationError(null);
      toast.success("已开始后台抓取，稍后刷新查看最新数据");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["source-health"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      toast.error(`抓取失败：${message}`);
      console.error("Failed to fetch source:", err);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      updateSource(id, { enabled: !enabled }),
    onSuccess: () => {
      setMutationError(null);
      toast.success("状态已更新");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["source-health"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      toast.error(`更新状态失败：${message}`);
      console.error("Failed to toggle source:", err);
    },
  });

  const categoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: number; category: string }) =>
      updateSource(id, { category }),
    onSuccess: () => {
      setMutationError(null);
      setEditingCategoryId(null);
      toast.success("分类已更新");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      toast.error(`更新分类失败：${message}`);
      console.error("Failed to update source category:", err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      setMutationError(null);
      toast.success("来源已删除");
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["source-health"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      toast.error(`删除来源失败：${message}`);
      console.error("Failed to delete source:", err);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;
    setMutationError(null);
    createMutation.mutate(form);
  }

  function handleRetry() {
    queryClient.invalidateQueries({ queryKey: ["sources"] });
    queryClient.invalidateQueries({ queryKey: ["stories"] });
    queryClient.invalidateQueries({ queryKey: ["source-health"] });
  }

  const healthCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sources.length };
    for (const s of sources) {
      const h = getSourceHealth(s);
      counts[h] = (counts[h] || 0) + 1;
    }
    return counts;
  }, [sources]);

  const activeFilterCount = healthFilter !== "all" || searchText.trim().length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
            来源管理
          </p>
          <h2 className="text-2xl font-semibold">来源</h2>
          <p className="text-sm text-text-secondary mt-1">
            {sources.length} 个来源
            {activeFilterCount && (
              <span className="text-accent ml-1">
                · 已筛选 {filteredSources.length} 个
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className={clsx(
            "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors",
            showAddForm
              ? "bg-accent text-white border-accent hover:bg-accent/90"
              : "bg-surface border-border text-text-primary hover:border-accent hover:text-accent"
          )}
        >
          {showAddForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "收起" : "添加来源"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">添加来源</h3>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="名称"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
                required
              />
              <input
                type="url"
                placeholder="链接"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
                required
              />
              <input
                type="text"
                placeholder="分类"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
              />
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
              >
                <option value="rss">rss</option>
                <option value="rsshub">rsshub</option>
              </select>

              {showAdvanced && (
                <>
                  <input
                    type="text"
                    placeholder="语言"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="地区"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
                  />
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-text-secondary hover:text-accent underline"
              >
                {showAdvanced ? "隐藏高级选项" : "高级选项"}
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                添加来源
              </button>
            </div>
          </div>
        </form>
      )}

      {mutationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">操作失败</p>
            <p className="text-sm text-red-700">{mutationError}</p>
          </div>
          <button
            onClick={() => setMutationError(null)}
            className="text-sm text-red-700 hover:text-red-900 font-medium"
          >
            关闭
          </button>
        </div>
      )}

      {isLoading ? (
        <PageLoading label="正在加载来源..." />
      ) : isError ? (
        <PageError
          title="加载来源失败"
          description={error instanceof Error ? error.message : "出了点问题，请重试。"}
          onRetry={handleRetry}
        />
      ) : sources.length > 0 ? (
        <>
          <div className="mb-5 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                placeholder="搜索名称、链接或分类..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-surface border border-border rounded-lg outline-none focus:border-accent transition-colors"
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  className="text-xs text-text-secondary hover:text-accent"
                >
                  清除
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-text-tertiary" />
              {(Object.entries(HEALTH_CONFIG) as [Health, typeof HEALTH_CONFIG[Health]][]).map(
                ([key, cfg]) => {
                  const count = healthCounts[key] || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => setHealthFilter(healthFilter === key ? "all" : key)}
                      className={clsx(
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors",
                        healthFilter === key
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface text-text-secondary hover:border-accent/50 hover:text-accent"
                      )}
                    >
                      <cfg.icon className="w-3 h-3" />
                      {cfg.label}
                      <span className="tabular-nums">{count}</span>
                    </button>
                  );
                }
              )}
              {activeFilterCount && (
                <button
                  onClick={() => {
                    setHealthFilter("all");
                    setSearchText("");
                  }}
                  className="text-xs text-text-secondary hover:text-accent underline"
                >
                  重置筛选
                </button>
              )}
            </div>
          </div>

          {filteredSources.length === 0 ? (
            <PageEmpty
              icon={Filter}
              title="没有匹配的来源"
              description="尝试调整筛选条件或搜索关键词。"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSources.map((source) => {
                const health = getSourceHealth(source);
                const healthCfg = HEALTH_CONFIG[health];
                const HealthIcon = healthCfg.icon;
                const sourceHealth = healthBySourceId.get(source.id);
                const latestError = sourceHealth?.latest_error;
                const isFetching =
                  fetchMutation.isPending && fetchMutation.variables === source.id;
                const isToggling =
                  toggleMutation.isPending &&
                  toggleMutation.variables?.id === source.id;
                const isDeleting =
                  deleteMutation.isPending &&
                  deleteMutation.variables === source.id;

                return (
                  <div
                    key={source.id}
                    className="bg-surface border border-border rounded-xl p-4 hover:shadow-sm hover:border-accent/20 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link
                        to={`/sources/${source.id}`}
                        className="font-medium text-sm text-text-primary hover:text-accent transition-colors line-clamp-1 min-w-0 flex-1"
                        title={source.name}
                      >
                        {source.name}
                      </Link>
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                          badgeClassName(healthCfg.tone)
                        )}
                      >
                        <HealthIcon className="w-3 h-3" />
                        {healthCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
                      <span className="capitalize">
                        {source.type === "rsshub" ? "RSSHub" : source.type.toUpperCase()}
                      </span>
                      <span className="text-text-tertiary">·</span>
                      {editingCategoryId === source.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            categoryMutation.mutate({
                              id: source.id,
                              category: categoryInput.trim() || source.category,
                            });
                          }}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            value={categoryInput}
                            onChange={(e) => setCategoryInput(e.target.value)}
                            className="w-16 px-1.5 py-0.5 text-xs bg-background border border-accent rounded outline-none"
                            autoFocus
                            onBlur={() => {
                              if (!categoryMutation.isPending) {
                                categoryMutation.mutate({
                                  id: source.id,
                                  category: categoryInput.trim() || source.category,
                                });
                              }
                              setEditingCategoryId(null);
                            }}
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCategoryId(source.id);
                            setCategoryInput(source.category);
                          }}
                          className="hover:text-accent hover:underline"
                          title="点击编辑分类"
                        >
                          {formatCategory(source.category)}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-text-tertiary mb-3">
                      <span className="tabular-nums">
                        {source.last_fetched_at
                          ? formatRelativeTime(source.last_fetched_at)
                          : "从未抓取"}
                      </span>
                      {source.error_count > 0 && (
                        <>
                          <span className="text-text-tertiary">·</span>
                          <span className="text-red-600 tabular-nums">
                            {source.error_count} 错误
                          </span>
                        </>
                      )}
                    </div>

                    {latestError && (
                      <p className="text-[11px] text-red-600 line-clamp-1 mb-3" title={latestError}>
                        {latestError}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 border-t border-border">
                      <button
                        onClick={() => openExternal(source.url)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-accent rounded-md hover:bg-surface-subtle transition-colors"
                        title="打开链接"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: source.id,
                            enabled: source.enabled,
                          })
                        }
                        disabled={isToggling}
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-colors disabled:opacity-50",
                          source.enabled
                            ? "text-text-secondary hover:text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        )}
                        title={source.enabled ? "禁用" : "启用"}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : source.enabled ? (
                          <PowerOff className="w-3 h-3" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">
                          {source.enabled ? "禁用" : "启用"}
                        </span>
                      </button>
                      <button
                        onClick={() => fetchMutation.mutate(source.id)}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-accent rounded-md hover:bg-surface-subtle transition-colors disabled:opacity-50"
                        title="立即抓取"
                      >
                        <RefreshCw
                          className={clsx("w-3 h-3", isFetching && "animate-spin")}
                        />
                        <span className="hidden sm:inline">抓取</span>
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => {
                          if (window.confirm(`确定要删除来源 "${source.name}" 吗？相关文章与抓取日志也会被一并删除。`)) {
                            deleteMutation.mutate(source.id);
                          }
                        }}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-text-secondary hover:text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                        title="删除"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <PageEmpty
          icon={Radio}
          title="暂无来源"
          description="先添加 RSS 或 RSSHub 来源，这里会逐步形成你的来源目录。"
        >
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加来源
          </button>
        </PageEmpty>
      )}
    </div>
  );
}
