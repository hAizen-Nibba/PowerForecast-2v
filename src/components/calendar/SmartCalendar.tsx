import React, { useState, useEffect, useMemo } from "react";
import { GlassCard } from "../common/GlassCard";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import {
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  LayoutGrid,
  List,
  TrendingUp,
  Clock,
  Sliders,
  CalendarDays,
  Activity,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Radio,
  Tv,
  Fan,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { UserCalendarEvent, UserAppliance } from "../../types";
import { useList } from "@refinedev/core";
import { formatHourMinute12, computeHourlyLoadCurve } from "../../lib/loadCurveService";

export const SmartCalendar: React.FC = () => {
  const today = new Date(2026, 7, 19); // August 19, 2026
  today.setHours(0, 0, 0, 0);

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 19));
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week" | "timeline">("month");
  const [timelineResolution, setTimelineResolution] = useState<1 | 5 | 15 | 30>(5);
  const [timelineZoomRange, setTimelineZoomRange] = useState<"24h" | "morning" | "day" | "evening">("24h");

  // Global 1-second live ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
  }) as any;

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMode === "week") {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "week") {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 19));
  };

  const formatHour12 = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:00 ${period}`;
  };

  // Base daily consumption across registered appliances
  const baseDailyKwh = appliances.reduce(
    (acc, app) => acc + (app.watts * app.hours_per_day * (app.quantity || 1)) / 1000,
    0
  );

  const dayOfWeekKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  // Real-time calculation for active appliances
  const runningAppliances = appliances.filter((a) => a.is_currently_on);

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
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

  const liveSessionSpentToday = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);
  const oldestRunningAppliance = runningAppliances.sort((a, b) => {
    const timeA = a.last_turned_on_at ? new Date(a.last_turned_on_at).getTime() : Date.now();
    const timeB = b.last_turned_on_at ? new Date(b.last_turned_on_at).getTime() : Date.now();
    return timeA - timeB;
  })[0];

  // Month-End Projection calculation
  const isCurrentMonth = month === 7 && year === 2026;
  const isPastMonth = new Date(year, month + 1, 0) < today;
  const isFutureMonth = new Date(year, month, 1) > today;

  let monthProjectedEndKwh = 0;
  if (isCurrentMonth) {
    const remainingDays = Math.max(1, daysInMonth - today.getDate() + 1);
    monthProjectedEndKwh = baseDailyKwh * remainingDays;
  } else if (isFutureMonth) {
    monthProjectedEndKwh = baseDailyKwh * daysInMonth;
  }

  // Calculate timeline start and end hour
  let tStartHour = 0;
  let tEndHour = 24;
  if (timelineZoomRange === "morning") {
    tStartHour = 0;
    tEndHour = 8;
  } else if (timelineZoomRange === "day") {
    tStartHour = 8;
    tEndHour = 16;
  } else if (timelineZoomRange === "evening") {
    tStartHour = 16;
    tEndHour = 24;
  }

  const timelineLoadData = useMemo(() => {
    return computeHourlyLoadCurve({
      appliances,
      events,
      dayOfWeekKey: dayOfWeekKeys[currentDate.getDay()],
      resolutionMinutes: timelineResolution,
      startHour: tStartHour,
      endHour: tEndHour,
    });
  }, [appliances, events, currentDate, timelineResolution, tStartHour, tEndHour]);

  // Week Days Array
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  return (
    <div className="space-y-5">
      {/* Top Header & View Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black t-primary tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5c68db] text-white shadow-md shadow-[#5c68db]/20">
              <CalIcon className="w-5 h-5" />
            </div>
            Energy Calendar & Timeline
          </h2>
          <p className="text-xs sm:text-sm t-muted mt-0.5">
            Zoomable schedules, minute-level start times, and month-end energy projections
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3 Zoom Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl glass-card text-xs">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-secondary hover:t-primary"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "week"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-secondary hover:t-primary"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-secondary hover:t-primary"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-yellow-400" />
              <span>Day Timeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Month / Week Navigation Banner */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 pf-input rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg t-muted hover:t-primary transition-colors cursor-pointer"
              title={viewMode === "week" ? "Previous Week" : "Previous Month"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg text-xs font-bold t-primary hover:bg-[#5c68db]/15 transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg t-muted hover:t-primary transition-colors cursor-pointer"
              title={viewMode === "week" ? "Next Week" : "Next Month"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-black t-primary tracking-tight">
            {viewMode === "week" ? (
              <span>
                Week of {monthNames[weekDays[0].getMonth()]} {weekDays[0].getDate()} – {monthNames[weekDays[6].getMonth()]} {weekDays[6].getDate()}, {year}
              </span>
            ) : viewMode === "timeline" ? (
              <span>
                {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            ) : (
              <span>{monthNames[month]} {year}</span>
            )}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Session Counter in Calendar Banner */}
          {runningAppliances.length > 0 && isCurrentMonth && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-500 dark:text-emerald-300 font-bold">Today Live Spent:</span>
              <span className="font-bold t-primary">₱{liveSessionSpentToday.toFixed(4)}</span>
            </div>
          )}

          {/* Month-End Background Projection Banner */}
          {isPastMonth ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl pf-input text-xs">
              <span className="t-muted">Prior Period:</span>
              <span className="t-muted font-medium">No records before account start</span>
            </div>
          ) : isCurrentMonth ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl pf-input text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-[#8183fc]" />
              <span className="t-muted">Proj. Month-End:</span>
              <span className="font-bold t-primary">{monthProjectedEndKwh.toFixed(1)} kWh</span>
              <span className="text-amber-500 dark:text-amber-400 font-bold">₱{(monthProjectedEndKwh * 14.8261).toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl pf-input text-xs">
              <Clock className="w-3.5 h-3.5 text-[#8183fc]" />
              <span className="t-muted">Est. Proj:</span>
              <span className="font-bold t-primary">{monthProjectedEndKwh.toFixed(1)} kWh</span>
              <span className="text-amber-500 dark:text-amber-400 font-bold">₱{(monthProjectedEndKwh * 14.8261).toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Peak: 11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM</span>
          </div>
        </div>
      </GlassCard>

      {/* 1. MONTH GRID VIEW */}
      {viewMode === "month" && (
        <GlassCard className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold t-accent pb-2 border-b pf-divider">
            <span>Sunday</span>
            <span>Monday</span>
            <span>Tuesday</span>
            <span>Wednesday</span>
            <span>Thursday</span>
            <span>Friday</span>
            <span>Saturday</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[110px] p-2 rounded-xl bg-black/5 dark:bg-white/[0.02] border pf-divider opacity-20 pointer-events-none"
              />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateObj = new Date(year, month, dayNumber);
              dateObj.setHours(0, 0, 0, 0);

              const isPast = dateObj < today;
              const isToday = dateObj.getTime() === today.getTime();
              const isFuture = dateObj > today;

              return (
                <div
                  key={`day-${dayNumber}`}
                  onClick={() => setSelectedDateForModal(dateObj)}
                  className={`min-h-[115px] p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group hover:scale-[1.02] ${
                    isToday
                      ? "bg-[#5c68db]/15 border-[#5c68db] shadow-xl ring-2 ring-[#8183fc]"
                      : isPast || isFuture
                      ? "pf-input opacity-70 hover:opacity-100"
                      : "pf-input"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                        isToday
                          ? "bg-[#5c68db] text-white shadow-xs"
                          : "t-muted group-hover:t-primary"
                      }`}
                    >
                      {dayNumber}
                    </span>

                    {isToday ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#5c68db] text-white font-bold shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Today
                      </span>
                    ) : isPast ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md pf-input t-muted">
                        Prior
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md pf-input t-muted">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Body: live data for Today */}
                  <div className="my-1 space-y-0.5">
                    {isToday ? (
                      <div className="space-y-0.5">
                        {runningAppliances.length > 0 ? (
                          <>
                            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-between">
                              <span>Live Spent:</span>
                              <span>₱{liveSessionSpentToday.toFixed(3)}</span>
                            </div>
                            <div className="text-[10px] t-secondary font-mono flex items-center justify-between">
                              <span className="t-muted">Time ON:</span>
                              <span className="t-primary font-semibold">
                                {getRunningDuration(oldestRunningAppliance?.last_turned_on_at)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Circuits ready
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] t-muted">
                        {isPast ? "No past sessions recorded" : "Future scheduled window"}
                      </div>
                    )}
                  </div>

                  {/* Footer Badge */}
                  <div className="pt-1 border-t pf-divider flex items-center justify-between text-[10px] font-mono">
                    <span className="t-muted">Demand</span>
                    <span className="font-bold t-accent">
                      {isToday && runningAppliances.length > 0
                        ? `${runningAppliances.reduce((a, c) => a + c.watts * (c.quantity || 1), 0)}W`
                        : `${baseDailyKwh.toFixed(1)} kWh`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 2. WEEK VIEW (7 Detailed Day Columns) */}
      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((dateObj) => {
              const isToday = dateObj.getTime() === today.getTime();
              const isPast = dateObj < today;
              const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = dateObj.getDate();
              const dayOfWeekKey = dayOfWeekKeys[dateObj.getDay()];

              // Appliances active or scheduled on this day
              const dayEvents = events.filter((e) => e.is_recurring || e.day === dayOfWeekKey);
              const dayEstimatedKwh = baseDailyKwh;
              const dayEstimatedCost = dayEstimatedKwh * 14.8261;

              return (
                <div
                  key={dateObj.toISOString()}
                  onClick={() => setSelectedDateForModal(dateObj)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group hover:scale-[1.01] ${
                    isToday
                      ? "bg-[#5c68db]/15 border-[#5c68db] shadow-xl ring-2 ring-[#8183fc]"
                      : "glass-card hover:border-[#5c68db]/40"
                  }`}
                >
                  {/* Day Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b pf-divider">
                    <div>
                      <span className="text-xs font-bold t-primary block">{dayName}</span>
                      <span className="text-[11px] t-muted font-mono">{monthNames[dateObj.getMonth()].slice(0, 3)} {dayNum}</span>
                    </div>
                    {isToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5c68db] text-white shadow-xs">
                        Today
                      </span>
                    ) : (
                      <span className="text-[10px] t-muted">
                        {isPast ? "Prior" : "Upcoming"}
                      </span>
                    )}
                  </div>

                  {/* Scheduled Appliance List for this day */}
                  <div className="space-y-2 flex-1 min-h-[140px]">
                    <div className="text-[10px] font-bold t-accent uppercase tracking-wider">
                      Scheduled Load
                    </div>

                    {appliances.slice(0, 4).map((app) => (
                      <div
                        key={app.id}
                        className={`p-1.5 rounded-xl border text-[11px] flex items-center justify-between ${
                          app.is_currently_on && isToday
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold"
                            : "pf-input"
                        }`}
                      >
                        <div className="truncate max-w-[90px]">
                          <span className="truncate block font-semibold">{app.name}</span>
                          <span className="text-[9px] t-muted block">{app.hours_per_day}h/day</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-amber-500 dark:text-yellow-300">
                          {app.watts * (app.quantity || 1)}W
                        </span>
                      </div>
                    ))}

                    {appliances.length > 4 && (
                      <div className="text-[10px] t-muted text-center pt-1">
                        +{appliances.length - 4} more devices
                      </div>
                    )}
                  </div>

                  {/* Column Footer */}
                  <div className="pt-2 border-t pf-divider space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="t-muted">Est. Total:</span>
                      <span className="font-bold t-primary">{dayEstimatedKwh.toFixed(1)} kWh</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="t-muted">Cost:</span>
                      <span className="font-bold text-amber-500 dark:text-yellow-300">
                        ₱{dayEstimatedCost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY TIMELINE VIEW (24-Hour Interactive Timeline with Zoom & Peak Windows) */}
      {viewMode === "timeline" && (
        <div className="space-y-4">
          <GlassCard className="p-5 space-y-5">
            {/* Controls Bar: Zoom Range & Resolution */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b pf-divider">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold t-secondary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#8183fc]" />
                  Time Zoom:
                </span>
                <div className="flex gap-1 p-1 rounded-xl pf-input text-xs font-semibold">
                  {(["24h", "morning", "day", "evening"] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setTimelineZoomRange(z)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        timelineZoomRange === z
                          ? "bg-[#5c68db] text-white shadow-xs"
                          : "t-muted hover:t-primary"
                      }`}
                    >
                      {z === "24h" ? "24H Full" : z === "morning" ? "Morning (00-08)" : z === "day" ? "Day (08-16)" : "Evening (16-24)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold t-secondary flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-yellow-400" />
                  Resolution:
                </span>
                <div className="flex gap-1 p-1 rounded-xl pf-input text-xs font-semibold">
                  {([1, 5, 15, 30] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimelineResolution(r)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        timelineResolution === r
                          ? "bg-[#5c68db] text-white shadow-xs"
                          : "t-muted hover:t-primary"
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 24-Hour Visual Demand Curve Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="t-primary flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#8183fc]" />
                  Minute-Level Load Curve ({timelineResolution}m Resolution)
                </span>
                <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 text-[11px]">
                  <Flame className="w-3.5 h-3.5" />
                  Peak Windows: 11:00 AM – 4:00 PM & 6:00 PM – 9:00 PM
                </span>
              </div>

              {/* Graphical Bar Timeline */}
              <div className="h-44 w-full pf-input rounded-2xl p-3 flex items-end gap-[2px] overflow-x-auto relative">
                {timelineLoadData.map((item, idx) => {
                  const maxWatts = 3000;
                  const heightPercent = Math.min(100, Math.max(8, (item.watts / maxWatts) * 100));
                  return (
                    <div
                      key={idx}
                      className={`flex-1 min-w-[3px] rounded-t-sm transition-all relative group cursor-pointer ${
                        item.isPeak
                          ? "bg-rose-500 hover:bg-rose-400 shadow-xs shadow-rose-500/20"
                          : "bg-[#5c68db] hover:bg-[#8183fc]"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${item.timeLabel}: ${item.watts}W (${item.activeDevices.length} devices)`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                        <div className="px-2.5 py-1.5 rounded-xl glass-card text-[10px] font-mono shadow-2xl border pf-divider whitespace-nowrap">
                          <span className="font-bold t-primary block">{item.timeLabel}</span>
                          <span className="text-amber-500 dark:text-yellow-300 font-bold block">{item.watts} Watts</span>
                          {item.isPeak && <span className="text-rose-400 font-semibold block">⚠️ Peak Tariff Window</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Labels Axis */}
              <div className="flex justify-between text-[10px] font-mono t-muted px-1">
                <span>{formatHourMinute12(tStartHour * 60)}</span>
                <span>{formatHourMinute12(Math.round(((tStartHour + tEndHour) / 2) * 60))}</span>
                <span>{formatHourMinute12(tEndHour * 60 - 1)}</span>
              </div>
            </div>

            {/* Scheduled Devices Table */}
            <div className="space-y-3 pt-3 border-t pf-divider">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold t-primary flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Active Appliance Telemetry on {currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedDateForModal(currentDate)}
                  icon={<Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
                >
                  Inspect Full Daily Analytics
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {appliances.map((app) => (
                  <div
                    key={app.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between ${
                      app.is_currently_on
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "pf-input"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        app.is_currently_on ? "bg-emerald-500/20 text-emerald-400" : "bg-[#5c68db]/15 text-[#8183fc]"
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold t-primary truncate max-w-[130px]">{app.name}</h4>
                        <span className="text-[10px] t-muted block">
                          {app.hours_per_day}h/day • {app.room_location || "Living Room"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-amber-500 dark:text-yellow-300 block">
                        {app.watts * (app.quantity || 1)} W
                      </span>
                      <span className="text-[10px] font-mono t-muted">
                        ~₱{((app.watts * app.hours_per_day * 30 * 14.8261) / 1000).toFixed(0)}/mo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* MODAL: Full Day Breakdown */}
      <DateAnalyticsModal
        isOpen={selectedDateForModal !== null}
        onClose={() => setSelectedDateForModal(null)}
        selectedDate={selectedDateForModal || new Date()}
        appliances={appliances}
        events={events}
      />
    </div>
  );
};
