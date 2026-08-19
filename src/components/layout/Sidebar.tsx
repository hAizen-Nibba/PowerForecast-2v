import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  Zap,
  Calendar,
  BarChart3,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { clsx } from "clsx";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../../types";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeWattage?: number;
  runningCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  // Live 1-second ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce((acc, curr) => acc + curr.watts * (curr.quantity || 1), 0);
  const runningCount = runningAppliances.length;

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  const totalSessionCost = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  const navItems = [
    { label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard" },
    { label: "Bill Calculator", icon: <Calculator className="w-4 h-4" />, path: "/calculator" },
    { label: "Appliance Hub", icon: <Zap className="w-4 h-4" />, path: "/appliances" },
    { label: "Smart Calendar", icon: <Calendar className="w-4 h-4" />, path: "/calendar" },
    { label: "Analytics & Forecast", icon: <BarChart3 className="w-4 h-4" />, path: "/analytics" },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col justify-between transition-transform duration-200 border-r lg:translate-x-0 backdrop-blur-md",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Brand Header */}
        <div>
          <Link
            to="/"
            className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08] hover:bg-white/[0.04] transition-colors"
            title="View Public Landing Page"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#5c68db] text-white shadow-sm">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <span className="font-bold text-sm text-white tracking-tight">
                PowerForecast
              </span>
              <p className="text-[11px] text-[#a2a5ff]">Meralco Energy Intel</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-xs transition-all",
                    isActive
                      ? "bg-[#4341aa] text-white shadow-md shadow-[#4341aa]/30"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <span className={isActive ? "text-yellow-300" : "text-[#8183fc]"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Live Grid Load Box & Footer */}
        <div className="p-3 border-t border-[#1e2159] space-y-3">
          <div className="p-3.5 rounded-lg bg-[#0f1038] border border-[#22255e] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${runningCount > 0 ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                Live Draw
              </span>
              <span className="text-[11px] font-semibold text-[#a2a5ff] bg-[#1c1f57] px-2 py-0.5 rounded border border-[#2e3382]">
                {runningCount} Active
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold text-white">
                {activeWattage} <span className="text-xs font-normal text-slate-400">W</span>
              </div>
              <span className="text-xs font-medium text-[#ffd54f] font-mono">
                ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr
              </span>
            </div>

            {runningCount > 0 && (
              <div className="pt-2 border-t border-[#1c1f57] flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Coins className="w-3 h-3 text-yellow-300" />
                  Live Spent:
                </span>
                <span className="font-bold text-emerald-400">
                  ₱{totalSessionCost.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Isolated Local Mode
            </span>
            <span className="text-[#a2a5ff]">v2.5</span>
          </div>
        </div>
      </aside>
    </>
  );
};
