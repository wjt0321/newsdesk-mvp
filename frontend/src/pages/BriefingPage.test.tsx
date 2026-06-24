import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BriefingPage } from "./BriefingPage";
import { renderWithAppProviders } from "../test/test-utils";

const mockBriefing = {
  generated_at: "2026-06-24T08:00:00Z",
  items: [
    {
      rank: 1,
      story_id: 1,
      title: "AI 芯片重大突破",
      status: "hot",
      heat_score: 85,
      source_count: 5,
      article_count: 8,
      top_source: "新华社",
    },
  ],
  plain_text: "1. AI 芯片重大突破\n2. 其他新闻...",
  ai_title: "今日新闻简报",
  ai_intro: "今日重点关注 AI 芯片领域。",
  model: "gpt-4",
};

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(async () => ({ data: mockBriefing })),
  },
}));

describe("BriefingPage", () => {
  it("显示简报标题和内容", async () => {
    renderWithAppProviders(<BriefingPage />, {
      route: "/briefing",
      path: "/briefing",
    });

    expect(await screen.findByText("今日新闻简报")).toBeInTheDocument();
    expect(screen.getByText("今日重点关注 AI 芯片领域。")).toBeInTheDocument();
  });

  it("显示复制全文按钮", async () => {
    renderWithAppProviders(<BriefingPage />, {
      route: "/briefing",
      path: "/briefing",
    });

    await screen.findByText("今日新闻简报");
    expect(screen.getByRole("button", { name: "复制全文" })).toBeInTheDocument();
  });

  it("显示重点报道表格", async () => {
    renderWithAppProviders(<BriefingPage />, {
      route: "/briefing",
      path: "/briefing",
    });

    await screen.findByText("今日新闻简报");
    expect(screen.getByText("AI 芯片重大突破")).toBeInTheDocument();
  });
});
