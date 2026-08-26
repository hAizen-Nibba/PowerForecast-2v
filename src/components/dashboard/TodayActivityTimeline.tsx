import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import {
  Timeline as TimelineIcon,
  FlashOn as FlashOnIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  Tune as TuneIcon,
  Delete as TrashIcon,
} from "@mui/icons-material";
import { useList, useDelete } from "@refinedev/core";
import { UserAppliance, ApplianceUsageLog, DailyApplianceUsage } from "../../types";
import {
  formatDateToKey,
  parseKeyToDate,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  splitSessionAcrossDays,
  allocateNonOverlappingSlots,
  deductSessionDailyUsage,
  accumulateLiveSessionDailyUsage,
} from "../../lib/dailyUsageService";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";

interface TodayActivityTimelineProps {
  appliances: UserAppliance[];
}

interface TimelineSessionBlock {
  id: string;
  logId?: string;
  rawLog?: ApplianceUsageLog;
  type: "live_stopwatch" | "logged_session" | "daily_routine";
  startHour: number;
  endHour: number;
  durationHours: number;
  kwh: number;
  cost: number;
  startTimeStr: string;
  endTimeStr: string;
}

export const TodayActivityTimeline: React.FC<TodayActivityTimelineProps> = ({ appliances }) => {
  const [, setLiveTick] = useState(0);
  const { showSuccess, showInfo, showError } = useToast();
  const { mutate: deleteLog } = useDelete();

  // Block Inspector State
  const [selectedBlockForAction, setSelectedBlockForAction] = useState<{
    block: TimelineSessionBlock;
    appliance: UserAppliance;
  } | null>(null);
  const [isEditingBlockRange, setIsEditingBlockRange] = useState(false);
  const [blockEditStartDateTime, setBlockEditStartDateTime] = useState("");
  const [blockEditEndDateTime, setBlockEditEndDateTime] = useState("");
  const [isSavingBlockAction, setIsSavingBlockAction] = useState(false);

  const todayKey = formatDateToKey(new Date());

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { pageSize: 500 },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    filters: [{ field: "usage_date", operator: "eq", value: todayKey }],
  }) as any;

  const logs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];
  const dailyUsage: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];

  const hasActiveStopwatch = appliances.some((a) => a.is_currently_on && a.last_turned_on_at);

  // Live real-time 1-second ticker when stopwatches are running today
  useEffect(() => {
    if (!hasActiveStopwatch) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveStopwatch]);

  const handleBlockClick = (block: TimelineSessionBlock, appliance: UserAppliance) => {
    setSelectedBlockForAction({ block, appliance });
    setIsEditingBlockRange(false);

    if (block.rawLog) {
      const s = new Date(block.rawLog.started_at);
      const e = block.rawLog.ended_at
        ? new Date(block.rawLog.ended_at)
        : new Date(s.getTime() + (block.rawLog.duration_minutes || 60) * 60000);

      const sIso = `${formatDateToKey(s)}T${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
      const eIso = `${formatDateToKey(e)}T${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;

      setBlockEditStartDateTime(sIso);
      setBlockEditEndDateTime(eIso);
    } else {
      const sDate = parseKeyToDate(todayKey);
      sDate.setHours(Math.floor(block.startHour), Math.round((block.startHour % 1) * 60));
      const eDate = parseKeyToDate(todayKey);
      eDate.setHours(Math.floor(block.endHour), Math.round((block.endHour % 1) * 60));

      const sIso = `${formatDateToKey(sDate)}T${String(sDate.getHours()).padStart(2, "0")}:${String(sDate.getMinutes()).padStart(2, "0")}`;
      const eIso = `${formatDateToKey(eDate)}T${String(eDate.getHours()).padStart(2, "0")}:${String(eDate.getMinutes()).padStart(2, "0")}`;

      setBlockEditStartDateTime(sIso);
      setBlockEditEndDateTime(eIso);
    }
  };

  const handleDeleteBlockSession = async () => {
    if (!selectedBlockForAction) return;
    const { block, appliance } = selectedBlockForAction;
    if (block.logId && block.rawLog) {
      const oldMinutes = block.rawLog.duration_minutes || 60;
      const oldStart = new Date(block.rawLog.started_at);
      const oldEnd = block.rawLog.ended_at
        ? new Date(block.rawLog.ended_at)
        : new Date(oldStart.getTime() + oldMinutes * 60000);

      await deductSessionDailyUsage({
        appliance_id: appliance.id,
        durationMinutes: oldMinutes,
        watts: appliance.watts,
        quantity: appliance.quantity || 1,
        effectiveRate: DEFAULT_EFFECTIVE_RATE,
        user_id: appliance.user_id || null,
        startTime: oldStart,
        endTime: oldEnd,
      });

      deleteLog(
        {
          resource: "appliance_usage_logs",
          id: block.logId,
        },
        {
          onSuccess: () => {
            showInfo("Session log removed and daily usage reconciled.");
            if (logsRes?.refetch) logsRes.refetch();
            if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
            setSelectedBlockForAction(null);
          },
        }
      );
    }
  };

  const handleSaveBlockEdit = async () => {
    if (!selectedBlockForAction) return;
    const { block, appliance } = selectedBlockForAction;
    const start = new Date(blockEditStartDateTime);
    const end = new Date(blockEditEndDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      showError("Please enter a valid start and end time (end must be after start).");
      return;
    }

    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const kwh = calculateKwh(appliance.watts, durationMinutes / 60, appliance.quantity || 1);
    const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

    setIsSavingBlockAction(true);
    try {
      if (block.logId && block.rawLog) {
        const oldMinutes = block.rawLog.duration_minutes || 60;
        const oldStart = new Date(block.rawLog.started_at);
        const oldEnd = block.rawLog.ended_at
          ? new Date(block.rawLog.ended_at)
          : new Date(oldStart.getTime() + oldMinutes * 60000);

        await deductSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes: oldMinutes,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: oldStart,
          endTime: oldEnd,
        });

        await supabaseClient
          .from("appliance_usage_logs")
          .update({
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: kwh,
            estimated_cost: cost,
          })
          .eq("id", block.logId);

        await accumulateLiveSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: start,
          endTime: end,
        });

        showSuccess(`Updated session for ${appliance.name} (${(durationMinutes / 60).toFixed(1)} hrs)!`);
      } else {
        await supabaseClient.from("appliance_usage_logs").insert({
          appliance_id: appliance.id,
          user_id: appliance.user_id || null,
          started_at: start.toISOString(),
          ended_at: end.toISOString(),
          duration_minutes: durationMinutes,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: "converted_routine",
        });

        await accumulateLiveSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: start,
          endTime: end,
        });

        showSuccess(`Logged timestamped session for ${appliance.name} (${(durationMinutes / 60).toFixed(1)} hrs)!`);
      }

      if (logsRes?.refetch) logsRes.refetch();
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
      setSelectedBlockForAction(null);
    } catch (err: any) {
      showError(`Failed to save session edit: ${err?.message}`);
    } finally {
      setIsSavingBlockAction(false);
    }
  };

  // Compute 24-hour session blocks for each appliance today
  const timelineData = useMemo(() => {
    return appliances.map((app) => {
      const sessionBlocks: TimelineSessionBlock[] = [];

      // 1. Logged Stopwatch Sessions for Today (using splitSessionAcrossDays for exact midnight slices)
      (logs || []).forEach((log) => {
        if (log.appliance_id !== app.id) return;
        const start = new Date(log.started_at);
        const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
        const slices = splitSessionAcrossDays(start, end);
        const matchingSlice = slices.find((s) => s.dateKey === todayKey);

        if (matchingSlice) {
          const sliceKwh = calculateKwh(app.watts, matchingSlice.hours, app.quantity || 1);
          const sliceCost = calculateCost(sliceKwh, DEFAULT_EFFECTIVE_RATE);

          sessionBlocks.push({
            id: `${log.id}-${matchingSlice.dateKey}`,
            logId: log.id,
            rawLog: log,
            type: "logged_session",
            startHour: matchingSlice.startHourFrac,
            endHour: matchingSlice.endHourFrac,
            durationHours: matchingSlice.hours,
            kwh: sliceKwh,
            cost: sliceCost,
            startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTimeStr: matchingSlice.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }
      });

      // 2. Currently Running Live Stopwatch
      if (app.is_currently_on && app.last_turned_on_at) {
        const start = new Date(app.last_turned_on_at);
        const now = new Date();
        const slices = splitSessionAcrossDays(start, now);
        const matchingSlice = slices.find((s) => s.dateKey === todayKey);

        if (matchingSlice) {
          const liveKwh = calculateKwh(app.watts, matchingSlice.hours, app.quantity || 1);
          const liveCost = calculateCost(liveKwh, DEFAULT_EFFECTIVE_RATE);

          sessionBlocks.push({
            id: `live-${app.id}`,
            type: "live_stopwatch",
            startHour: matchingSlice.startHourFrac,
            endHour: matchingSlice.endHourFrac,
            durationHours: matchingSlice.hours,
            kwh: liveKwh,
            cost: liveCost,
            startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTimeStr: "LIVE ACTIVE",
          });
        }
      }

      // 3. Daily Routine / Manual Logged Hours (Allocated to non-overlapping idle slots)
      const dayRecord = dailyUsage.find((d) => d.appliance_id === app.id);
      const recordedDayHours = Math.max(0, Math.min(24, Number(dayRecord?.hours_used) || 0));
      const stopwatchHoursSum = sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0);

      const occupiedIntervals = sessionBlocks.map((s) => ({
        startHour: s.startHour,
        endHour: s.endHour,
      }));

      const preferredStartHour = app.start_hour !== undefined ? app.start_hour : 8;

      if (recordedDayHours > stopwatchHoursSum + 0.05) {
        const extraHours = Math.min(24 - stopwatchHoursSum, recordedDayHours - stopwatchHoursSum);
        const freeSlots = allocateNonOverlappingSlots(occupiedIntervals, extraHours, preferredStartHour);

        freeSlots.forEach((slot, idx) => {
          const duration = Math.max(0.001, slot.endHour - slot.startHour);
          const routineKwh = calculateKwh(app.watts, duration, app.quantity || 1);
          const routineCost = calculateCost(routineKwh, DEFAULT_EFFECTIVE_RATE);
          const startH = Math.floor(slot.startHour);
          const startM = Math.round((slot.startHour % 1) * 60);
          const endH = Math.floor(slot.endHour);
          const endM = Math.round((slot.endHour % 1) * 60);

          sessionBlocks.push({
            id: `routine-extra-${app.id}-${idx}`,
            type: "daily_routine",
            startHour: slot.startHour,
            endHour: slot.endHour,
            durationHours: duration,
            kwh: routineKwh,
            cost: routineCost,
            startTimeStr: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
            endTimeStr: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
          });
        });
      } else if (sessionBlocks.length === 0 && app.hours_per_day > 0) {
        // Routine Baseline placeholder
        const baselineHours = Math.min(24, app.hours_per_day);
        const freeSlots = allocateNonOverlappingSlots([], baselineHours, preferredStartHour);

        freeSlots.forEach((slot, idx) => {
          const duration = Math.max(0.001, slot.endHour - slot.startHour);
          const routineKwh = calculateKwh(app.watts, duration, app.quantity || 1);
          const routineCost = calculateCost(routineKwh, DEFAULT_EFFECTIVE_RATE);
          const startH = Math.floor(slot.startHour);
          const startM = Math.round((slot.startHour % 1) * 60);
          const endH = Math.floor(slot.endHour);
          const endM = Math.round((slot.endHour % 1) * 60);

          sessionBlocks.push({
            id: `baseline-${app.id}-${idx}`,
            type: "daily_routine",
            startHour: slot.startHour,
            endHour: slot.endHour,
            durationHours: duration,
            kwh: routineKwh,
            cost: routineCost,
            startTimeStr: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")} (Scheduled)`,
            endTimeStr: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
          });
        });
      }

      const totalDayHours = Math.min(
        24,
        sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0)
      );

      return {
        app,
        sessionBlocks,
        totalDayHours,
      };
    }).filter((item) => item.sessionBlocks.length > 0 || item.app.is_currently_on);
  }, [appliances, logs, dailyUsage, todayKey]);

  // Peak simultaneous wattage demand
  const peakDemand = useMemo(() => {
    let maxWatts = 0;
    for (let h = 0; h < 24; h += 0.5) {
      let currentDraw = 0;
      timelineData.forEach(({ app, sessionBlocks }) => {
        const isActive = sessionBlocks.some((b) => h >= b.startHour && h <= b.endHour);
        if (isActive) {
          currentDraw += app.watts * (app.quantity || 1);
        }
      });
      if (currentDraw > maxWatts) maxWatts = currentDraw;
    }
    return maxWatts;
  }, [timelineData]);

  const activeLiveCount = appliances.filter((a) => a.is_currently_on).length;

  return (
    <Card
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 3.5,
        border: "1px solid",
        borderColor: activeLiveCount > 0 ? "rgba(52, 211, 153, 0.4)" : "rgba(108, 122, 224, 0.25)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(10, 10, 36, 0.65)" : "rgba(255, 255, 255, 0.9)",
        boxShadow: activeLiveCount > 0 ? "0 0 24px rgba(52, 211, 153, 0.08)" : "none",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: activeLiveCount > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
              color: activeLiveCount > 0 ? "#34d399" : "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TimelineIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Today's 24-Hour Activity & Stopwatch Timeline
              </Typography>
              {activeLiveCount > 0 && (
                <Chip
                  icon={<FlashOnIcon sx={{ fontSize: "13px !important", color: "#34d399 !important" }} />}
                  label={`${activeLiveCount} Live Active`}
                  size="small"
                  color="success"
                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800 }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Exact session blocks throughout today (00:00 – 24:00) with second-by-second stopwatch metering
            </Typography>
          </Box>
        </Box>

        {/* Legend & Smart Calendar Link */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", boxShadow: "0 0 6px #34d399" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 700 }}>
                Live Stopwatch
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#6366f1" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 700 }}>
                Logged Session
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#a855f7" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 700 }}>
                Daily Routine
              </Typography>
            </Box>
          </Box>

          <Button
            component={Link}
            to="/calendar"
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", py: 0.5 }}
          >
            Calendar Details
          </Button>
        </Box>
      </Box>

      {/* 24-Hour Time Axis Labels */}
      <Box sx={{ display: "flex", justifyContent: "space-between", pl: { xs: 15, sm: 22 }, pr: 1, mb: 1 }}>
        {["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"].map((time, idx) => (
          <Typography key={idx} variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", fontWeight: 700 }}>
            {time}
          </Typography>
        ))}
      </Box>

      {/* Appliances Gantt Rows */}
      {timelineData.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No appliance activity recorded yet today. Start a stopwatch in the Live Power Board or log hours in the Calendar!
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          {timelineData.map(({ app, sessionBlocks, totalDayHours }) => (
            <Box
              key={app.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.25,
                borderRadius: 2.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                border: "1px solid",
                borderColor: app.is_currently_on ? "rgba(52, 211, 153, 0.3)" : "rgba(255, 255, 255, 0.05)",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
                },
                transition: "all 0.2s ease",
              }}
            >
              {/* Appliance Label Column */}
              <Box sx={{ width: { xs: 110, sm: 160 }, minWidth: { xs: 110, sm: 160 } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.75rem" }} noWrap>
                  {app.name}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
                  <Chip
                    label={`${app.watts}W`}
                    size="small"
                    sx={{ height: 16, fontSize: "0.5625rem", fontWeight: 800, bgcolor: "rgba(99, 102, 241, 0.15)" }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem", fontWeight: 700 }}>
                    {totalDayHours.toFixed(1)}h total
                  </Typography>
                </Box>
              </Box>

              {/* 24-Hour Gantt Track */}
              <Box
                sx={{
                  flexGrow: 1,
                  height: 26,
                  borderRadius: 2,
                  bgcolor: "rgba(0, 0, 0, 0.25)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* 3-hour grid dividing lines */}
                {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
                  <Box
                    key={pct}
                    sx={{
                      position: "absolute",
                      left: `${pct}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      bgcolor: "rgba(255, 255, 255, 0.05)",
                    }}
                  />
                ))}

                {/* Session Blocks */}
                {sessionBlocks.map((block) => {
                  const leftPct = (block.startHour / 24) * 100;
                  const widthPct = Math.max(1.5, ((block.endHour - block.startHour) / 24) * 100);

                  const bgGradient =
                    block.type === "live_stopwatch"
                      ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                      : block.type === "logged_session"
                      ? "linear-gradient(90deg, #6366f1 0%, #818cf8 100%)"
                      : "linear-gradient(90deg, #a855f7 0%, #c084fc 100%)";

                  const glowColor =
                    block.type === "live_stopwatch"
                      ? "0 0 10px rgba(52, 211, 153, 0.6)"
                      : block.type === "logged_session"
                      ? "0 0 8px rgba(99, 102, 241, 0.4)"
                      : "none";

                  return (
                    <Tooltip
                      key={block.id}
                      arrow
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#fff" }}>
                            {app.name} ({block.type === "live_stopwatch" ? "🟢 Live Active" : block.type === "logged_session" ? "🔵 Logged Session (Click to Edit / Delete)" : "🟣 Daily Routine (Click to Edit)"})
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                            ⏰ {block.startTimeStr} – {block.endTimeStr} ({block.durationHours.toFixed(2)} hrs)
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, mt: 0.5 }}>
                            ⚡ {block.kwh.toFixed(3)} kWh • ₱{block.cost.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ display: "block", color: "primary.light", fontWeight: 800, mt: 0.5 }}>
                            👉 Click block to inspect / edit / delete
                          </Typography>
                        </Box>
                      }
                    >
                      <Box
                        onClick={() => handleBlockClick(block, app)}
                        sx={{
                          position: "absolute",
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          top: 2,
                          bottom: 2,
                          borderRadius: 1.5,
                          background: bgGradient,
                          boxShadow: glowColor,
                          cursor: "pointer",
                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "scaleY(1.15)",
                            zIndex: 10,
                            boxShadow: "0 0 14px rgba(255, 255, 255, 0.6)",
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Footer Demand Indicator */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px solid rgba(255, 255, 255, 0.05)", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Peak Today Demand: <strong style={{ color: "#ffd54f" }}>{peakDemand} W</strong> (₱{((peakDemand / 1000) * 14.8261).toFixed(2)}/hr rate)
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
          💡 Click any block to view telemetry, edit start/end timestamps, or delete the log.
        </Typography>
      </Box>

      {/* Interactive Timeline Block Inspector & Editor Dialog */}
      {selectedBlockForAction && (
        <Dialog
          open={Boolean(selectedBlockForAction)}
          onClose={() => {
            setSelectedBlockForAction(null);
            setIsEditingBlockRange(false);
          }}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3.5,
                bgcolor: "#0f0e3a",
                border: "1px solid rgba(108, 122, 224, 0.4)",
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
                color: "#ffffff",
                p: 1,
              },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: selectedBlockForAction.block.type === "live_stopwatch" ? "rgba(16, 185, 129, 0.2)" : selectedBlockForAction.block.type === "logged_session" ? "rgba(99, 102, 241, 0.2)" : "rgba(168, 85, 247, 0.2)",
                  color: selectedBlockForAction.block.type === "live_stopwatch" ? "#34d399" : selectedBlockForAction.block.type === "logged_session" ? "#818cf8" : "#c084fc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TimerIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                  {selectedBlockForAction.appliance.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {selectedBlockForAction.appliance.watts}W • {selectedBlockForAction.block.type === "live_stopwatch" ? "Live Running Stopwatch" : selectedBlockForAction.block.type === "logged_session" ? "Timestamped Session Log" : "Daily Routine Slot"}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setSelectedBlockForAction(null)}>
              <CloseIcon sx={{ color: "text.secondary" }} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
            {/* Metrics Card */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255, 255, 255, 0.08)",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1.5,
                textAlign: "center",
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>DURATION</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.light" }}>
                  {selectedBlockForAction.block.durationHours >= 1 ? `${selectedBlockForAction.block.durationHours.toFixed(1)} hrs` : `${Math.round(selectedBlockForAction.block.durationHours * 60)} mins`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>ENERGY</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                  {selectedBlockForAction.block.kwh.toFixed(3)} kWh
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>EST. COST</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#34d399" }}>
                  ₱{selectedBlockForAction.block.cost.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            {/* Time Range Info or Edit Form */}
            {!isEditingBlockRange ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "rgba(99, 102, 241, 0.06)",
                  borderColor: "rgba(99, 102, 241, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>ACTIVE TIME WINDOW</Typography>
                  {selectedBlockForAction.block.type !== "live_stopwatch" && (
                    <Button
                      size="small"
                      startIcon={<TuneIcon sx={{ fontSize: 15 }} />}
                      onClick={() => setIsEditingBlockRange(true)}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem" }}
                    >
                      Edit Time Range
                    </Button>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ⏰ {selectedBlockForAction.block.startTimeStr} ➔ {selectedBlockForAction.block.endTimeStr}
                </Typography>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "rgba(99, 102, 241, 0.08)",
                  borderColor: "rgba(99, 102, 241, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.light" }}>
                  Adjust Start & End Timestamps
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <TextField
                    type="datetime-local"
                    label="Session Start Time"
                    value={blockEditStartDateTime}
                    onChange={(e) => setBlockEditStartDateTime(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    type="datetime-local"
                    label="Session End Time"
                    value={blockEditEndDateTime}
                    onChange={(e) => setBlockEditEndDateTime(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button size="small" onClick={() => setIsEditingBlockRange(false)} disabled={isSavingBlockAction}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveBlockEdit}
                    disabled={isSavingBlockAction}
                    sx={{ fontWeight: 800 }}
                  >
                    {isSavingBlockAction ? "Saving..." : "Save Time Window"}
                  </Button>
                </Box>
              </Paper>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            {selectedBlockForAction.block.type === "logged_session" && selectedBlockForAction.block.logId ? (
              <Button
                color="error"
                variant="outlined"
                startIcon={<TrashIcon />}
                onClick={handleDeleteBlockSession}
                disabled={isSavingBlockAction}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Delete Session Log
              </Button>
            ) : selectedBlockForAction.block.type === "daily_routine" ? (
              <Button
                color="primary"
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setIsEditingBlockRange(true)}
                disabled={isSavingBlockAction}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Convert to Exact Session
              </Button>
            ) : <Box />}

            <Button
              variant="outlined"
              onClick={() => setSelectedBlockForAction(null)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
};

export default TodayActivityTimeline;
