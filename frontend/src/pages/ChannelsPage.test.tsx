import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChannelsPage } from "./ChannelsPage";
import { renderWithAppProviders } from "../test/test-utils";

const mockChannels = [
  { id: "ch-1", name: "科技" },
  { id: "ch-2", name: "财经" },
  { id: "ch-3", name: "国际" },
];

vi.mock("../api/channels", () => ({
  listChannels: vi.fn(async () => mockChannels),
  getChannelStories: vi.fn(async () => []),
}));

describe("ChannelsPage", () => {
  it("显示频道标题和数量", async () => {
    renderWithAppProviders(<ChannelsPage />, {
      route: "/channels",
      path: "/channels",
    });

    expect(await screen.findByText("频道")).toBeInTheDocument();
    expect(await screen.findByText(/3 个频道/)).toBeInTheDocument();
  });

  it("加载后显示频道列表", async () => {
    renderWithAppProviders(<ChannelsPage />, {
      route: "/channels",
      path: "/channels",
    });

    // Wait for channels to load
    await waitFor(() => {
      expect(screen.getByText("科技")).toBeInTheDocument();
    });
    expect(screen.getByText("财经")).toBeInTheDocument();
    expect(screen.getByText("国际")).toBeInTheDocument();
  });

  it("频道列表以按钮形式可点击", async () => {
    renderWithAppProviders(<ChannelsPage />, {
      route: "/channels",
      path: "/channels",
    });

    // Wait for channels to load and buttons to appear
    await waitFor(() => {
      expect(screen.getByText("科技")).toBeInTheDocument();
    });

    const buttons = screen.getAllByRole("button");
    const channelButtons = buttons.filter(
      (btn) => btn.textContent === "科技" || btn.textContent === "财经"
    );

    expect(channelButtons.length).toBeGreaterThanOrEqual(2);
  });
});
