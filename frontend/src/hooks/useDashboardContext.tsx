import { createContext, useContext } from "react";

interface DashboardContextValue {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  hours: number | null;
  setHours: (h: number | null) => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }
  return context;
}
