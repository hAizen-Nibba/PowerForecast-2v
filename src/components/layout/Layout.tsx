import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { DevLogsFloatingWidget } from "../devlogs/DevLogsFloatingWidget";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../../types";

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  // Initialize theme from localStorage or default to dark
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("powerforecast_theme");
    return saved ? saved === "dark" : true;
  });

  // Synchronize document theme attributes and localStorage
  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (isDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("powerforecast_theme", theme);
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const runningAppliances = appliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  return (
    <div
      className="min-h-screen flex transition-colors duration-300 relative overflow-x-hidden"
      style={{ backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeWattage={activeWattage}
        runningCount={runningAppliances.length}
      />

      {/* Main Viewport & Header */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 relative z-10">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenAiScanner={() => setIsAiScannerOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-6">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Widgets */}
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />

      {/* Global Draggable Floating Dev Logs & Telemetry Bubble */}
      <DevLogsFloatingWidget />
    </div>
  );
};
