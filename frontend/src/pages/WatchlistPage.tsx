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
import type { WatchRule, Story } from "../api/types";
import {
  Loader2,
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Eye,
  Bell,
} from "lucide-react";
import clsx from "clsx";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function WatchlistPage() {
  const queryClient = useQueryClient();
  const [selectedRule, setSelectedRule] = useState<WatchRule | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [form, setForm] = useState({ name: "", keywords: "" });
  const [mutationError, setMutationError] = useState<string | null>(null);

  const {
    data: rules = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["watch-rules"],
    queryFn: listWatchRules,
  });

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
      setSelectedRule(null);
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Watchlist</h2>
          <p className="text-sm text-text-secondary">
            Keyword rules that match incoming stories
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold">Add watch rule</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          <input
            type="text"
            placeholder="Rule name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="sm:col-span-2 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
            required
          />
          <input
            type="text"
            placeholder="Keywords (comma-separated)"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
            className="sm:col-span-4 px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
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
            Add
          </button>
        </div>
      </form>

      {mutationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Action failed</p>
            <p className="text-sm text-red-700">{mutationError}</p>
          </div>
          <button
            onClick={() => setMutationError(null)}
            className="text-sm text-red-700 hover:text-red-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading watch rules...
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            Failed to load watch rules
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {error instanceof Error ? error.message : "Something went wrong. Please try again."}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["watch-rules"] })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Bell className="w-4 h-4 text-accent" />
                  Rules
                </div>
              </div>
              <div className="divide-y divide-border">
                {rules.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-text-secondary">
                    No watch rules yet.
                  </div>
                ) : (
                  rules.map((rule) => {
                    const isToggling =
                      toggleMutation.isPending &&
                      toggleMutation.variables?.id === rule.id;
                    return (
                      <div
                        key={rule.id}
                        className={clsx(
                          "px-4 py-3 transition-colors",
                          selectedRule?.id === rule.id
                            ? "bg-blue-50"
                            : "hover:bg-background/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedRule(rule);
                              setSelectedStory(null);
                            }}
                            className="flex-1 text-left"
                          >
                            <p
                              className={clsx(
                                "text-sm font-medium",
                                selectedRule?.id === rule.id
                                  ? "text-accent"
                                  : "text-text-primary"
                              )}
                            >
                              {rule.name}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                              {rule.keywords}
                            </p>
                          </button>
                          <div className="flex items-center gap-1">
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
                              title={rule.enabled ? "Disable" : "Enable"}
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
                              title="Delete"
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
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-text-secondary"
                            )}
                          >
                            <span className="w-1 h-1 rounded-full bg-current" />
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedRule ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
                Select a rule to view matching stories.
              </div>
            ) : storiesLoading ? (
              <div className="flex items-center justify-center py-20 text-text-secondary">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading stories...
              </div>
            ) : storiesError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-800 mb-1">
                  Failed to load stories
                </h3>
                <button
                  onClick={() => refetchStories()}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : stories.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-accent" />
                    {selectedRule.name}
                  </h3>
                  <span className="text-sm text-text-secondary">
                    {stories.length} hits
                  </span>
                </div>
                {stories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    variant="compact"
                    onClick={() => setSelectedStory(story)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
                No stories match this rule.
              </div>
            )}
          </div>
        </div>
      )}

      <StoryDrawer story={selectedStory} onClose={() => setSelectedStory(null)} />
    </div>
  );
}
