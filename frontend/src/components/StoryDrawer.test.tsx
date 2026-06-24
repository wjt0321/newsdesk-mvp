import type { Story } from "../api/types";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StoryDrawer } from "../components/StoryDrawer";
import { renderWithAppProviders } from "../test/test-utils";

const mockStory: Story = {
  id: 1,
  canonical_title: "测试故事标题",
  short_title: null,
  clean_title: null,
  clean_summary: "这是一条测试故事的摘要。",
  status: "hot",
  confidence: 0.85,
  source_count: 3,
  article_count: 5,
  heat_score: 7.2,
  merge_reason: "标题相似度 > 0.8",
  needs_review: false,
  first_seen_at: "2026-06-24T06:00:00Z",
  last_updated_at: "2026-06-24T08:00:00Z",
  source_names: ["新华社", "TechCrunch", "路透社"],
  source_ids: [1, 2, 3],
  article_ids: [101, 102],
  articles: [
    {
      id: 101,
      source_id: 1,
      source_name: "新华社",
      title: "新华社报道标题",
      clean_title: null,
      url: "https://example.com/1",
      canonical_url: null,
      author: null,
      published_at: "2026-06-24T07:00:00Z",
      summary_raw: "新华社的摘要内容。",
      content_text: null,
      image_url: null,
      language: "zh",
      hash_content: null,
      fetched_at: "2026-06-24T07:05:00Z",
      hash_url: "a",
      hash_title: "a",
      status: "active",
      clean_summary: null,
    },
    {
      id: 102,
      source_id: 2,
      source_name: "TechCrunch",
      title: "TechCrunch报道标题",
      clean_title: null,
      url: "https://example.com/2",
      canonical_url: null,
      author: null,
      published_at: "2026-06-24T07:30:00Z",
      summary_raw: "TechCrunch的摘要内容。",
      content_text: null,
      image_url: null,
      language: "en",
      hash_content: null,
      fetched_at: "2026-06-24T07:35:00Z",
      hash_url: "b",
      hash_title: "b",
      status: "active",
      clean_summary: null,
    },
  ] as Story["articles"],
};

const mockDiff = {
  story_id: 1,
  canonical_title: "测试故事标题",
  sources: ["新华社", "TechCrunch"],
  articles: [
    {
      source_name: "新华社",
      article_id: 101,
      title: "新华社报道标题",
      summary: "新华社的摘要内容。",
      published_at: "2026-06-24T07:00:00Z",
      url: "https://example.com/1",
    },
    {
      source_name: "TechCrunch",
      article_id: 102,
      title: "TechCrunch报道标题",
      summary: "TechCrunch的摘要内容。",
      published_at: "2026-06-24T07:30:00Z",
      url: "https://example.com/2",
    },
  ],
  common_words: ["AI", "芯片", "发布"],
  unique_phrases: ["独家", "内部消息"],
};

vi.mock("../api/sources", () => ({
  listSources: vi.fn(async () => []),
}));

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(async () => ({ data: mockDiff })),
  },
}));

describe("StoryDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("story 为 null 时不渲染", () => {
    const { container } = renderWithAppProviders(
      <StoryDrawer story={null} onClose={() => {}} />,
      { route: "/", path: "/" }
    );
    expect(container.innerHTML).toBe("");
  });

  it("显示故事标题和摘要", async () => {
    renderWithAppProviders(
      <StoryDrawer story={mockStory} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    expect(await screen.findByText("测试故事标题")).toBeInTheDocument();
    expect(screen.getAllByText("这是一条测试故事的摘要。").length).toBeGreaterThanOrEqual(1);
  });

  it("显示来源名称", async () => {
    renderWithAppProviders(
      <StoryDrawer story={mockStory} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    await screen.findByText("测试故事标题");
    expect(screen.getAllByText("新华社").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("TechCrunch").length).toBeGreaterThanOrEqual(1);
  });

  it("显示来源差异对比区域", async () => {
    renderWithAppProviders(
      <StoryDrawer story={mockStory} onClose={() => {}} />,
      { route: "/", path: "/" }
    );

    await waitFor(() => {
      expect(screen.getByText("来源差异对比")).toBeInTheDocument();
    });
    expect(screen.getByText("共同关注")).toBeInTheDocument();
    expect(screen.getByText("差异视角")).toBeInTheDocument();
    expect(screen.getByText("各来源报道")).toBeInTheDocument();
  });

  it("点击关闭按钮调用 onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithAppProviders(
      <StoryDrawer story={mockStory} onClose={onClose} />,
      { route: "/", path: "/" }
    );

    const closeBtn = await screen.findByRole("button", { name: "关闭" });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
