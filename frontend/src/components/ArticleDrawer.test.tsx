import type { Article } from "../api/types";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ArticleDrawer } from "../components/ArticleDrawer";
import { renderWithAppProviders } from "../test/test-utils";

const baseArticle: Omit<Article, "id" | "title" | "url" | "clean_content_text"> = {
  source_id: 1,
  source_name: "新华社",
  canonical_url: null,
  author: null,
  published_at: "2026-06-24T07:00:00Z",
  summary_raw: "这是文章摘要。",
  content_text: null,
  image_url: null,
  language: "zh",
  hash_content: null,
  fetched_at: "2026-06-24T07:05:00Z",
  hash_url: "abc",
  hash_title: "abc",
  status: "active",
  clean_title: null,
  clean_summary: "清洗后的摘要。",
};

const mockArticle: Article = {
  ...baseArticle,
  id: 101,
  title: "测试文章标题",
  url: "https://example.com/article",
  clean_content_text: undefined,
};

const longArticle: Article = {
  ...baseArticle,
  id: 102,
  title: "测试文章标题",
  url: "https://example.com/article-long",
  clean_content_text: "A".repeat(2500),
};

describe("ArticleDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("article 为 null 时不渲染", () => {
    const { container } = renderWithAppProviders(
      <ArticleDrawer article={null} onClose={() => {}} />,
      { route: "/", path: "/" }
    );
    expect(container.innerHTML).toBe("");
  });

  it("显示文章标题和来源", async () => {
    renderWithAppProviders(
      <ArticleDrawer article={mockArticle} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    expect(await screen.findByText("测试文章标题")).toBeInTheDocument();
    expect(screen.getByText("新华社")).toBeInTheDocument();
  });

  it("显示独立的复制标题、复制摘要、复制链接按钮", async () => {
    renderWithAppProviders(
      <ArticleDrawer article={mockArticle} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    await screen.findByText("测试文章标题");
    expect(screen.getByRole("button", { name: "复制标题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制摘要" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制链接" })).toBeInTheDocument();
  });

  it("长正文显示展开/收起按钮", async () => {
    renderWithAppProviders(
      <ArticleDrawer article={longArticle} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    await screen.findByText("测试文章标题");
    expect(screen.getByText("展开全文")).toBeInTheDocument();
  });

  it("短正文不显示展开/收起按钮", async () => {
    renderWithAppProviders(
      <ArticleDrawer article={mockArticle} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    await screen.findByText("测试文章标题");
    expect(screen.queryByText("展开全文")).not.toBeInTheDocument();
  });

  it("点击关闭按钮调用 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithAppProviders(
      <ArticleDrawer article={mockArticle} onClose={onClose} />,
      { route: "/", path: "/" }
    );

    const closeBtn = await screen.findByRole("button", { name: "关闭" });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
