import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FormatListBulleted as QueueIcon,
  ReceiptLong as ReceiptIcon,
  PowerSettingsNew as PowerIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Insights as InsightsIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Public as PublicIcon,
  AutoAwesome as SparklesIcon,
} from "@mui/icons-material";
import { UserCalendarEvent, UserAppliance, ApplianceUsageLog, DailyApplianceUsage, ApplianceList } from "../../types";
import { useList, useUpdate, useCreate, useDelete } from "@refinedev/core";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import { LiveSessionModal } from "./LiveSessionModal";
import { ScheduleQueueModal } from "./ScheduleQueueModal";
import { SessionLogsModal } from "./SessionLogsModal";
import { RoutineAutofillModal } from "./RoutineAutofillModal";
import { useToast } from "../common/ToastProvider";
import {
  formatDateToKey,
  computeDayMetrics,
  accumulateLiveSessionDailyUsage,
  deductSessionDailyUsage,
  reconcileUpdatedSessionLog,
  DEFAULT_EFFECTIVE_RATE,
} from "../../lib/dailyUsageService";

export const SmartCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");

  // Modals state
  const [selectedApplianceForLive, setSelectedApplianceForLive] = useState<UserAppliance | null>(null);
  const [selectedReceiptLog, setSelectedReceiptLog] = useState<ApplianceUsageLog | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isRoutineAutofillOpen, setIsRoutineAutofillOpen] = useState(false);

  const { showSuccess, showInfo } = useToast();

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
    pagination: { mode: "off" },
  }) as any;

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { mode: "off" },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createLog } = useCreate();
  const { mutate: createEvent } = useCreate();
  const { mutate: deleteEvent, mutateAsync: deleteEventAsync } = useDelete();
  const { mutate: deleteLog, mutateAsync: deleteLogAsync } = useDelete();

  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];
  const allAppliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const logs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];
  const dailyUsageList: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Filter appliances by selected space
  const appliances = useMemo(() => {
    if (selectedSpaceId === "all") return allAppliances;
    return allAppliances.filter((a) => a.list_id === selectedSpaceId);
  }, [allAppliances, selectedSpaceId]);

  // Group daily usage by dateKey
  const dailyUsageMap = useMemo(() => {
    const map: Record<string, DailyApplianceUsage[]> = {};
    dailyUsageList.forEach((item) => {
      if (!map[item.usage_date]) {
        map[item.usage_date] = [];
      }
      map[item.usage_date].push(item);
    });
    return map;
  }, [dailyUsageList]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Active running appliances
  const activeAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = activeAppliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  // Month aggregations: Audited Actuals vs Future Projections
  const monthSummary = useMemo(() => {
    let loggedDaysCount = 0;
    let actualKwh = 0;
    let actualCost = 0;
    let projectedKwh = 0;
    let projectedCost = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const dateKey = formatDateToKey(dayDate);
      const metrics = computeDayMetrics(
        dateKey,
        dayDate,
        dailyUsageMap[dateKey] || [],
        appliances,
        events,
        DEFAULT_EFFECTIVE_RATE
      );

      if (metrics.isLogged) {
        loggedDaysCount += 1;
        actualKwh += metrics.kwh;
        actualCost += metrics.cost;
      } else {
        projectedKwh += metrics.kwh;
        projectedCost += metrics.cost;
      }
    }

    const totalMonthKwh = actualKwh + projectedKwh;
    const totalMonthCost = actualCost + projectedCost;

    return {
      loggedDaysCount,
      unloggedDaysCount: daysInMonth - loggedDaysCount,
      actualKwh: Number(actualKwh.toFixed(1)),
      actualCost: Number(actualCost.toFixed(2)),
      projectedKwh: Number(projectedKwh.toFixed(1)),
      projectedCost: Number(projectedCost.toFixed(2)),
      totalMonthKwh: Number(totalMonthKwh.toFixed(1)),
      totalMonthCost: Number(totalMonthCost.toFixed(2)),
    };
  }, [daysInMonth, year, month, dailyUsageMap, appliances, events]);

  // Handle Stop Live Session
  const handleStopLiveSession = async (
    applianceId: string,
    customDurationMinutes?: number,
    customEndTime?: Date
  ) => {
    const app = appliances.find((a) => a.id === applianceId);
    if (!app) return;

    const startDate = app.last_turned_on_at ? new Date(app.last_turned_on_at) : new Date(Date.now() - 3600000);
    const durationMins =
      customDurationMinutes !== undefined
        ? customDurationMinutes
        : Math.max(1, Math.round((Date.now() - startDate.getTime()) / 60000));
    const endDate = customEndTime || new Date(startDate.getTime() + durationMins * 60000);

    const kwh = (app.watts * (app.quantity || 1) * (durationMins / 60)) / 1000;
    const cost = kwh * DEFAULT_EFFECTIVE_RATE;

    // 1. Record in appliance_usage_logs
    createLog(
      {
        resource: "appliance_usage_logs",
        values: {
          appliance_id: app.id,
          user_id: app.user_id,
          started_at: startDate.toISOString(),
          ended_at: endDate.toISOString(),
          duration_minutes: durationMins,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: customDurationMinutes !== undefined ? "stopwatch_adjusted" : "stopwatch_live",
        },
      },
      {
        onSuccess: () => {
          if (logsRes?.refetch) {
            logsRes.refetch();
          }
        },
      }
    );

    // 2. Accumulate across midnight boundaries in daily_appliance_usage
    await accumulateLiveSessionDailyUsage({
      appliance_id: app.id,
      durationMinutes: durationMins,
      watts: app.watts,
      quantity: app.quantity || 1,
      effectiveRate: DEFAULT_EFFECTIVE_RATE,
      user_id: app.user_id || null,
      startTime: startDate,
      endTime: endDate,
    });

    // 3. Stop stopwatch
    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: false,
        last_turned_on_at: null,
      },
    });

    if (dailyUsageRes?.refetch) {
      dailyUsageRes.refetch();
    }

    showSuccess(`Stopwatch stopped for ${app.name}. Log saved (₱${cost.toFixed(2)})!`, "⏹️ Stopwatch Stopped");
  };

  const handleOpenLiveModal = (app: UserAppliance) => {
    setSelectedApplianceForLive(app);
    setSelectedReceiptLog(null);
    setIsLiveModalOpen(true);
  };

  const handleViewReceiptFromLogs = (log: ApplianceUsageLog, app?: UserAppliance) => {
    setSelectedReceiptLog(log);
    setSelectedApplianceForLive(app || null);
    setIsLiveModalOpen(true);
    setIsLogsModalOpen(false);
  };

  const handleDeleteLog = async (id: string) => {
    const log = logs.find((l) => l.id === id);
    if (log) {
      const app = appliances.find((a) => a.id === log.appliance_id);
      if (app) {
        await deductSessionDailyUsage({
          appliance_id: app.id,
          durationMinutes: log.duration_minutes || 60,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: app.user_id || null,
          startTime: new Date(log.started_at),
          endTime: log.ended_at ? new Date(log.ended_at) : new Date(new Date(log.started_at).getTime() + (log.duration_minutes || 60) * 60000),
        });
      }
    }
    await deleteLogAsync({ resource: "appliance_usage_logs", id });
    if (logsRes?.refetch) logsRes.refetch();
    if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
    showInfo("Session log deleted and daily usage reconciled.");
  };

  const handleUpdateLog = async (id: string, newDurationMinutes: number) => {
    const log = logs.find((l) => l.id === id);
    if (!log) return;
    const app = appliances.find((a) => a.id === log.appliance_id);
    const watts = app?.watts || 1000;
    const qty = app?.quantity || 1;

    const start = new Date(log.started_at);
    const end = new Date(start.getTime() + newDurationMinutes * 60000);
    const kwh = (watts * qty * (newDurationMinutes / 60)) / 1000;
    const cost = kwh * DEFAULT_EFFECTIVE_RATE;
    const oldMinutes = log.duration_minutes || 60;

    updateAppliance(
      {
        resource: "appliance_usage_logs",
        id,
        values: {
          duration_minutes: newDurationMinutes,
          ended_at: end.toISOString(),
          kwh_consumed: kwh,
          estimated_cost: cost,
        },
      },
      {
        onSuccess: async () => {
          if (app) {
            await reconcileUpdatedSessionLog({
              appliance_id: app.id,
              oldDurationMinutes: oldMinutes,
              newDurationMinutes: newDurationMinutes,
              watts: app.watts,
              quantity: app.quantity || 1,
              effectiveRate: DEFAULT_EFFECTIVE_RATE,
              user_id: app.user_id || null,
              startTime: start,
            });
          }
          if (logsRes?.refetch) logsRes.refetch();
          if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
          showSuccess("Session log updated and daily usage reconciled!");
        },
      }
    );
  };

  const handleClearAllLogs = async () => {
    for (const l of logs) {
      const app = appliances.find((a) => a.id === l.appliance_id);
      if (app) {
        await deductSessionDailyUsage({
          appliance_id: app.id,
          durationMinutes: l.duration_minutes || 60,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: app.user_id || null,
          startTime: new Date(l.started_at),
          endTime: l.ended_at ? new Date(l.ended_at) : new Date(new Date(l.started_at).getTime() + (l.duration_minutes || 60) * 60000),
        });
      }
    }
    await Promise.all(logs.map((l) => deleteLogAsync({ resource: "appliance_usage_logs", id: l.id })));
    if (logsRes?.refetch) logsRes.refetch();
    if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
    showInfo("All session logs cleared and daily usage reconciled.");
  };

  const handleCreateEvent = async (eventData: Partial<UserCalendarEvent>) => {
    createEvent({
      resource: "user_calendar_events",
      values: eventData,
    });
    showSuccess("Schedule slot created!");
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteEventAsync({ resource: "user_calendar_events", id });
    if (eventsRes?.refetch) eventsRes.refetch();
    showInfo("Schedule slot removed.");
  };

  const handleBulkDeleteEvents = async (ids: string[]) => {
    await Promise.all(ids.map((id) => deleteEventAsync({ resource: "user_calendar_events", id })));
    if (eventsRes?.refetch) eventsRes.refetch();
    showInfo(`Removed ${ids.length} scheduled slots.`);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* 1. Header Banner & Quick Modals Triggers */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Smart Energy Calendar & Scheduler
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Log daily appliance hours, project month-end bill trends, track live stopwatch draws, and plan off-peak tasks.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReceiptIcon />}
            onClick={() => setIsLogsModalOpen(true)}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Session Logs ({logs.length})
          </Button>

          {appliances.length > 0 && (
            <Button
              data-tour="calendar-queue"
              variant="outlined"
              size="small"
              startIcon={<QueueIcon />}
              onClick={() => {
                setSelectedApplianceForQueue(appliances[0]);
                setIsQueueModalOpen(true);
              }}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Schedule Queue
            </Button>
          )}
        </Box>
      </Box>

      {/* 1.5. Space Switcher Tabs */}
      {spaces.length > 1 && (
        <Card sx={{ borderRadius: 3, overflow: "hidden" }}>
          <Tabs
            value={selectedSpaceId}
            onChange={(_, v) => setSelectedSpaceId(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 44,
              bgcolor: "rgba(15, 14, 58, 0.4)",
              "& .MuiTab-root": {
                fontWeight: 700,
                fontSize: "0.8125rem",
                minHeight: 44,
                textTransform: "none",
                letterSpacing: "0.01em",
              },
              "& .Mui-selected": {
                color: "primary.main",
              },
            }}
          >
            <Tab
              value="all"
              icon={<PublicIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`All Spaces (${allAppliances.length})`}
            />
            {spaces.map((space) => {
              const count = allAppliances.filter((a) => a.list_id === space.id).length;
              return (
                <Tab
                  key={space.id}
                  value={space.id}
                  icon={
                    space.tariff_type === "commercial"
                      ? <StoreIcon sx={{ fontSize: 18 }} />
                      : <HomeIcon sx={{ fontSize: 18 }} />
                  }
                  iconPosition="start"
                  label={`${space.name} (${count})`}
                />
              );
            })}
          </Tabs>
        </Card>
      )}

      {/* 2. MONTH SUMMARY & PROJECTED CONSUMPTION DIAGNOSTIC BANNER */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: "#34d399" }} /> Audited Actuals
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#34d399", mt: 0.5, fontFamily: "monospace" }}>
              ₱{monthSummary.actualCost.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {monthSummary.loggedDaysCount} Days Logged ({monthSummary.actualKwh} kWh)
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <ClockIcon sx={{ fontSize: 16, color: "#818cf8" }} /> Remaining Projected
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#818cf8", mt: 0.5, fontFamily: "monospace" }}>
              ~₱{monthSummary.projectedCost.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {monthSummary.unloggedDaysCount} Days Forecast ({monthSummary.projectedKwh} kWh)
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <InsightsIcon sx={{ fontSize: 16, color: "#ffd54f" }} /> Projected Month Bill
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#ffd54f", mt: 0.5, fontFamily: "monospace" }}>
              ₱{monthSummary.totalMonthCost.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              Est. Total: {monthSummary.totalMonthKwh} kWh
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              ⏱️ Live Power Load
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: activeWattage > 2000 ? "#f87171" : "#34d399", mt: 0.5, fontFamily: "monospace" }}>
              {activeWattage} W ({activeAppliances.length} ⏱️ Running)
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {appliances.length} Registered Circuits
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Active Stopwatch Sessions Quick Bar (if any running) */}
      {activeAppliances.length > 0 && (
        <Card data-tour="calendar-live-sessions" sx={{ p: 2.5, borderRadius: 3.5, bgcolor: "rgba(6, 78, 59, 0.2)", border: "1px solid rgba(52, 211, 153, 0.4)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399" }} />
              ⏱️ Active Stopwatch Sessions ({activeAppliances.length})
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Click to view live stopwatch & meter
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
            {activeAppliances.map((app) => (
              <Chip
                key={app.id}
                icon={<PowerIcon sx={{ color: "#34d399 !important" }} />}
                label={`${app.name} (${app.watts}W)`}
                color="success"
                onClick={() => handleOpenLiveModal(app)}
                sx={{ fontWeight: 700, cursor: "pointer", height: 32 }}
              />
            ))}
          </Box>
        </Card>
      )}

      {/* 4. Calendar Controls & Month Navigator Card */}
      <Card sx={{ p: 2.5, borderRadius: 3.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton onClick={handlePrevMonth} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronLeftIcon />
            </IconButton>

            <Typography variant="h5" sx={{ fontWeight: 800, minWidth: 200, textAlign: "center", letterSpacing: "-0.01em" }}>
              {monthNames[month]} {year}
            </Typography>

            <IconButton onClick={handleNextMonth} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Actions & Visual Legend */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Button
              data-tour="calendar-routine-autofill"
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
              onClick={() => setIsRoutineAutofillOpen(true)}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
            >
              Autofill Routine Defaults
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Actual Logged
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#818cf8" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Projected Estimate
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#fbbf24" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Heavy / Peak Load
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* 5. Monthly Grid View */}
      <Card data-tour="calendar-grid" sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3.5 }}>
        {/* Day of week headers */}
        <Grid container columns={7} spacing={1} sx={{ mb: 1, textAlign: "center" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
            <Grid size={1} key={day}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: idx === 0 || idx === 6 ? "primary.light" : "text.secondary",
                  textTransform: "uppercase",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.05em",
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Days grid */}
        <Grid container columns={7} spacing={1}>
          {/* Empty cells before 1st day */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <Grid size={1} key={`empty-${idx}`}>
              <Box sx={{ minHeight: 90, opacity: 0.2 }} />
            </Grid>
          ))}

          {/* Actual day cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const realToday = new Date();
            const isCurrentToday = dayNum === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear();
            const dayDate = new Date(year, month, dayNum);
            const dateKey = formatDateToKey(dayDate);
            const metrics = computeDayMetrics(
              dateKey,
              dayDate,
              dailyUsageMap[dateKey] || [],
              appliances,
              events,
              DEFAULT_EFFECTIVE_RATE
            );

            return (
              <Grid size={1} key={`day-${dayNum}`}>
                <Paper
                  data-tour={isCurrentToday ? "calendar-day-click" : undefined}
                  variant="outlined"
                  onClick={() => setSelectedDateForModal(dayDate)}
                  sx={{
                    minHeight: { xs: 85, sm: 100 },
                    p: 1.25,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                    bgcolor: isCurrentToday
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.08)")
                      : metrics.isLogged
                      ? "rgba(16, 185, 129, 0.05)"
                      : "transparent",
                    border: isCurrentToday ? "2px solid" : "1px solid",
                    borderColor: isCurrentToday
                      ? "primary.main"
                      : metrics.isLogged
                      ? "rgba(52, 211, 153, 0.4)"
                      : "divider",
                    boxShadow: isCurrentToday
                      ? "0 0 16px rgba(99, 102, 241, 0.35), 0 0 4px rgba(99, 102, 241, 0.2)"
                      : "none",
                    "&:hover": {
                      borderColor: "primary.light",
                      transform: "translateY(-2px)",
                      boxShadow: isCurrentToday
                        ? "0 0 20px rgba(99, 102, 241, 0.45), 0 4px 12px rgba(99, 102, 241, 0.2)"
                        : "0 4px 12px rgba(99, 102, 241, 0.2)",
                    },
                  }}
                >
                  {/* TODAY badge */}
                  {isCurrentToday && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: "primary.main",
                          color: "#fff",
                          fontSize: "0.5625rem",
                          fontWeight: 900,
                          px: 1,
                          py: 0.15,
                          borderRadius: "0 0 6px 6px",
                          letterSpacing: "0.08em",
                          lineHeight: 1.4,
                        }}
                      >
                        TODAY
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: isCurrentToday ? 1 : 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrentToday ? 900 : 700,
                          color: isCurrentToday ? "primary.main" : "text.primary",
                        }}
                      >
                        {dayNum}
                      </Typography>
                      {metrics.isLogged && (
                        <Tooltip title="Actual Logged Data">
                          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#34d399" }} />
                        </Tooltip>
                      )}
                    </Box>

                    {metrics.isPeak ? (
                      <Tooltip title="Heavy Load Day">
                        <FlameIcon sx={{ fontSize: 15, color: "warning.main" }} />
                      </Tooltip>
                    ) : (
                      <ClockIcon sx={{ fontSize: 13, color: metrics.isLogged ? "success.main" : "text.secondary" }} />
                    )}
                  </Box>

                  <Box sx={{ textAlign: "right", mt: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: metrics.isLogged ? "#ffd54f" : "#a5b4fc",
                        display: "block",
                        fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                      }}
                    >
                      {metrics.isLogged ? `₱${metrics.cost.toFixed(2)}` : `~₱${metrics.cost.toFixed(2)}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                      {metrics.kwh} kWh
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* Date Analytics Modal */}
      {selectedDateForModal && (
        <DateAnalyticsModal
          isOpen={Boolean(selectedDateForModal)}
          onClose={() => setSelectedDateForModal(null)}
          selectedDate={selectedDateForModal}
          appliances={appliances}
          events={events}
          initialUsageRecords={dailyUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          logs={logs}
          onUsageSaved={() => {
            if (dailyUsageRes?.refetch) {
              dailyUsageRes.refetch();
            }
          }}
        />
      )}

      {/* Live Stopwatch & Historical Receipt Modal */}
      {isLiveModalOpen && (
        <LiveSessionModal
          isOpen={isLiveModalOpen}
          onClose={() => {
            setIsLiveModalOpen(false);
            setSelectedApplianceForLive(null);
            setSelectedReceiptLog(null);
          }}
          appliance={selectedApplianceForLive}
          receiptLog={selectedReceiptLog}
          onStopSession={handleStopLiveSession}
        />
      )}

      {/* Schedule Queue Modal */}
      {isQueueModalOpen && selectedApplianceForQueue && (
        <ScheduleQueueModal
          isOpen={isQueueModalOpen}
          onClose={() => {
            setIsQueueModalOpen(false);
            setSelectedApplianceForQueue(null);
          }}
          appliance={selectedApplianceForQueue}
          events={events}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
          onBulkDeleteEvents={handleBulkDeleteEvents}
        />
      )}

      {/* Session Logs Modal */}
      {isLogsModalOpen && (
        <SessionLogsModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
          logs={logs}
          appliances={appliances}
          onViewReceipt={handleViewReceiptFromLogs}
          onDeleteLog={handleDeleteLog}
          onClearAllLogs={handleClearAllLogs}
          onUpdateLog={handleUpdateLog}
        />
      )}

      {/* Routine Defaults Autofill Modal across Date Ranges */}
      <RoutineAutofillModal
        isOpen={isRoutineAutofillOpen}
        onClose={() => setIsRoutineAutofillOpen(false)}
        currentSelectedDate={currentDate}
        appliances={appliances}
        spaces={spaces}
        onApplyToCurrentDay={() => {
          if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
        }}
        onBatchSaved={() => {
          if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
        }}
      />
    </Box>
  );
};

export default SmartCalendar;
