import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WatchlistPage } from "./WatchlistPage";
import { renderWithAppProviders } from "../test/test-utils";

const mockRules = [
  { id: 1, name: "AI 芯片", keywords: "AI,芯片,半导体", enabled: true, created_at: "2026-06-01T00:00:00Z" },
  { id: 2, name: "新能源", keywords: "新能源,电池,光伏", enabled: false, created_at: "2026-06-02T00:00:00Z" },
];

vi.mock("../api/watchRules", () => ({
  listWatchRules: vi.fn(async () => mockRules),
  createWatchRule: vi.fn(),
  updateWatchRule: vi.fn(),
  deleteWatchRule: vi.fn(),
  getWatchRuleStories: vi.fn(async () => []),
}));

describe("WatchlistPage", () => {
  it("显示关注列表标题和规则数量", async () => {
    renderWithAppProviders(<WatchlistPage />, {
      route: "/watchlist",
      path: "/watchlist",
    });

    expect(await screen.findByText("关注列表")).toBeInTheDocument();
    expect(await screen.findByText(/2 条规则/)).toBeInTheDocument();
  });

  it("添加表单默认收起，点击按钮展开", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<WatchlistPage />, {
      route: "/watchlist",
      path: "/watchlist",
    });

    await screen.findByText("关注列表");

    expect(screen.queryByPlaceholderText("规则名称")).not.toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /添加规则/ });
    await user.click(addBtn);

    expect(screen.getByPlaceholderText("规则名称")).toBeInTheDocument();
  });

  it("显示规则名称和关键词", async () => {
    renderWithAppProviders(<WatchlistPage />, {
      route: "/watchlist",
      path: "/watchlist",
    });

    expect(await screen.findByText("AI 芯片")).toBeInTheDocument();
    expect(await screen.findByText("新能源")).toBeInTheDocument();
    expect(screen.getByText("AI,芯片,半导体")).toBeInTheDocument();
  });
});
