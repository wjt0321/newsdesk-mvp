import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import { formatStoryStatus } from "../lib/format";

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
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="p-6 text-gray-600">正在加载简报...</div>;
  }

  if (error || !data) {
    return <div className="p-6 text-red-600">加载简报失败。</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {data.ai_title || "每日简报"}
          </h1>
          <p className="text-sm text-gray-500">
            生成于 {new Date(data.generated_at).toLocaleString()}
            {data.model ? ` · 模型：${data.model}` : ""}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {copied ? "已复制！" : "复制"}
        </button>
      </div>

      {data.ai_intro && (
        <p className="text-gray-800 leading-relaxed">{data.ai_intro}</p>
      )}

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">标题</th>
              <th className="px-4 py-2 font-medium">状态</th>
              <th className="px-4 py-2 font-medium">来源</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.items.map((item) => (
              <tr key={item.story_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{item.rank}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{item.title}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      item.status === "hot" || item.status === "breaking"
                        ? "bg-red-100 text-red-800"
                        : item.status === "new"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {formatStoryStatus(item.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{item.source_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">纯文本</h2>
        <textarea
          readOnly
          value={data.plain_text}
          rows={12}
          className="w-full p-3 border rounded font-mono text-sm bg-gray-50"
        />
      </div>
    </div>
  );
}
