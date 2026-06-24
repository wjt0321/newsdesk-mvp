import { NavLink, Outlet } from "react-router-dom";
import {
  Newspaper,
  BookOpen,
  Radio,
  Tv,
  Bell,
  Activity,
  ClipboardList,
} from "lucide-react";
import { TopBar } from "./TopBar";
import clsx from "clsx";

const navItems = [
  { to: "/", label: "今日", icon: Newspaper },
  { to: "/briefing", label: "简报", icon: ClipboardList },
  { to: "/sources", label: "来源", icon: Radio },
  { to: "/source-health", label: "健康", icon: Activity },
  { to: "/watchlist", label: "关注", icon: Bell },
  { to: "/channels", label: "频道", icon: Tv },
  { to: "/stories", label: "报道", icon: BookOpen },
];

export function AppShell() {
  return (
    <div className="flex h-screen w-full bg-background">
      <nav className="w-56 flex-shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            NewsDesk
          </span>
        </div>

        <div className="flex-1 overflow-auto py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface-subtle text-accent"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-subtle"
                )
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <p className="text-[11px] text-text-tertiary leading-relaxed">
            新闻情报工作台
          </p>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
