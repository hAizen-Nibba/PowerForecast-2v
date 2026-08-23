import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import ButtonGroup from "@mui/material/ButtonGroup";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  ViewWeek as ListViewIcon,
  GridView as GridViewIcon,
  Add as AddIcon,
  FormatListBulleted as QueueIcon,
  ReceiptLong as ReceiptIcon,
  Bolt as BoltIcon,
  PowerSettingsNew as PowerIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
} from "@mui/icons-material";
import { UserCalendarEvent, UserAppliance, ApplianceUsageLog } from "../../types";
import { useList, useUpdate, useCreate, useDelete } from "@refinedev/core";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import { LiveSessionModal } from "./LiveSessionModal";
import { ScheduleQueueModal } from "./ScheduleQueueModal";
import { SessionLogsModal } from "./SessionLogsModal";
import { useToast } from "../common/ToastProvider";

export const SmartCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 19));
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Modals state
  const [selectedApplianceForLive, setSelectedApplianceForLive] = useState<UserAppliance | null>(null);
  const [selectedReceiptLog, setSelectedReceiptLog] = useState<ApplianceUsageLog | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [selectedApplianceForQueue, setSelectedApplianceForQueue] = useState<UserAppliance | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const { showSuccess, showInfo, showError } = useToast();

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

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createLog } = useCreate();
  const { mutate: createEvent } = useCreate();
  const { mutate: deleteEvent } = useDelete();
  const { mutate: deleteLog } = useDelete();

  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const logs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];

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
      const prev = new Date(currentDate);
      prev.setDate(prev.getDate() - 7);
      setCurrentDate(prev);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "week") {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 19));
  };

  // Active running appliances
  const activeAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = activeAppliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  // Diagnostic calculations
  const totalDailyKwh = appliances.reduce((acc, app) => {
    return acc + (app.watts * app.hours_per_day * (app.quantity || 1)) / 1000;
  }, 0);
  const totalDailyCost = totalDailyKwh * 14.8261;

  // Handle Stop Live Session
  const handleStopLiveSession = async (applianceId: string) => {
    const app = appliances.find((a) => a.id === applianceId);
    if (!app) return;

    const startTime = app.last_turned_on_at ? new Date(app.last_turned_on_at).getTime() : Date.now() - 3600000;
    const durationMins = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    const kwh = ((app.watts * (app.quantity || 1) * (durationMins / 60)) / 1000);
    const cost = kwh * 14.8261;

    // 1. Record in appliance_usage_logs
    createLog({
      resource: "appliance_usage_logs",
      values: {
        appliance_id: app.id,
        user_id: app.user_id,
        started_at: app.last_turned_on_at || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_minutes: durationMins,
        kwh_consumed: kwh,
        estimated_cost: cost,
        source: "calendar_live_stop",
      },
    });

    // 2. Turn off appliance
    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: false,
        last_turned_on_at: null,
      },
    });

    showSuccess(`Powered OFF ${app.name}. Receipt recorded (₱${cost.toFixed(2)})!`, "Session Ended");
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
    deleteLog({ resource: "appliance_usage_logs", id });
    showInfo("Session log deleted.");
  };

  const handleClearAllLogs = async () => {
    logs.forEach((l) => deleteLog({ resource: "appliance_usage_logs", id: l.id }));
    showInfo("All session logs cleared.");
  };

  const handleCreateEvent = async (eventData: Partial<UserCalendarEvent>) => {
    createEvent({
      resource: "user_calendar_events",
      values: eventData,
    });
    showSuccess("Schedule slot created!");
  };

  const handleDeleteEvent = async (id: string) => {
    deleteEvent({ resource: "user_calendar_events", id });
    showInfo("Schedule slot removed.");
  };

  const handleBulkDeleteEvents = async (ids: string[]) => {
    ids.forEach((id) => deleteEvent({ resource: "user_calendar_events", id }));
    showInfo(`Removed ${ids.length} scheduled slots.`);
  };

  const getDayLoadEstimate = (dayNum: number) => {
    const isWeekend = (firstDayIndex + dayNum - 1) % 7 === 0 || (firstDayIndex + dayNum - 1) % 7 === 6;
    const factor = isWeekend ? 1.25 : 0.95;
    const estKwh = totalDailyKwh * factor;
    const estCost = estKwh * 14.8261;

    return {
      kwh: estKwh.toFixed(1),
      cost: estCost.toFixed(2),
      isPeakDay: estKwh > 18,
    };
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
              }}
            >
              <CalendarIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Smart Energy Calendar & Scheduler
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Plan energy-heavy tasks during off-peak windows, track live running stopwatches, and review audited energy receipts.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
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

          <Button
            variant="outlined"
            size="small"
            onClick={handleToday}
            startIcon={<TodayIcon />}
          >
            Today
          </Button>

          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={viewMode === "month" ? "contained" : "outlined"}
              onClick={() => setViewMode("month")}
              startIcon={<GridViewIcon />}
            >
              Month
            </Button>
            <Button
              variant={viewMode === "week" ? "contained" : "outlined"}
              onClick={() => setViewMode("week")}
              startIcon={<ListViewIcon />}
            >
              Week
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* 2. DAILY PROJECTED CONSUMPTION & PEAK CONCURRENCY DIAGNOSTIC BANNER */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <BoltIcon sx={{ fontSize: 16, color: "#ffd54f" }} /> Scheduled Energy
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#fbbf24", mt: 0.5 }}>
              {totalDailyKwh.toFixed(2)} kWh/day
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              ₱ Projected Day Cost
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#34d399", mt: 0.5 }}>
              ₱{totalDailyCost.toFixed(2)}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              🔌 Circuits Registered
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#818cf8", mt: 0.5 }}>
              {appliances.length} Devices
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(15, 14, 58, 0.6)", border: "1px solid rgba(108, 122, 224, 0.25)" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              🔥 Max Active Load
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: activeWattage > 2000 ? "#f87171" : "#818cf8", mt: 0.5 }}>
              {activeWattage} W ({activeAppliances.length} ON)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Live Active Appliances Quick Bar (if any running) */}
      {activeAppliances.length > 0 && (
        <Card sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(6, 78, 59, 0.2)", border: "1px solid rgba(52, 211, 153, 0.4)" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34d399", display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399", animation: "pulse 1.5s infinite" }} />
              Live Running Appliance Sessions ({activeAppliances.length})
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Click an appliance to open stopwatch receipt modal
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {activeAppliances.map((app) => (
              <Chip
                key={app.id}
                icon={<PowerIcon sx={{ color: "#34d399 !important" }} />}
                label={`${app.name} (${app.watts}W)`}
                color="success"
                onClick={() => handleOpenLiveModal(app)}
                sx={{ fontWeight: 700, cursor: "pointer", py: 2 }}
              />
            ))}
          </Box>
        </Card>
      )}

      {/* 4. Calendar Controls & Month Navigator Card */}
      <Card sx={{ p: 2.5, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton onClick={handlePrevMonth} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronLeftIcon />
            </IconButton>

            <Typography variant="h5" sx={{ fontWeight: 800, minWidth: 200, textAlign: "center" }}>
              {monthNames[month]} {year}
            </Typography>

            <IconButton onClick={handleNextMonth} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "success.main" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Standard Load Day
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "warning.main" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Heavy Load Day
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* 5. Monthly Grid View */}
      <Card sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 3.5 }}>
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
            const isCurrentToday = dayNum === 19 && month === 7 && year === 2026;
            const load = getDayLoadEstimate(dayNum);
            const dayDate = new Date(year, month, dayNum);

            return (
              <Grid size={1} key={`day-${dayNum}`}>
                <Paper
                  variant="outlined"
                  onClick={() => setSelectedDateForModal(dayDate)}
                  sx={{
                    minHeight: { xs: 80, sm: 95 },
                    p: 1.25,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all 0.15s ease-in-out",
                    bgcolor: isCurrentToday
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.18)" : "rgba(99, 102, 241, 0.08)")
                      : "transparent",
                    borderColor: isCurrentToday ? "primary.main" : "divider",
                    "&:hover": {
                      borderColor: "primary.light",
                      transform: "translateY(-2px)",
                      boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrentToday ? 900 : 700,
                        color: isCurrentToday ? "primary.main" : "text.primary",
                      }}
                    >
                      {dayNum}
                    </Typography>

                    {load.isPeakDay ? (
                      <FlameIcon sx={{ fontSize: 14, color: "warning.main" }} />
                    ) : (
                      <ClockIcon sx={{ fontSize: 14, color: "success.main" }} />
                    )}
                  </Box>

                  <Box sx={{ textAlign: "right", mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#ffd54f", display: "block" }}>
                      ₱{load.cost}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                      {load.kwh} kWh
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
        />
      )}

      {/* Live Session & Historical Receipt Modal */}
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
        />
      )}
    </Box>
  );
};

export default SmartCalendar;
