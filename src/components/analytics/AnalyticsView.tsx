import React, { useState } from "react";
import { GlassCard } from "../common/GlassCard";
import { MetricCard } from "../common/MetricCard";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import {
  BarChart3,
  TrendingUp,
  Zap,
  Leaf,
  Lightbulb,
  Download,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { UserAppliance, UserCalendarEvent } from "../../types";
import { useList } from "@refinedev/core";
import { computeHourlyLoadCurve } from "../../lib/loadCurveService";

export const AnalyticsView: React.FC = () => {
  const [zoomPreset, setZoomPreset] = useState<"24h" | "morning" | "day" | "evening">("24h");
  const [resolutionMinutes, setResolutionMinutes] = useState<1 | 5 | 15 | 30>(5);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];

  const totalMonthlyKwh = appliances.reduce((acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || 0), 0);
  const totalCost = totalMonthlyKwh * 14.8261;

  // Determine hour window based on zoom preset
  let startHour = 0;
  let endHour = 24;
  if (zoomPreset === "morning") {
    startHour = 0;
    endHour = 8;
  } else if (zoomPreset === "day") {
    startHour = 8;
    endHour = 16;
  } else if (zoomPreset === "evening") {
    startHour = 16;
    endHour = 24;
  }

  // Real continuous distribution based on real appliance start times (continuous minutes)
  const HOURLY_LOAD_DATA = computeHourlyLoadCurve({
    appliances,
    events,
    resolutionMinutes,
    startHour,
    endHour,
  });

  // Dynamic monthly data starting from August 2026 (Active Start) + Future Projections
  const MONTHLY_TREND_DATA = [
    { month: "May", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Jun", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Jul", kwh: 0, cost: 0, status: "Prior Period" },
    { month: "Aug (Active)", kwh: Math.round(totalMonthlyKwh), cost: Math.round(totalCost), status: "Active Tracking" },
    { month: "Sep", kwh: Math.round(totalMonthlyKwh * 0.98), cost: Math.round(totalCost * 0.98), status: "Projected" },
    { month: "Oct", kwh: Math.round(totalMonthlyKwh * 0.95), cost: Math.round(totalCost * 0.95), status: "Projected" },
    { month: "Nov", kwh: Math.round(totalMonthlyKwh * 0.92), cost: Math.round(totalCost * 0.92), status: "Projected" },
    { month: "Dec", kwh: Math.round(totalMonthlyKwh * 1.05), cost: Math.round(totalCost * 1.05), status: "Projected (Holiday)" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black t-primary tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            Analytics & Forecasting
          </h2>
          <p className="text-xs sm:text-sm t-muted mt-0.5">
            Grid demand profiles, minute-level telemetry, and efficiency projections
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
          icon={<Download className="w-3.5 h-3.5 text-[#8183fc]" />}
        >
          Export Report
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Projected End-of-Month"
          value={`₱${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtitle="Household registered load"
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          trend={{ value: `${appliances.length} devices`, direction: "neutral" }}
        />
        <MetricCard
          title="Est. Monthly Volume"
          value={`${totalMonthlyKwh.toFixed(1)} kWh`}
          subtitle="Threshold: 350 kWh"
          icon={<TrendingUp className="w-4 h-4 text-[#8183fc]" />}
          trend={{ value: totalMonthlyKwh > 200 ? "Tier 3" : totalMonthlyKwh > 100 ? "Tier 2" : "Tier 1", direction: "neutral" }}
        />
        <MetricCard
          title="Peak Hours Share"
          value="38%"
          subtitle="Target: < 30%"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          trend={{ value: "+2.1%", direction: "up" }}
        />
        <MetricCard
          title="Eco Score"
          value="92 / 100"
          subtitle="Inverter efficiency"
          icon={<Leaf className="w-4 h-4 text-emerald-500" />}
          trend={{ value: "Top 10%", direction: "down" }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <GlassCard className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b pf-divider">
              <div>
                <h3 className="text-xs font-bold t-primary flex items-center gap-1.5">
                  <span>24-Hour Grid Load Profile</span>
                  <span className="text-[10px] text-amber-500 dark:text-yellow-300 font-mono">({resolutionMinutes}m Continuous Tracking)</span>
                </h3>
                <p className="text-[11px] t-muted">Peak periods (Red Zones): 11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM</p>
              </div>

              {/* Interactive Zoom and Resolution Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Time Range Zoom Presets */}
                <div className="flex items-center pf-input p-0.5 rounded-xl text-[10px]">
                  {[
                    { id: "24h", label: "24H" },
                    { id: "morning", label: "Morning" },
                    { id: "day", label: "Day" },
                    { id: "evening", label: "Peak" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setZoomPreset(p.id as any)}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        zoomPreset === p.id
                          ? "bg-[#5c68db] text-white shadow-xs"
                          : "t-muted hover:t-primary"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Granularity Resolution (Minutes) */}
                <div className="flex items-center pf-input p-0.5 rounded-xl text-[10px]">
                  {[
                    { val: 1, label: "1m" },
                    { val: 5, label: "5m" },
                    { val: 15, label: "15m" },
                    { val: 30, label: "30m" },
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => setResolutionMinutes(r.val as any)}
                      className={`px-1.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                        resolutionMinutes === r.val
                          ? "bg-[#5c68db] text-white shadow-xs"
                          : "t-muted hover:t-primary"
                      }`}
                      title={`Scrub granularity: ${r.label}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {zoomPreset !== "24h" && (
                  <button
                    onClick={() => setZoomPreset("24h")}
                    className="p-1 rounded-lg btn-secondary transition-colors cursor-pointer"
                    title="Reset Zoom to 24 Hours"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {appliances.length === 0 ? (
              <div className="py-20 text-center text-xs t-muted">
                No active appliances registered. Add devices in the Appliance Hub to generate your 24-hour demand profile.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HOURLY_LOAD_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="offPeakFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5c68db" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#5c68db" stopOpacity={0.05} />
                      </linearGradient>

                      <linearGradient id="peakFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.65} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="var(--text-muted)"
                      fontSize={10}
                      minTickGap={45}
                    />
                    <YAxis stroke="var(--text-muted)" fontSize={11} />
                    <Tooltip
                      cursor={{ stroke: "#8183fc", strokeWidth: 1.5, strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="glass-card p-3 rounded-xl border text-xs shadow-xl space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="font-bold t-primary">{item.timeLabel}</span>
                                {item.isPeak ? (
                                  <Badge variant="amber" size="sm">
                                    PEAK (₱16.83/kWh)
                                  </Badge>
                                ) : (
                                  <Badge variant="emerald" size="sm">
                                    OFF-PEAK (₱12.45/kWh)
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t pf-divider">
                                <span className="t-muted">Total Draw:</span>
                                <span className="font-mono font-bold text-amber-500 dark:text-yellow-300">{item.watts} Watts</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="t-muted">Est. Rate:</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₱{Number(item.ratePerHour ?? ((item.watts || 0) / 1000 * 14.8261)).toFixed(2)}/hr</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="watts"
                      stroke="#5c68db"
                      strokeWidth={2.5}
                      fill="url(#offPeakFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right Column: Monthly Volume & Cost Projection Bar Chart */}
        <div className="lg:col-span-5">
          <GlassCard className="space-y-3.5">
            <div className="pb-3 border-b pf-divider flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold t-primary">Monthly Historical & Projected Trend</h3>
                <p className="text-[11px] t-muted">Active telemetry from Aug 2026</p>
              </div>
              <span className="text-[10px] font-bold font-mono t-accent bg-[#5c68db]/15 px-2 py-0.5 rounded-lg border border-[#5c68db]/30">
                ACTIVE
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="glass-card p-3 rounded-xl border text-xs shadow-xl space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold t-primary">{item.month}</span>
                              <Badge variant={item.kwh > 0 ? "primary" : "neutral"} size="sm">
                                {item.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t pf-divider">
                              <span className="t-muted">Energy Load:</span>
                              <span className="font-mono font-bold t-primary">{item.kwh} kWh</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-[11px]">
                              <span className="t-muted">Est. Amount:</span>
                              <span className="font-mono font-bold text-amber-500 dark:text-yellow-300">₱{item.cost.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="kwh" fill="#5c68db" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

