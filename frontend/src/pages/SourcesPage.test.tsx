import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SourcesPage } from "./SourcesPage";
import { renderWithAppProviders } from "../test/test-utils";

const mockSources = [
  {
    id: 1,
    name: "新华社",
    type: "rss",
    url: "https://example.com/xinhua",
    category: "general",
    language: "zh",
    region: "CN",
    trust_level: 5,
    fetch_interval_minutes: 30,
    enabled: true,
    error_count: 0,
    last_fetched_at: "2026-06-24T08:00:00Z",
    last_success_at: "2026-06-24T08:00:00Z",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    name: "TechCrunch",
    type: "rsshub",
    url: "https://example.com/techcrunch",
    category: "tech",
    language: "en",
    region: "US",
    trust_level: 4,
    fetch_interval_minutes: 60,
    enabled: true,
    error_count: 3,
    last_fetched_at: "2026-06-24T06:00:00Z",
    last_success_at: "2026-06-24T06:00:00Z",
    created_at: "2026-06-01T00:00:00Z",
  },
];

vi.mock("../api/sources", () => ({
  listSources: vi.fn(async () => mockSources),
  listSourceHealth: vi.fn(async () => []),
  createSource: vi.fn(),
  updateSource: vi.fn(),
  deleteSource: vi.fn(),
  triggerFetch: vi.fn(),
}));

vi.mock("../lib/openExternal", () => ({
  openExternal: vi.fn(),
}));

describe("SourcesPage", () => {
  it("显示来源标题和来源数量", async () => {
    renderWithAppProviders(<SourcesPage />, {
      route: "/sources",
      path: "/sources",
    });

    expect(await screen.findByText("来源")).toBeInTheDocument();
    expect(await screen.findByText(/2 个来源/)).toBeInTheDocument();
  });

  it("添加表单默认收起，点击按钮展开", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<SourcesPage />, {
      route: "/sources",
      path: "/sources",
    });

    await screen.findByText("来源");

    // Form title "添加来源" (h3) should not be visible initially
    expect(screen.queryByRole("heading", { name: "添加来源" })).not.toBeInTheDocument();

    const addBtn = screen.getByRole("button", { name: /添加来源/ });
    await user.click(addBtn);

    // After clicking, the form heading should appear
    expect(screen.getByRole("heading", { name: "添加来源" })).toBeInTheDocument();
  });

  it("来源以卡片形式展示名称和链接", async () => {
    renderWithAppProviders(<SourcesPage />, {
      route: "/sources",
      path: "/sources",
    });

    expect(await screen.findByText("新华社")).toBeInTheDocument();
    expect(await screen.findByText("TechCrunch")).toBeInTheDocument();
  });

  it("搜索框可以筛选来源", async () => {
    const user = userEvent.setup();
    renderWithAppProviders(<SourcesPage />, {
      route: "/sources",
      path: "/sources",
    });

    await screen.findByText("新华社");

    const searchInput = screen.getByPlaceholderText("搜索名称、链接或分类...");
    await user.type(searchInput, "Tech");

    expect(screen.getByText("TechCrunch")).toBeInTheDocument();
    expect(screen.queryByText("新华社")).not.toBeInTheDocument();
  });
});
