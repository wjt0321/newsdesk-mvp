import type { ReactNode } from "react";
import { DashboardContext } from "../hooks/useDashboardContext";
import { useDashboardUrlState } from "../hooks/useDashboardUrlState";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { searchQuery, setSearchQuery, hours, setHours } = useDashboardUrlState();

  return (
    <DashboardContext.Provider
      value={{ searchQuery, setSearchQuery, hours, setHours }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
