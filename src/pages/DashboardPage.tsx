import React, { useState } from "react";
import { MetricCard } from "../components/common/MetricCard";
import { LivePowerBoard } from "../components/dashboard/LivePowerBoard";
import { ConsumptionDonut } from "../components/dashboard/ConsumptionDonut";
import { ApplianceModal } from "../components/appliances/ApplianceModal";
import { PelpCatalogModal } from "../components/appliances/PelpCatalogModal";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";
import { Button } from "../components/common/Button";
import { GlassCard } from "../components/common/GlassCard";
import {
  Zap,
  Calculator,
  Calendar,
  Sparkles,
  Database,
  TrendingUp,
  Activity,
  Flame,
  Clock,
  Plus,
} from "lucide-react";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../types";
import { Link } from "react-router-dom";

export const DashboardPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  const listResponse = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const appliances: UserAppliance[] = listResponse?.data?.data || listResponse?.result?.data || [];
  const runningAppliances = appliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const totalMonthlyKwh = appliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || 0),
    0
  );
  const estimatedMonthlyBill = totalMonthlyKwh * 14.8261;

  const currentHour = new Date().getHours();
  const isPeak = (currentHour >= 11 && currentHour < 16) || (currentHour >= 18 && currentHour < 21);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Header */}
      <GlassCard className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#5c68db]/15 border border-[#5c68db]/30 text-xs font-semibold text-[#8183fc]">
            <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            <span>PowerForecast Active Telemetry</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black t-primary tracking-tight">
            Household Energy Dashboard
          </h1>
          <p className="text-xs sm:text-sm t-muted leading-relaxed">
            Real-time household energy load, Meralco unbundled tariff estimation, and appliance schedule tracker.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Appliance
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPelpModalOpen(true)}
              icon={<Database className="w-3.5 h-3.5 text-[#8183fc]" />}
            >
              PELP Catalog
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAiScannerOpen(true)}
              icon={<Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
            >
              AI Scanner
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-xl pf-input text-left md:text-right shrink-0 w-full md:w-auto">
          <span className="text-[11px] font-semibold t-accent uppercase tracking-wider block">
            Current Draw
          </span>
          <div className="text-2xl sm:text-3xl font-black t-primary mt-0.5 font-mono">
            {activeWattage} <span className="text-xs font-normal t-muted font-sans">Watts</span>
          </div>
          <p className="text-xs font-bold text-amber-500 dark:text-amber-400 mt-0.5 font-mono">
            ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr running rate
          </p>
        </div>
      </GlassCard>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Projected Monthly Bill"
          value={`₱${estimatedMonthlyBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Rate: ₱14.82/kWh"
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          trend={{ value: "-₱240.50", direction: "down", label: "vs prior" }}
        />
        <MetricCard
          title="Monthly Energy Volume"
          value={`${totalMonthlyKwh.toFixed(1)} kWh`}
          subtitle="Household total load"
          icon={<TrendingUp className="w-4 h-4 text-[#8183fc]" />}
          trend={{ value: "Tier 3", direction: "neutral" }}
        />
        <MetricCard
          title="Active Appliances"
          value={`${runningAppliances.length} / ${appliances.length}`}
          subtitle="Circuits active"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          trend={{ value: `${runningAppliances.length} ON`, direction: "up" }}
        />
        <MetricCard
          title="Tariff Window"
          value={isPeak ? "Peak" : "Off-Peak"}
          subtitle={isPeak ? "11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM" : "Optimal"}
          icon={isPeak ? <Flame className="w-4 h-4 text-amber-400" /> : <Clock className="w-4 h-4 text-emerald-400" />}
        />
      </div>

      {/* Main Grid: Live Power Board & Energy Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <LivePowerBoard onOpenAddModal={() => setIsAddModalOpen(true)} />
        </div>
        <div className="lg:col-span-4">
          <ConsumptionDonut appliances={appliances} />
        </div>
      </div>

      {/* Quick Launchpad to Other Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Link
          to="/calculator"
          className="p-4 rounded-2xl glass-card hover:border-[#5c68db] flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold t-primary text-xs">Bill Calculator</h4>
              <p className="text-[11px] t-muted">Unbundled tariff formulas</p>
            </div>
          </div>
          <span className="t-accent group-hover:translate-x-1 transition-transform text-xs font-bold">→</span>
        </Link>

        <Link
          to="/appliances"
          className="p-4 rounded-2xl glass-card hover:border-[#5c68db] flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold t-primary text-xs">Appliance Hub</h4>
              <p className="text-[11px] t-muted">Inventory & PELP database</p>
            </div>
          </div>
          <span className="t-accent group-hover:translate-x-1 transition-transform text-xs font-bold">→</span>
        </Link>

        <Link
          to="/calendar"
          className="p-4 rounded-2xl glass-card hover:border-[#5c68db] flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold t-primary text-xs">Smart Scheduler</h4>
              <p className="text-[11px] t-muted">Off-peak schedule planner</p>
            </div>
          </div>
          <span className="t-accent group-hover:translate-x-1 transition-transform text-xs font-bold">→</span>
        </Link>
      </div>

      {/* Global Modals */}
      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <PelpCatalogModal
        isOpen={isPelpModalOpen}
        onClose={() => setIsPelpModalOpen(false)}
      />
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />
    </div>
  );
};
