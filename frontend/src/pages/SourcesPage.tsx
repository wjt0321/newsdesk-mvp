import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  listSources,
  createSource,
  updateSource,
  triggerFetch,
} from "../api/sources";
import { formatRelativeTime } from "../lib/format";
import type { Source } from "../api/types";
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
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";

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
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  healthy: {
    label: "Healthy",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
  delayed: {
    label: "Delayed",
    icon: Clock,
    className: "bg-amber-100 text-amber-700",
  },
  failing: {
    label: "Failing",
    icon: AlertCircle,
    className: "bg-red-100 text-red-700",
  },
  paused: {
    label: "Paused",
    icon: PauseCircle,
    className: "bg-gray-100 text-text-secondary",
  },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

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
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setForm({
        name: "",
        url: "",
        category: "general",
        type: "rss",
        language: "zh",
        region: "CN",
      });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      console.error("Failed to create source:", err);
    },
  });

  const fetchMutation = useMutation({
    mutationFn: triggerFetch,
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      console.error("Failed to fetch source:", err);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      updateSource(id, { enabled: !enabled }),
    onSuccess: () => {
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      console.error("Failed to toggle source:", err);
    },
  });

  const categoryMutation = useMutation({
    mutationFn: ({ id, category }: { id: number; category: string }) =>
      updateSource(id, { category }),
    onSuccess: () => {
      setMutationError(null);
      setEditingCategoryId(null);
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    },
    onError: (err: unknown) => {
      const message = getErrorMessage(err);
      setMutationError(message);
      console.error("Failed to update source category:", err);
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
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Sources</h2>
          <p className="text-sm text-text-secondary">
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface border border-border rounded-xl p-4 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold">Add source</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
              required
            />
            <input
              type="url"
              placeholder="URL"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
              required
            />
            <input
              type="text"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
            >
              <option value="rss">rss</option>
              <option value="rsshub">rsshub</option>
            </select>

            {showAdvanced && (
              <>
                <input
                  type="text"
                  placeholder="Language"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder="Region"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:border-accent"
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
              {showAdvanced ? "Hide advanced" : "Advanced options"}
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
              Add source
            </button>
          </div>
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
          Loading sources...
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            Failed to load sources
          </h3>
          <p className="text-sm text-red-700 mb-4">
            {error instanceof Error ? error.message : "Something went wrong. Please try again."}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : sources.length > 0 ? (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Name</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Type</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Category</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">URL</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Status</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Health</th>
                  <th className="text-left font-medium text-text-secondary px-4 py-3">Last fetched</th>
                  <th className="text-center font-medium text-text-secondary px-4 py-3">Errors</th>
                  <th className="text-right font-medium text-text-secondary px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const health = getSourceHealth(source);
                  const healthCfg = HEALTH_CONFIG[health];
                  const HealthIcon = healthCfg.icon;
                  const isFetching =
                    fetchMutation.isPending && fetchMutation.variables === source.id;
                  const isToggling =
                    toggleMutation.isPending &&
                    toggleMutation.variables?.id === source.id;

                  return (
                    <tr
                      key={source.id}
                      className="border-b border-border last:border-b-0 hover:bg-background/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-text-secondary flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{source.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary capitalize">{source.type}</td>
                      <td className="px-4 py-3 text-text-secondary capitalize">
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
                              className="w-24 px-1.5 py-1 text-xs bg-background border border-accent rounded outline-none"
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
                            title="Click to edit category"
                          >
                            {source.category}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline truncate max-w-[200px] inline-block"
                          title={source.url}
                        >
                          {source.url}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
                            source.enabled
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-text-secondary"
                          )}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {source.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                            healthCfg.className
                          )}
                        >
                          <HealthIcon className="w-3 h-3" />
                          {healthCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {source.last_fetched_at
                          ? formatRelativeTime(source.last_fetched_at)
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            source.error_count > 0
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-text-secondary"
                          )}
                        >
                          {source.error_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() =>
                              toggleMutation.mutate({
                                id: source.id,
                                enabled: source.enabled,
                              })
                            }
                            disabled={isToggling}
                            className={clsx(
                              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-50",
                              source.enabled
                                ? "border-border bg-background text-text-secondary hover:text-red-600 hover:border-red-200"
                                : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            )}
                            title={source.enabled ? "Disable" : "Enable"}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : source.enabled ? (
                              <PowerOff className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {source.enabled ? "Disable" : "Enable"}
                            </span>
                          </button>
                          <button
                            onClick={() => fetchMutation.mutate(source.id)}
                            disabled={isFetching}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                            title="Fetch now"
                          >
                            <RefreshCw
                              className={clsx("w-3.5 h-3.5", isFetching && "animate-spin")}
                            />
                            <span className="hidden sm:inline">Fetch now</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-8 text-center text-text-secondary">
          No sources found.
        </div>
      )}
    </div>
  );
}
