import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoriesPage } from "./StoriesPage";
import { renderWithAppProviders } from "../test/test-utils";

const mockStories = [
  {
    id: 1,
    canonical_title: "AI 芯片突破",
    short_title: null,
    clean_title: null,
    clean_summary: null,
    status: "hot",
    confidence: 0.9,
    source_count: 5,
    article_count: 8,
    heat_score: 85,
    merge_reason: "标题相似",
    needs_review: false,
    first_seen_at: "2026-06-24T06:00:00Z",
    last_updated_at: "2026-06-24T08:00:00Z",
    source_names: ["新华社", "TechCrunch"],
    source_ids: [1, 2],
    article_ids: [101, 102],
    articles: [],
  },
  {
    id: 2,
    canonical_title: "新能源政策发布",
    short_title: null,
    clean_title: null,
    clean_summary: null,
    status: "new",
    confidence: 0.6,
    source_count: 2,
    article_count: 3,
    heat_score: 40,
    merge_reason: null,
    needs_review: true,
    first_seen_at: "2026-06-24T07:00:00Z",
    last_updated_at: "2026-06-24T07:30:00Z",
    source_names: ["路透社"],
    source_ids: [3],
    article_ids: [103],
    articles: [],
  },
];

vi.mock("../api/stories", () => ({
  listStories: vi.fn(async () => mockStories),
}));

describe("StoriesPage", () => {
  it("显示报道标题和数量", async () => {
    renderWithAppProviders(<StoriesPage />, {
      route: "/stories",
      path: "/stories",
    });

    expect(await screen.findByText("报道")).toBeInTheDocument();
    expect(await screen.findByText(/2 条报道/)).toBeInTheDocument();
  });

  it("状态筛选 chips 可点击", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<StoriesPage />, {
      route: "/stories",
      path: "/stories",
    });

    await screen.findByText("报道");

    const newChip = screen.getAllByRole("button", { name: "最新" })[0];
    await user.click(newChip);

    // Should show only the "new" story
    expect(screen.getByText("新能源政策发布")).toBeInTheDocument();
    expect(screen.queryByText("AI 芯片突破")).not.toBeInTheDocument();
  });

  it("需复核 chip 显示计数", async () => {
    renderWithAppProviders(<StoriesPage />, {
      route: "/stories",
      path: "/stories",
    });

    await screen.findByText("报道");
    expect(screen.getByText(/需复核/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
