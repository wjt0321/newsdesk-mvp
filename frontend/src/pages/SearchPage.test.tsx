import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchPage } from "./SearchPage";
import { renderWithAppProviders } from "../test/test-utils";

vi.mock("../api/stories", () => ({
  listStories: vi.fn(async () => [
    {
      id: 1,
      title: "AI 芯片竞争升温",
      clean_title: "AI 芯片竞争升温",
      clean_summary: "多家厂商加速发布新产品。",
      status: "new",
      source_count: 3,
      article_count: 4,
      last_updated_at: "2026-06-24T08:00:00Z",
      needs_review: false,
      confidence: 0.9,
      articles: [],
    },
  ]),
}));

vi.mock("../api/articles", () => ({
  listArticles: vi.fn(async () => [
    {
      id: 10,
      title: "AI 芯片市场观察",
      clean_title: "AI 芯片市场观察",
      summary: "产业链开始新一轮博弈。",
      clean_summary: "产业链开始新一轮博弈。",
      url: "https://example.com/article",
      source_id: 2,
      source_name: "Tech Daily",
      published_at: "2026-06-24T07:00:00Z",
      fetched_at: "2026-06-24T07:10:00Z",
    },
  ]),
}));

describe("SearchPage", () => {
  it("没有查询词时显示空搜索提示", () => {
    renderWithAppProviders(<SearchPage />, {
      route: "/search",
      path: "/search",
    });

    expect(screen.getByText("输入关键词开始搜索")).toBeInTheDocument();
  });

  it("有查询词时显示 stories 和 articles 结果统计", async () => {
    renderWithAppProviders(<SearchPage />, {
      route: "/search?q=AI&hours=24",
      path: "/search",
    });

    expect(
      await screen.findByText((_, element) => element?.textContent === "AI 芯片竞争升温")
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === "AI 芯片市场观察")
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Stories") && content.includes("1") && content.includes("条"))
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("Articles") && content.includes("1") && content.includes("条"))
    ).toBeInTheDocument();
  });
});
