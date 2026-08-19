import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { MetricCard } from "../common/MetricCard";
import { UserAppliance, UserCalendarEvent } from "../../types";
import {
  Zap,
  Calendar as CalIcon,
  Clock,
  Flame,
  Plus,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Wind,
  Refrigerator,
  Tv,
  Fan,
  Shirt,
  Power,
  Info,
  Coins,
  RotateCcw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { useCreate, useDelete, useUpdate } from "@refinedev/core";
import { computeHourlyLoadCurve, formatHourMinute12, formatHourDetailed } from "../../lib/loadCurveService";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events: UserCalendarEvent[];
}

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  events,
}) => {
  const [zoomPreset, setZoomPreset] = useState<"24h" | "morning" | "day" | "evening">("24h");
  const [resolutionMinutes, setResolutionMinutes] = useState<1 | 5 | 15 | 30>(5);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventApplianceId, setEventApplianceId] = useState("");
  const [eventHour, setEventHour] = useState(14);
  const [eventMinute, setEventMinute] = useState(0);
  const [eventDuration, setEventDuration] = useState(2);
  const [eventCategory, setEventCategory] = useState<"appliance" | "billing" | "peak" | "audit">("appliance");

  const { mutate: createEvent } = useCreate();
  const { mutate: deleteEvent } = useDelete();
  const { mutate: updateAppliance } = useUpdate();

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = new Date(2026, 7, 19);
  today.setHours(0, 0, 0, 0);

  const selDateMidnight = new Date(selectedDate);
  selDateMidnight.setHours(0, 0, 0, 0);

  const isPast = selDateMidnight < today;
  const isToday = selDateMidnight.getTime() === today.getTime();
  const isFuture = selDateMidnight > today;

  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayOfWeekKey = dayNames[selectedDate.getDay()];
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "air conditioners":
        return <Wind className="w-4 h-4 text-[#8183fc]" />;
      case "refrigerators & freezers":
        return <Refrigerator className="w-4 h-4 text-[#8183fc]" />;
      case "television sets":
        return <Tv className="w-4 h-4 text-[#8183fc]" />;
      case "electric fans":
        return <Fan className="w-4 h-4 text-[#8183fc]" />;
      case "washing machines":
        return <Shirt className="w-4 h-4 text-[#8183fc]" />;
      default:
        return <Lightbulb className="w-4 h-4 text-[#8183fc]" />;
    }
  };

  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  const getTurnOnTimeFormatted = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return null;
    const d = new Date(turnedOnAt);
    return formatHourMinute12(d.getHours(), d.getMinutes());
  };

  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const liveSessionSpent = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  // Hourly curve logic
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

  const hourlyData = isPast
    ? []
    : computeHourlyLoadCurve({
        appliances,
        events,
        dayOfWeekKey,
        resolutionMinutes,
        startHour,
        endHour,
      });

  const dailyAppliances = appliances.map((app) => {
    const dailyHours = isWeekend ? Math.min(24, app.hours_per_day * 1.25) : app.hours_per_day;
    const dailyKwh = (app.watts * dailyHours * (app.quantity || 1)) / 1000;
    const dailyCost = dailyKwh * 14.8261;
    return {
      ...app,
      dailyHours,
      dailyKwh,
      dailyCost,
    };
  });

  const totalDailyKwh = dailyAppliances.reduce((acc, app) => acc + app.dailyKwh, 0);
  const totalDailyCost = totalDailyKwh * 14.8261;
  const peakKwh = totalDailyKwh * 0.38;
  const topAppliance = [...dailyAppliances].sort((a, b) => b.dailyCost - a.dailyCost)[0];

  const dateEvents = events.filter((e) => e.day === dayOfWeekKey);

  const togglePower = (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: newState,
        last_turned_on_at: newState ? new Date().toISOString() : null,
      },
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEvent({
      resource: "user_calendar_events",
      values: {
        title: eventTitle || "Scheduled Appliance Run",
        category: eventCategory,
        appliance_id: eventApplianceId || null,
        day: dayOfWeekKey,
        hour: Number(eventHour),
        duration_hours: Number(eventDuration),
        is_recurring: true,
      },
    });
    setIsAddEventOpen(false);
    setEventTitle("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Analytics for ${formattedDate}`}
      subtitle="Detailed appliance telemetry, live stopwatches, and energy schedule planner"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Top Date Header Tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl pf-input">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5c68db] text-white">
              <CalIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold t-primary block">{formattedDate}</span>
              <span className="text-[11px] t-accent">
                {isToday
                  ? "Current Day Live Telemetry & Active Circuits"
                  : isPast
                  ? "Historical Date — Account tracking started August 19, 2026"
                  : "Upcoming Date — Unrecorded (Future Schedule Profile)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isToday ? (
              <Badge variant="primary" size="sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                Today Live
              </Badge>
            ) : isPast ? (
              <Badge variant="neutral" size="sm">Prior Period</Badge>
            ) : (
              <Badge variant="neutral" size="sm">Upcoming Date</Badge>
            )}
            <Badge variant="primary" size="sm">
              {dateEvents.length} Tasks Scheduled
            </Badge>
          </div>
        </div>

        {isPast ? (
          <div className="p-8 rounded-2xl pf-input text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#5c68db]/15 border border-[#5c68db]/30 flex items-center justify-center mx-auto text-[#8183fc]">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold t-primary">No Historical Telemetry on this Date</h4>
              <p className="text-xs t-muted max-w-md mx-auto">
                Your PowerForecast account tracking began on <strong>August 19, 2026</strong>. No previous device telemetry was logged for {formattedDate}.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddEventOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Schedule Task for this Weekday ({selectedDate.toLocaleDateString("en-US", { weekday: "short" })})
              </Button>
            </div>
          </div>
        ) : isFuture ? (
          <div className="p-8 rounded-2xl pf-input text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#5c68db]/15 border border-[#5c68db]/30 flex items-center justify-center mx-auto text-[#8183fc]">
              <Clock className="w-6 h-6 text-[#8183fc]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold t-primary">Upcoming Date (Unrecorded)</h4>
              <p className="text-xs t-muted max-w-md mx-auto">
                No telemetry recorded yet for {formattedDate}. Projections are calculated in the background based on your registered appliances and displayed in the calendar header.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddEventOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Schedule Task for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 4 Summary Metric Cards for Today */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <MetricCard
                title={runningAppliances.length > 0 ? "Live Session Spent" : "Estimated Daily Cost"}
                value={runningAppliances.length > 0 ? `₱${liveSessionSpent.toFixed(4)}` : `₱${totalDailyCost.toFixed(2)}`}
                subtitle={runningAppliances.length > 0 ? "Live accumulating" : "Tariff: ₱14.82/kWh"}
                icon={<Coins className="w-4 h-4 text-yellow-400" />}
                trend={{ value: runningAppliances.length > 0 ? `${runningAppliances.length} ON` : `₱${(totalDailyCost / 24).toFixed(2)}/hr`, direction: "neutral" }}
              />
              <MetricCard
                title="Daily Total Energy"
                value={`${totalDailyKwh.toFixed(1)} kWh`}
                subtitle="24-hour volume"
                icon={<TrendingUp className="w-4 h-4 text-[#8183fc]" />}
                trend={{ value: `${appliances.length} devices`, direction: "neutral" }}
              />
              <MetricCard
                title="Peak Hours Share"
                value={`${totalDailyKwh > 0 ? ((peakKwh / totalDailyKwh) * 100).toFixed(0) : 0}%`}
                subtitle={`${peakKwh.toFixed(1)} kWh during peak`}
                icon={<Flame className="w-4 h-4 text-amber-500" />}
                trend={{ value: "11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM", direction: "neutral" }}
              />
              <MetricCard
                title="Highest Load Source"
                value={topAppliance && appliances.length > 0 ? `${topAppliance.name.split(" ")[0]}` : "None"}
                subtitle={topAppliance && appliances.length > 0 ? `₱${topAppliance.dailyCost.toFixed(1)} on this day` : "No devices"}
                icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                trend={{ value: topAppliance && appliances.length > 0 ? `${topAppliance.watts}W` : "", direction: "up" }}
              />
            </div>

            {/* 24-Hour Load Curve for Today with Zoom Controls */}
            <div className="p-4 rounded-2xl glass-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b pf-divider">
                <div>
                  <h3 className="text-xs font-bold t-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8183fc]" />
                    Daily Load Curve on {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    <span className="text-[10px] text-amber-500 dark:text-yellow-300 font-mono">({resolutionMinutes}m Resolution)</span>
                  </h3>
                  <p className="text-[11px] t-muted">
                    Peak windows: 11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM
                  </p>
                </div>

                {/* Zoom and Granularity Controls */}
                <div className="flex flex-wrap items-center gap-1.5">
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
                <div className="py-12 text-center text-xs t-muted">
                  No appliances registered. Add devices to visualize hourly power draw.
                </div>
              ) : (
                <div className="h-60 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dateOffPeakFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5c68db" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#5c68db" stopOpacity={0.05} />
                        </linearGradient>

                        <linearGradient id="datePeakFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.65} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                      <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={10} minTickGap={45} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} />
                      <Tooltip
                        cursor={{ stroke: "#8183fc", strokeWidth: 1.5, strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            const activeDevices = item.activeDevices || [];
                            const isFuture = item.isFuture;

                            return (
                              <div className="glass-card p-3 rounded-xl border text-xs shadow-xl min-w-[240px] space-y-1.5">
                                <div className="flex items-center justify-between pb-1 border-b pf-divider">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold t-primary">{item.detailedHour || item.timeLabel}</span>
                                    {item.isPeak && (
                                      <Badge variant="amber" size="sm">
                                        PEAK
                                      </Badge>
                                    )}
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                        isFuture
                                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20"
                                      }`}
                                    >
                                      {isFuture ? "FUTURE" : "RECORDED"}
                                    </span>
                                  </div>
                                  <span className={`font-bold font-mono ${item.isPeak ? "text-red-500" : "text-amber-500 dark:text-yellow-300"}`}>{item.watts}W</span>
                                </div>

                                <div className="space-y-1 py-0.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="t-secondary font-medium">Cost Rate:</span>
                                    <span className={`font-bold font-mono text-xs ${item.isPeak ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                                      ₱{item.costPerHour.toFixed(2)}/hr
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] t-muted font-mono">
                                    <span>₱{item.costPerMinute.toFixed(3)}/min</span>
                                    <span className="px-1.5 py-0.5 rounded font-semibold text-[9px] pf-input">
                                      {item.rateLabel || (item.isPeak ? "₱16.83/kWh Peak" : "₱12.45/kWh Off-Peak")}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t pf-divider">
                                    <span className="t-muted font-medium">
                                      {isFuture ? "Spent So Far:" : "Accumulated Spent:"}
                                    </span>
                                    <span className="text-amber-500 dark:text-yellow-300 font-bold font-mono">
                                      ₱{item.accumulatedCost.toFixed(4)}
                                    </span>
                                  </div>
                                </div>

                                {activeDevices.length > 0 ? (
                                  <div className="space-y-1 pt-1 border-t pf-divider">
                                    <span className="text-[10px] t-accent font-semibold block uppercase tracking-wider">
                                      {isFuture ? "Projected Devices:" : `Active Devices (${activeDevices.length}):`}
                                    </span>
                                    {activeDevices.map((d: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-[11px] t-secondary">
                                        <span className="truncate max-w-[130px]" title={d.name}>{d.name}</span>
                                        <span className="text-amber-500 dark:text-yellow-300 font-medium shrink-0 ml-2 font-mono">{d.watts}W ({d.startHourText})</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] t-muted italic pt-0.5">
                                    Standby (0W draw at this interval)
                                  </p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="liveOffPeakWatts"
                        stroke="#5c68db"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#dateOffPeakFill)"
                        isAnimationActive={false}
                        name="Off-Peak Load"
                        connectNulls={false}
                      />

                      <Area
                        type="monotone"
                        dataKey="livePeakWatts"
                        stroke="#ff385c"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#datePeakFill)"
                        isAnimationActive={false}
                        name="Peak Load"
                        connectNulls={false}
                      />

                      <Area
                        type="monotone"
                        dataKey="futureWatts"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        fill="none"
                        isAnimationActive={false}
                        name="Future / Projected"
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Appliance Breakdown */}
            <div className="p-4 rounded-2xl glass-card space-y-3">
              <div className="flex items-center justify-between pb-3 border-b pf-divider">
                <div>
                  <h3 className="text-xs font-bold t-primary flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Appliance Load & Real-Time Telemetry
                  </h3>
                  <p className="text-[11px] t-muted">
                    Live runtime stopwatches with minute start time and real-time accumulated cost
                  </p>
                </div>
                <span className="text-xs t-accent font-bold">
                  {dailyAppliances.length} Devices
                </span>
              </div>

              {dailyAppliances.length === 0 ? (
                <div className="py-8 text-center text-xs t-muted">
                  No registered appliances. Add devices in the Appliance Hub to populate this breakdown.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs t-secondary">
                    <thead className="bg-[#5c68db]/10 text-[11px] uppercase tracking-wider t-accent border-b pf-divider">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Appliance</th>
                        <th className="py-2.5 px-3 font-bold">Power</th>
                        <th className="py-2.5 px-3 font-bold">Live Time ON</th>
                        <th className="py-2.5 px-3 font-bold">Live Spent (₱)</th>
                        <th className="py-2.5 px-3 font-bold">Daily Run</th>
                        <th className="py-2.5 px-3 font-bold">Daily Cost</th>
                        <th className="py-2.5 px-3 font-bold text-center">Circuit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y pf-divider">
                      {dailyAppliances.map((app) => {
                        const isOn = app.is_currently_on;
                        const liveCost = getAccumulatedPesos(app);
                        const startFormatted = getTurnOnTimeFormatted(app.last_turned_on_at);

                        return (
                          <tr key={app.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-xl bg-[#5c68db]/15 border border-[#5c68db]/25 text-[#8183fc]">
                                  {getCategoryIcon(app.category)}
                                </div>
                                <div>
                                  <span className="font-bold t-primary block">{app.name}</span>
                                  <span className="text-[10px] t-muted">{app.room_location || "General"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold t-primary">{app.watts}W</td>
                            <td className="py-2.5 px-3 font-mono text-xs">
                              {isOn ? (
                                <div className="space-y-0.5">
                                  <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3 animate-spin" />
                                    {getRunningDuration(app.last_turned_on_at)}
                                  </span>
                                  {startFormatted && (
                                    <span className="text-[10px] t-accent block">
                                      Started {startFormatted}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="t-muted">Standby</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs">
                              {isOn ? (
                                <span className="text-amber-500 dark:text-yellow-300 font-bold">
                                  ₱{liveCost.toFixed(4)}
                                </span>
                              ) : (
                                <span className="t-muted">₱0.0000</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 t-secondary font-medium">{app.dailyHours} hrs/day</td>
                            <td className="py-2.5 px-3 font-bold font-mono text-amber-500 dark:text-yellow-300">₱{app.dailyCost.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => togglePower(app)}
                                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                  isOn
                                    ? "bg-emerald-600 border-emerald-500 text-white shadow-xs ring-1 ring-emerald-400"
                                    : "btn-secondary"
                                }`}
                                title={isOn ? "Turn Off" : "Turn On"}
                              >
                                <Power className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Scheduled Tasks for this Specific Date */}
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <div className="flex items-center justify-between pb-3 border-b pf-divider">
            <div>
              <h3 className="text-xs font-bold t-primary flex items-center gap-2">
                <CalIcon className="w-4 h-4 text-[#8183fc]" />
                Scheduled Energy Tasks on {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </h3>
              <p className="text-[11px] t-muted">
                Scheduled runs and reminders active for this date
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddEventOpen(true)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Task
            </Button>
          </div>

          {dateEvents.length === 0 ? (
            <div className="p-6 text-center rounded-2xl pf-input space-y-2">
              <p className="text-xs t-muted">No scheduled tasks for this date.</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddEventOpen(true)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Schedule Task
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {dateEvents.map((evt) => {
                const app = appliances.find((a) => a.id === evt.appliance_id);
                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-2xl pf-input flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#5c68db]/15 text-[#8183fc] border border-[#5c68db]/25">
                        <Zap className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold t-primary">{evt.title}</h4>
                        <p className="text-[11px] t-accent font-medium">
                          {formatHourDetailed(evt.hour)} ({evt.duration_hours}h duration) {app ? `• ${app.watts}W` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteEvent({ resource: "user_calendar_events", id: evt.id })}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline Sub-Modal to Add Event for this Date */}
      {isAddEventOpen && (
        <Modal
          isOpen={isAddEventOpen}
          onClose={() => setIsAddEventOpen(false)}
          title={`Schedule Task for ${formattedDate}`}
          subtitle="Add an automated appliance run or reminder on this specific date"
          maxWidth="md"
        >
          <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
            <div>
              <label className="t-secondary font-semibold block mb-1">Appliance (Optional)</label>
              <select
                value={eventApplianceId}
                onChange={(e) => {
                  setEventApplianceId(e.target.value);
                  const app = appliances.find((a) => a.id === e.target.value);
                  if (app) setEventTitle(`${app.name} (${eventDuration}h Run)`);
                }}
                className="w-full pf-input rounded-xl px-3 py-2 cursor-pointer"
              >
                <option value="">Custom Task</option>
                {appliances.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.watts}W)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="t-secondary font-semibold block mb-1">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Living Room AC Pre-Cool"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="t-secondary font-semibold block mb-1">Start Hour</label>
                <select
                  value={eventHour}
                  onChange={(e) => setEventHour(Number(e.target.value))}
                  className="w-full pf-input rounded-xl px-3 py-2 cursor-pointer font-mono"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHourDetailed(i)} {(i >= 11 && i < 16) || (i >= 18 && i < 21) ? "(Peak)" : "(Off-Peak)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="t-secondary font-semibold block mb-1">Duration (Hours)</label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  required
                  value={eventDuration}
                  onChange={(e) => setEventDuration(Number(e.target.value))}
                  className="w-full pf-input rounded-xl px-3 py-2 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" type="button" onClick={() => setIsAddEventOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit">
                Save Task
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
