import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Clock,
  Flame,
  LogOut,
  Home,
  RotateCw,
} from "lucide-react";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { useGetIdentity, useLogout } from "@refinedev/core";

interface HeaderProps {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isDark,
  onToggleTheme,
  onOpenAiScanner,
}) => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();

  // Real-time Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        }) + " (GMT+8)"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = new Date().getHours();
  const isPeak = (currentHour >= 11 && currentHour < 16) || (currentHour >= 18 && currentHour < 21);

  return (
    <header
      className="sticky top-0 z-30 w-full h-16 border-b px-4 sm:px-6 flex items-center justify-between transition-colors backdrop-blur-md"
      style={{
        backgroundColor: "var(--topbar-bg)",
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Left: Mobile Hamburger & Rate / Peak Pills */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live Generation Rate Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-mono font-bold">₱9.2800/kWh</span>
          <RotateCw className="w-3 h-3 text-slate-400 hover:text-white cursor-pointer transition-transform hover:rotate-180" />
        </div>

        {/* Peak Status Badge */}
        <div className="hidden md:flex items-center">
          {isPeak ? (
            <Badge variant="amber" size="sm">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>PEAK (₱16.83/kWh)</span>
            </Badge>
          ) : (
            <Badge variant="emerald" size="sm">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>OFF-PEAK (₱12.45/kWh)</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Live Clock & Date */}
      <div className="hidden lg:flex flex-col items-center text-center">
        <span className="text-xs font-mono font-bold text-white tracking-wider">
          {timeStr}
        </span>
        <span className="text-[10px] text-slate-300 -mt-0.5">
          {dateStr}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {onOpenAiScanner && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAiScanner}
            icon={<Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
          >
            AI Scanner
          </Button>
        )}

        {/* User Identity Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10">
          <img
            src={identity?.avatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Powerforecast"}
            alt="Avatar"
            className="w-5 h-5 rounded-md bg-[#5c68db] p-0.5"
          />
          <span className="text-xs font-bold text-white truncate max-w-[110px]">
            {identity?.name || "Demo User"}
          </span>
          <button
            onClick={() => logout()}
            className="text-slate-400 hover:text-red-400 transition-colors ml-1 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Light / Dark Mode Toggle Pill Switch */}
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xs font-bold text-white hidden sm:inline select-none">
            {isDark ? "Dark" : "Light"}
          </span>
          <button
            type="button"
            onClick={onToggleTheme}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shadow-inner ${
              isDark ? "bg-[#4341aa] justify-start" : "bg-[#6c7ae0] justify-end"
            }`}
            title="Toggle Light / Dark Mode"
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center text-xs transition-transform">
              {isDark ? <Moon className="w-3 h-3 text-[#4341aa]" /> : <Sun className="w-3 h-3 text-amber-500" />}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
