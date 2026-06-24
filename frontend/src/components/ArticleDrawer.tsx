import type { Article } from "../api/types";
import { X, ExternalLink, Clock, Calendar, Copy, Newspaper, ChevronDown, ChevronUp, Link as LinkIcon, FileText } from "lucide-react";
import { displayArticleTitle, displayArticleSummary, formatRelativeTime } from "../lib/format";
import { openExternal } from "../lib/openExternal";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface ArticleDrawerProps {
  article: Article | null;
  onClose: () => void;
}

const LONG_CONTENT_THRESHOLD = 2000;

export function ArticleDrawer({ article, onClose }: ArticleDrawerProps) {
  const [imageError, setImageError] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!article) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [article, onClose]);

  if (!article) return null;

  async function handleCopy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label}已复制`);
  }

  const title = displayArticleTitle(article);
  const summary = displayArticleSummary(article);
  const isLongContent = (article.clean_content_text?.length ?? 0) > LONG_CONTENT_THRESHOLD;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-drawer-title"
        className="fixed inset-y-0 right-0 w-full max-w-xl bg-surface border-l border-border shadow-xl z-50 flex flex-col"
      >
        <div className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-text-secondary" />
            <span id="article-drawer-title" className="text-sm font-medium text-text-secondary">
              文章详情
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleCopy(title, "标题")}
              className="p-1.5 rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="复制标题"
              title="复制标题"
            >
              <FileText className="w-4 h-4" />
            </button>
            {summary && (
              <button
                type="button"
                onClick={() => handleCopy(summary, "摘要")}
                className="p-1.5 rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="复制摘要"
                title="复制摘要"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCopy(article.url, "链接")}
              className="p-1.5 rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="复制链接"
              title="复制链接"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="关闭"
              title="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <header className="space-y-4">
            <h2 className="text-xl font-semibold text-text-primary leading-tight text-balance">
              {title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
              {article.source_name && (
                <span className="font-medium text-text-primary">
                  {article.source_name}
                </span>
              )}
              {article.published_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  发布于 {formatRelativeTime(article.published_at)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-text-tertiary">
                <Clock className="w-3 h-3" />
                抓取于 {formatRelativeTime(article.fetched_at)}
              </span>
            </div>
          </header>

          {article.image_url && !imageError && (
            <div className="rounded-xl overflow-hidden border border-border">
              <img
                src={article.image_url}
                alt={title}
                className="w-full h-auto max-h-80 object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {summary && (
            <section className="bg-surface-subtle/50 rounded-2xl p-5 border border-border">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                摘要
              </h3>
              <p className="text-[15px] leading-editorial text-text-primary">
                {summary}
              </p>
            </section>
          )}

          {article.clean_content_text && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  正文
                </h3>
                {isLongContent && (
                  <button
                    type="button"
                    onClick={() => setContentExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    {contentExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        收起
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        展开全文
                      </>
                    )}
                  </button>
                )}
              </div>
              <div
                className={clsx(
                  "prose prose-sm max-w-none text-text-primary leading-editorial whitespace-pre-line",
                  isLongContent && !contentExpanded && "line-clamp-[20]"
                )}
              >
                {article.clean_content_text}
              </div>
            </section>
          )}

          <div className="pt-4 border-t border-border flex items-center gap-3">
            <button
              type="button"
              onClick={() => openExternal(article.url)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-subtle border border-border text-text-primary rounded-lg hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              打开原文
            </button>
            <button
              type="button"
              onClick={() => handleCopy(`${title}\n${summary || ""}\n${article.url}`, "全部内容")}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              <Copy className="w-4 h-4" />
              一键复制全部
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
