import { NavLink, Outlet } from "react-router-dom";
import { Newspaper, BookOpen, Radio, Tv, Bell, Activity, ClipboardList } from "lucide-react";
import { TopBar } from "./TopBar";
import clsx from "clsx";

const navItems = [
  { to: "/", label: "Today", icon: Newspaper },
  { to: "/stories", label: "Stories", icon: BookOpen },
  { to: "/channels", label: "Channels", icon: Tv },
  { to: "/watchlist", label: "Watchlist", icon: Bell },
  { to: "/sources", label: "Sources", icon: Radio },
  { to: "/source-health", label: "Health", icon: Activity },
  { to: "/briefing", label: "Briefing", icon: ClipboardList },
];

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-background">
      <nav className="w-16 flex-shrink-0 border-r border-border bg-surface flex flex-col items-center py-6 gap-6">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                isActive
                  ? "text-accent bg-blue-50"
                  : "text-text-secondary hover:text-text-primary hover:bg-background"
              )
            }
            title={label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
