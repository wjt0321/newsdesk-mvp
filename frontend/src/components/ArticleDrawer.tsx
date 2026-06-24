import type { Article } from "../api/types";
import { X, ExternalLink, Clock, Calendar, Copy, Newspaper } from "lucide-react";
import { displayArticleTitle, displayArticleSummary, formatRelativeTime } from "../lib/format";
import { openExternal } from "../lib/openExternal";
import { toast } from "sonner";
import { useState } from "react";

interface ArticleDrawerProps {
  article: Article | null;
  onClose: () => void;
}

export function ArticleDrawer({ article, onClose }: ArticleDrawerProps) {
  const [imageError, setImageError] = useState(false);

  if (!article) return null;

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  }

  const title = displayArticleTitle(article);
  const summary = displayArticleSummary(article);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="fixed inset-y-0 right-0 w-full max-w-xl bg-surface border-l border-border shadow-xl z-50 flex flex-col">
        <div className="h-14 border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-surface">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-secondary">文章详情</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCopy(`${title}\n${article.url}`)}
              className="p-1.5 rounded-md hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
              aria-label="复制标题与链接"
              title="复制标题与链接"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors"
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">
                正文
              </h3>
              <div className="prose prose-sm max-w-none text-text-primary leading-editorial whitespace-pre-line">
                {article.clean_content_text}
              </div>
            </section>
          )}

          <div className="pt-4 border-t border-border">
            <button
              onClick={() => openExternal(article.url)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-surface-subtle border border-border text-text-primary rounded-lg hover:bg-surface transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              打开原文
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
