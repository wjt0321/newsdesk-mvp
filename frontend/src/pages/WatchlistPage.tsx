import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listWatchRules,
  createWatchRule,
  updateWatchRule,
  deleteWatchRule,
  getWatchRuleStories,
} from "../api/watchRules";
import { StoryCard } from "../components/StoryCard";
import { StoryDrawer } from "../components/StoryDrawer";
import { SectionHeader } from "../components/ui/SectionHeader";
import type { Story } from "../api/types";
import { PageEmpty, PageError, PageLoading } from "../components/ui/PageStatus";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Bell,
  ChevronRight,
  ChevronUp,
  Tag,
} from "lucide-react";
import clsx from "clsx";
import { badgeClassName } from "../lib/statusStyles";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "出了点问题，请重试。";
}

export function WatchlistPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [form, setForm] = useState({ name: "", keywords: "" });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    data: rules = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["watch-rules"],
    queryFn: listWatchRules,
  });

  // Derive selected rule: user pick > first available
  const selectedRule = rules.find((r) => r.id === selectedId) ?? rules[0] ?? null;

  const {
    data: stories = [],
    isLoading: storiesLoading,
    isError: storiesError,
    refetch: refetchStories,
  } = useQuery({
    queryKey: ["watch-rules", selectedRule?.id, "stories"],
    queryFn: () => getWatchRuleStories(selectedRule!.id, 50),
    enabled: !!selectedRule,
  });

  const createMutation = useMutation({
    mutationFn: createWatchRule,
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["watch-rules"] });
      setForm({ name: "", keywords: "" });
      setShowAddForm(false);
    },
    onError: (err: unknown) => {
      setMutationError(getErrorMessage(err));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      updateWatchRule(id, { enabled: !enabled }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["watch-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["watch-rules", vars.id, "stories"],
      });
    },
    onError: (err: unknown) => {
      setMutationError(getErrorMessage(err));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWatchRule,
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["watch-rules"] });
      setSelectedId(null);
    },
    onError: (err: unknown) => {
      setMutationError(getErrorMessage(err));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.keywords.trim()) return;
    createMutation.mutate({
      name: form.name.trim(),
      keywords: form.keywords.trim(),
    });
  }

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
            关注管理
          </p>
          <h2 className="text-2xl font-semibold">关注列表</h2>
          <p className="text-sm text-text-secondary mt-1">
            {rules.length} 条规则
            {enabledCount > 0 && (
              <span className="text-text-tertiary ml-1">
                · {enabledCount} 条启用
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
          {showAddForm ? "收起" : "添加规则"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold">添加关注规则</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            <input
              type="text"
              placeholder="规则名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="sm:col-span-2 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
              required
            />
            <input
              type="text"
              placeholder="关键词（用逗号分隔）"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              className="sm:col-span-4 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent transition-colors"
              required
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              添加
            </button>
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
        <PageLoading label="正在加载关注规则..." />
      ) : isError ? (
        <PageError
          title="加载关注规则失败"
          description={error instanceof Error ? error.message : "出了点问题，请重试。"}
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["watch-rules"] })}
        />
      ) : rules.length === 0 ? (
        <PageEmpty
          icon={Bell}
          title="暂无关注规则"
          description="添加关键词规则后，系统会自动匹配 incoming 报道并展示在这里。"
        >
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加规则
          </button>
        </PageEmpty>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Bell className="w-4 h-4 text-accent" />
                  规则列表
                </div>
              </div>
              <div className="divide-y divide-border">
                {rules.map((rule) => {
                  const isSelected = selectedRule?.id === rule.id;
                  const isToggling =
                    toggleMutation.isPending &&
                    toggleMutation.variables?.id === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className={clsx(
                        "px-4 py-3 transition-colors",
                        isSelected
                          ? "bg-surface-subtle"
                          : "hover:bg-background/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedId(rule.id);
                            setSelectedStory(null);
                          }}
                          className="flex-1 text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <p
                              className={clsx(
                                "text-sm font-medium truncate",
                                isSelected
                                  ? "text-accent"
                                  : "text-text-primary"
                              )}
                            >
                              {rule.name}
                            </p>
                            <ChevronRight className={clsx(
                              "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                              isSelected ? "text-accent" : "text-text-tertiary opacity-0 group-hover:opacity-100"
                            )} />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Tag className="w-3 h-3 text-text-tertiary" />
                            <p className="text-xs text-text-secondary line-clamp-1">
                              {rule.keywords}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() =>
                              toggleMutation.mutate({
                                id: rule.id,
                                enabled: rule.enabled,
                              })
                            }
                            disabled={isToggling}
                            className={clsx(
                              "p-1.5 rounded-md transition-colors disabled:opacity-50",
                              rule.enabled
                                ? "text-green-600 hover:bg-green-50"
                                : "text-text-secondary hover:bg-background"
                            )}
                            title={rule.enabled ? "禁用" : "启用"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : rule.enabled ? (
                              <Power className="w-3.5 h-3.5" />
                            ) : (
                              <PowerOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(rule.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            rule.enabled
                              ? badgeClassName("success")
                              : badgeClassName("neutral")
                          )}
                        >
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {rule.enabled ? "已启用" : "已禁用"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9">
            {storiesLoading ? (
              <PageLoading label="正在加载匹配报道..." />
            ) : storiesError ? (
              <PageError title="加载匹配报道失败" onRetry={() => refetchStories()} />
            ) : stories.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <SectionHeader
                      title={selectedRule?.name || ""}
                      icon={Eye}
                      className="mb-1"
                    />
                    <p className="text-xs text-text-tertiary">
                      {stories.length} 条匹配报道
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {stories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      variant="compact"
                      onClick={() => setSelectedStory(story)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <PageEmpty
                icon={Eye}
                title="没有匹配该规则的报道"
                description="可以稍后重试，或调整关键词范围以扩大匹配结果。"
              />
            )}
          </div>
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
