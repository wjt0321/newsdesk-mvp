import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";
import { renderWithAppProviders } from "../test/test-utils";

vi.mock("../api/sources", () => ({
  listSources: vi.fn(async () => []),
}));

vi.mock("../hooks/useRefreshDashboard", () => ({
  useRefreshDashboard: () => ({
    isRefreshing: false,
    lastRefreshAt: null,
    refreshDashboard: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

describe("TopBar", () => {
  it("输入关键词后按回车跳转到搜索页", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithAppProviders(
      <Routes>
        <Route
          path="*"
          element={
            <>
              <TopBar />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { route: "/" }
    );

    await queryClient.cancelQueries();

    const input = screen.getByLabelText("搜索报道、来源或主题");
    await user.type(input, "AI{Enter}");

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/search");
  });

  it("空关键词提交时保持当前路径", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderWithAppProviders(
      <Routes>
        <Route
          path="*"
          element={
            <>
              <TopBar />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { route: "/" }
    );

    await queryClient.cancelQueries();

    const input = screen.getByLabelText("搜索报道、来源或主题");
    await user.click(input);
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("location-probe")).toHaveTextContent("/");
  });
});
