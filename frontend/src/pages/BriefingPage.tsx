import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, CheckCircle2, Newspaper, Calendar } from "lucide-react";
import { api } from "../api/client";
import { formatStoryStatus } from "../lib/format";
import { SectionHeader } from "../components/ui/SectionHeader";
import { toast } from "sonner";

interface BriefingItem {
  rank: number;
  story_id: number;
  title: string;
  status: string;
  heat_score: number;
  source_count: number;
  article_count: number;
  top_source: string | null;
}

interface BriefingData {
  generated_at: string;
  items: BriefingItem[];
  plain_text: string;
  ai_title: string | null;
  ai_intro: string | null;
  model: string | null;
}

async function fetchBriefing(): Promise<BriefingData> {
  const { data } = await api.get<BriefingData>("/briefing");
  return data;
}

export function BriefingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["briefing"],
    queryFn: fetchBriefing,
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.plain_text);
    setCopied(true);
    toast.success("简报已复制");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-text-secondary flex items-center gap-2">
        <Newspaper className="w-5 h-5 animate-pulse" />
        正在加载简报...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-surface border border-danger/20 rounded-2xl p-6 text-danger">
          <h2 className="text-lg font-semibold mb-1">加载简报失败</h2>
          <p className="text-sm text-text-secondary">
            {error instanceof Error ? error.message : "请稍后重试。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary mb-1">
            每日简报
          </p>
          <h1 className="text-2xl font-semibold text-text-primary">
            {data.ai_title || "每日简报"}
          </h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            生成于 {new Date(data.generated_at).toLocaleString("zh-CN")}
            {data.model ? ` · 模型：${data.model}` : ""}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors self-start"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "已复制" : "复制全文"}
        </button>
      </header>

      {data.ai_intro && (
        <section className="bg-surface-subtle/50 border border-border rounded-2xl p-5">
          <SectionHeader title="今日摘要" />
          <p className="text-[15px] leading-editorial text-text-primary">
            {data.ai_intro}
          </p>
        </section>
      )}

      <section>
        <SectionHeader title="重点报道" icon={Newspaper} />
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-subtle/70 border-b border-border">
              <tr>
                <th className="px-4 py-3 font-medium text-text-secondary w-12">#</th>
                <th className="px-4 py-3 font-medium text-text-secondary">标题</th>
                <th className="px-4 py-3 font-medium text-text-secondary w-24">状态</th>
                <th className="px-4 py-3 font-medium text-text-secondary w-24 text-right">来源</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item) => (
                <tr key={item.story_id} className="hover:bg-surface-subtle/40 transition-colors">
                  <td className="px-4 py-3 text-text-tertiary tabular-nums">{item.rank}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                    {item.source_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionHeader title="纯文本版" />
        <div className="relative">
          <textarea
            readOnly
            value={data.plain_text}
            rows={14}
            className="w-full p-4 bg-surface border border-border rounded-2xl text-sm text-text-primary leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config =
    status === "hot" || status === "breaking"
      ? "bg-red-100 text-danger"
      : status === "new"
      ? "bg-emerald-50 text-emerald-700"
      : status === "developing"
      ? "bg-accent/10 text-accent"
      : "bg-surface-subtle text-text-secondary";

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${config}`}>
      {formatStoryStatus(status)}
    </span>
  );
}
