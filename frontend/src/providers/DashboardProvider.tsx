import { useState, type ReactNode } from "react";
import { DashboardContext } from "../hooks/useDashboardContext";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hours, setHours] = useState<number | null>(24);

  return (
    <DashboardContext.Provider
      value={{ searchQuery, setSearchQuery, hours, setHours }}
    >
      {children}
    </DashboardContext.Provider>
  );
}
