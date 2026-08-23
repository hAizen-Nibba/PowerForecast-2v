import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import {
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  Add as PlusIcon,
  Delete as TrashIcon,
  Bolt as BoltIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as SparklesIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  FormatListBulleted as ListIcon,
  Search as SearchIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Timer as TimerIcon,
  AccessTime as ClockIcon,
} from "@mui/icons-material";
import { UserAppliance, UserCalendarEvent, DailyApplianceUsage, ApplianceList, ApplianceUsageLog } from "../../types";
import { useCreate, useDelete } from "@refinedev/core";
import {
  formatDateToKey,
  batchSaveDailyUsage,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  hmsToDecimalHours,
  decimalHoursToHms,
  splitSessionAcrossDays,
  accumulateLiveSessionDailyUsage,
} from "../../lib/dailyUsageService";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";
import { RoutineAutofillModal } from "./RoutineAutofillModal";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events: UserCalendarEvent[];
  initialUsageRecords?: DailyApplianceUsage[];
  spaces?: ApplianceList[];
  selectedSpaceId?: string;
  logs?: ApplianceUsageLog[];
  onUsageSaved?: () => void;
}

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  events,
  initialUsageRecords = [],
  spaces = [],
  logs = [],
  onUsageSaved,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Usage state: Map of applianceId -> { hours: number, notes: string }
  const [usageState, setUsageState] = useState<Record<string, { hours: number; notes: string }>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingYesterday, setIsLoadingYesterday] = useState<boolean>(false);

  // Scheduled events creation state
  const [eventTitle, setEventTitle] = useState("");
  const [eventApplianceId, setEventApplianceId] = useState("");
  const [startHour, setStartHour] = useState(14);
  const [durationHours, setDurationHours] = useState(2);
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const { showSuccess, showInfo, showError } = useToast();
  const { mutate: createEvent, isLoading: isCreatingEvent } = useCreate();
  const { mutate: deleteEvent } = useDelete();
  const { mutate: createLog } = useCreate();
  const { mutate: deleteLog } = useDelete();

  // Past Time Range Logger State
  const [isPastSessionModalOpen, setIsPastSessionModalOpen] = useState(false);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [selectedApplianceForPastSession, setSelectedApplianceForPastSession] = useState<UserAppliance | null>(null);
  const [pastStartDateTime, setPastStartDateTime] = useState("");
  const [pastEndDateTime, setPastEndDateTime] = useState("");
  const [isSavingPastSession, setIsSavingPastSession] = useState(false);

  const dateKey = formatDateToKey(selectedDate);

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dayOfWeekMap: Record<number, "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  const dayStr = dayOfWeekMap[selectedDate.getDay()];
  const dayEvents = events.filter((e) => e.day === dayStr || e.is_recurring);

  const isSelectedToday = dateKey === formatDateToKey(new Date());
  const hasActiveStopwatch = appliances.some((a) => a.is_currently_on && a.last_turned_on_at);
  const [, setLiveTick] = useState(0);

  // Live real-time 1-second ticker when viewing Today with active stopwatches
  useEffect(() => {
    if (!isOpen || !isSelectedToday || !hasActiveStopwatch) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSelectedToday, hasActiveStopwatch]);

  // Precompute stopwatch session runtime per appliance for this specific date
  const applianceStopwatchMap = useMemo(() => {
    const map: Record<string, { totalHours: number; sessionCount: number; isLive: boolean }> = {};

    appliances.forEach((app) => {
      let totalHours = 0;
      let sessionCount = 0;

      // 1. Logs for this appliance
      (logs || []).forEach((log) => {
        if (log.appliance_id !== app.id) return;
        const start = new Date(log.started_at);
        const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
        const slices = splitSessionAcrossDays(start, end);
        const matchingSlice = slices.find((s) => s.dateKey === dateKey);
        if (matchingSlice) {
          totalHours += matchingSlice.hours;
          sessionCount += 1;
        }
      });

      // 2. If viewing today and live stopwatch running
      const isLive = Boolean(isSelectedToday && app.is_currently_on && app.last_turned_on_at);
      if (isLive && app.last_turned_on_at) {
        const start = new Date(app.last_turned_on_at);
        const now = new Date();
        const slices = splitSessionAcrossDays(start, now);
        const matchingSlice = slices.find((s) => s.dateKey === dateKey);
        if (matchingSlice) {
          totalHours += matchingSlice.hours;
          sessionCount += 1;
        }
      }

      map[app.id] = {
        totalHours: Number(totalHours.toFixed(3)),
        sessionCount,
        isLive,
      };
    });

    return map;
  }, [appliances, logs, dateKey, isSelectedToday]);

  // Initialize usage state when modal opens or dateKey changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // 1. Initial fast map from initialUsageRecords
    const initialMap: Record<string, { hours: number; notes: string }> = {};

    initialUsageRecords.forEach((rec) => {
      if (rec.usage_date === dateKey) {
        initialMap[rec.appliance_id] = {
          hours: Number(rec.hours_used) || 0,
          notes: rec.notes || "",
        };
      }
    });

    // For any appliances without a record for this day: default to stopwatch total if any, otherwise 0
    appliances.forEach((app) => {
      if (initialMap[app.id] === undefined) {
        const swHours = applianceStopwatchMap[app.id]?.totalHours || 0;
        initialMap[app.id] = {
          hours: swHours,
          notes: "",
        };
      }
    });

    setUsageState(initialMap);
    setIsDirty(false);

    // 2. Also fetch directly from Supabase for this exact dateKey to ensure 100% complete records
    supabaseClient
      .from("daily_appliance_usage")
      .select("*")
      .eq("usage_date", dateKey)
      .then(({ data, error }) => {
        if (!isMounted || error || !data || data.length === 0) return;
        setUsageState((prev) => {
          const updated = { ...prev };
          data.forEach((rec: DailyApplianceUsage) => {
            updated[rec.appliance_id] = {
              hours: Number(rec.hours_used) || 0,
              notes: rec.notes || "",
            };
          });
          return updated;
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, dateKey, appliances]);

  // Check if date has logged data
  const hasLoggedData = initialUsageRecords.some(
    (rec) => rec.usage_date === dateKey && Number(rec.hours_used) > 0
  );

  // Filter appliances by Space / Search
  const filteredAppliances = useMemo(() => {
    return appliances.filter((app) => {
      if (selectedSpaceFilter !== "all" && app.tariff_type !== selectedSpaceFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.name?.toLowerCase().includes(q);
        const matchCat = app.category?.toLowerCase().includes(q);
        const matchBrand = app.brand?.toLowerCase().includes(q);
        const matchRoom = app.room_location?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchBrand && !matchRoom) return false;
      }
      return true;
    });
  }, [appliances, selectedSpaceFilter, searchQuery]);

  // Calculate live Day Totals based on current slider positions, logs, and live stopwatches
  const dayTotals = useMemo(() => {
    let totalKwh = 0;
    let activeDevices = 0;

    appliances.forEach((app) => {
      const state = usageState[app.id];
      const manualHours = state ? state.hours : 0;
      const swHours = applianceStopwatchMap[app.id]?.totalHours || 0;
      const effectiveHours = Math.max(manualHours, swHours);

      if (effectiveHours > 0) {
        activeDevices += 1;
        totalKwh += calculateKwh(app.watts, effectiveHours, app.quantity || 1);
      }
    });

    const totalCost = calculateCost(totalKwh, DEFAULT_EFFECTIVE_RATE);

    return {
      kwh: Number(totalKwh.toFixed(3)),
      cost: totalCost,
      activeDevices,
    };
  }, [appliances, usageState, applianceStopwatchMap]);

  // Update hours for a single appliance
  const handleHoursChange = (appId: string, hours: number) => {
    setUsageState((prev) => ({
      ...prev,
      [appId]: {
        hours: Math.max(0, Math.min(24, Number(hours.toFixed(2)))),
        notes: prev[appId]?.notes || "",
      },
    }));
    setIsDirty(true);
  };

  // Action: Populate with Routine Baseline Defaults (hours_per_day from inventory)
  const handleApplyDefaults = () => {
    setIsRoutineModalOpen(true);
  };

  const handleApplyRoutineToCurrentDay = () => {
    setUsageState((prev) => {
      const next = { ...prev };
      appliances.forEach((app) => {
        next[app.id] = {
          hours: Number(app.hours_per_day) || 0,
          notes: prev[app.id]?.notes || "",
        };
      });
      return next;
    });
    setIsDirty(true);
    showInfo("Loaded routine baseline hours for this day.");
  };

  // Action: Copy from yesterday's usage
  const handleCopyFromYesterday = async () => {
    setIsLoadingYesterday(true);
    try {
      const prevDate = new Date(selectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateKey = formatDateToKey(prevDate);

      const { data, error } = await supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("usage_date", prevDateKey);

      if (error) throw error;

      if (!data || data.length === 0) {
        showInfo(`No logged usage records found for yesterday (${prevDateKey}).`);
        return;
      }

      setUsageState((prev) => {
        const next = { ...prev };
        data.forEach((rec: DailyApplianceUsage) => {
          if (next[rec.appliance_id]) {
            next[rec.appliance_id] = {
              hours: Number(rec.hours_used) || 0,
              notes: rec.notes || "",
            };
          }
        });
        return next;
      });

      setIsDirty(true);
      showSuccess(`Copied usage hours from yesterday (${prevDateKey})!`);
    } catch (err: any) {
      showError(`Could not copy yesterday's usage: ${err?.message}`);
    } finally {
      setIsLoadingYesterday(false);
    }
  };

  // Action: Clear all to 0h
  const handleClearAll = () => {
    setUsageState((prev) => {
      const next: Record<string, { hours: number; notes: string }> = {};
      appliances.forEach((app) => {
        next[app.id] = { hours: 0, notes: "" };
      });
      return next;
    });
    setIsDirty(true);
    showInfo("Reset all appliance inputs to 0 hours for this day.");
  };

  // Action: Open Past Time Range Modal
  const handleOpenPastSessionModal = (app: UserAppliance) => {
    setSelectedApplianceForPastSession(app);
    const startIso = `${dateKey}T09:00`;
    const endIso = `${dateKey}T12:00`;
    setPastStartDateTime(startIso);
    setPastEndDateTime(endIso);
    setIsPastSessionModalOpen(true);
  };

  // Compute multi-day slices for the past session being edited
  const pastSessionSlices = useMemo(() => {
    if (!pastStartDateTime || !pastEndDateTime) return [];
    const start = new Date(pastStartDateTime);
    const end = new Date(pastEndDateTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return [];
    return splitSessionAcrossDays(start, end);
  }, [pastStartDateTime, pastEndDateTime]);

  // Action: Save Past Session
  const handleSavePastSession = async () => {
    if (!selectedApplianceForPastSession || pastSessionSlices.length === 0) return;
    const app = selectedApplianceForPastSession;
    const start = new Date(pastStartDateTime);
    const end = new Date(pastEndDateTime);
    const totalMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const totalKwh = (app.watts * (app.quantity || 1) * (totalMinutes / 60)) / 1000;
    const totalCost = totalKwh * DEFAULT_EFFECTIVE_RATE;

    setIsSavingPastSession(true);
    try {
      // 1. Create log record
      await new Promise<void>((resolve, reject) => {
        createLog(
          {
            resource: "appliance_usage_logs",
            values: {
              appliance_id: app.id,
              user_id: app.user_id,
              started_at: start.toISOString(),
              ended_at: end.toISOString(),
              duration_minutes: totalMinutes,
              kwh_consumed: totalKwh,
              estimated_cost: totalCost,
              source: "past_time_range",
            },
          },
          {
            onSuccess: () => resolve(),
            onError: (err: any) => reject(err),
          }
        );
      });

      // 2. Distribute into daily_appliance_usage across all spanned dates
      await accumulateLiveSessionDailyUsage({
        appliance_id: app.id,
        durationMinutes: totalMinutes,
        watts: app.watts,
        quantity: app.quantity || 1,
        effectiveRate: DEFAULT_EFFECTIVE_RATE,
        user_id: app.user_id || null,
        startTime: start,
        endTime: end,
      });

      showSuccess(
        `Logged past session for ${app.name} (${(totalMinutes / 60).toFixed(1)} hrs across ${pastSessionSlices.length} day(s))!`,
        "Past Session Logged"
      );
      setIsPastSessionModalOpen(false);
      setSelectedApplianceForPastSession(null);
      if (onUsageSaved) {
        onUsageSaved();
      }
    } catch (err: any) {
      showError(`Failed to save past session: ${err?.message}`);
    } finally {
      setIsSavingPastSession(false);
    }
  };

  const handleDeleteSessionLog = async (logId: string) => {
    deleteLog(
      {
        resource: "appliance_usage_logs",
        id: logId,
      },
      {
        onSuccess: () => {
          showInfo("Session log removed.");
          if (onUsageSaved) onUsageSaved();
        },
      }
    );
  };

  // Save all usage rows to Supabase
  const handleSaveUsage = async () => {
    setIsSaving(true);
    try {
      const entriesToSave = appliances.map((app) => {
        const state = usageState[app.id];
        return {
          appliance_id: app.id,
          hours_used: state ? state.hours : 0,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          source: "manual" as const,
          notes: state?.notes || "",
          user_id: app.user_id || null,
        };
      });

      const success = await batchSaveDailyUsage(dateKey, entriesToSave);

      if (success) {
        setIsDirty(false);
        showSuccess(`Saved daily usage for ${formattedDate} (₱${dayTotals.cost.toFixed(2)})!`, "Usage Logged");
        if (onUsageSaved) {
          onUsageSaved();
        }
      } else {
        showError("Failed to save daily usage. Please try again.");
      }
    } catch (err: any) {
      showError(`Error saving daily log: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate 24-hour load curve based on logged hours or routine defaults
  const hourlyData = Array.from({ length: 24 }).map((_, hour) => {
    let totalWatts = 0;

    appliances.forEach((app) => {
      const state = usageState[app.id];
      const hours = state && state.hours > 0 ? state.hours : (hasLoggedData ? 0 : app.hours_per_day);
      const appStart = app.start_hour !== undefined ? app.start_hour : 8;
      const appEnd = (appStart + hours) % 24;

      const isActive =
        appStart <= appEnd
          ? hour >= appStart && hour < appEnd
          : hour >= appStart || hour < appEnd;

      if (isActive && hours > 0) {
        totalWatts += app.watts * (app.quantity || 1);
      }
    });

    // Scheduled event load
    dayEvents.forEach((ev) => {
      const evEnd = ev.hour + ev.duration_hours;
      if (hour >= ev.hour && hour < evEnd) {
        const associatedApp = appliances.find((a) => a.id === ev.appliance_id);
        totalWatts += associatedApp ? associatedApp.watts * (associatedApp.quantity || 1) : 500;
      }
    });

    const hourlyCost = (totalWatts / 1000) * DEFAULT_EFFECTIVE_RATE;
    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;

    return {
      hour: `${h12} ${period}`,
      watts: totalWatts,
      cost: hourlyCost,
    };
  });

  const peakWatts = Math.max(...hourlyData.map((d) => d.watts), 0);

  interface TimelineSessionBlock {
    id: string;
    type: "logged_session" | "live_stopwatch" | "manual_routine";
    startHour: number;
    endHour: number;
    durationHours: number;
    kwh: number;
    cost: number;
    startTimeStr: string;
    endTimeStr: string;
  }

  // Compute 24-Hour Visual Activity & Stopwatch Timeline Data
  const timelineData = useMemo(() => {
    return filteredAppliances.map((app) => {
      const sessionBlocks: TimelineSessionBlock[] = [];

      // 1. Logs for this appliance that have a slice on this date
      (logs || []).forEach((log) => {
        if (log.appliance_id !== app.id) return;
        const start = new Date(log.started_at);
        const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
        const slices = splitSessionAcrossDays(start, end);
        const matchingSlice = slices.find((s) => s.dateKey === dateKey);

        if (matchingSlice) {
          const sliceKwh = calculateKwh(app.watts, matchingSlice.hours, app.quantity || 1);
          const sliceCost = calculateCost(sliceKwh, DEFAULT_EFFECTIVE_RATE);

          sessionBlocks.push({
            id: `${log.id}-${matchingSlice.dateKey}`,
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

      // 2. If viewing today and appliance is currently running stopwatch
      if (isSelectedToday && app.is_currently_on && app.last_turned_on_at) {
        const start = new Date(app.last_turned_on_at);
        const now = new Date();
        const slices = splitSessionAcrossDays(start, now);
        const matchingSlice = slices.find((s) => s.dateKey === dateKey);

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
            endTimeStr: "LIVE RUNNING",
          });
        }
      }

      // 3. Additive Hybrid: If user logged extra manual hours in addition to session logs
      const manualHours = usageState[app.id]?.hours || 0;
      const stopwatchHoursSum = sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0);

      if (manualHours > stopwatchHoursSum + 0.05) {
        const extraManualHours = manualHours - stopwatchHoursSum;
        const startH = app.start_hour !== undefined ? app.start_hour : 8;
        const endH = Math.min(24, startH + extraManualHours);
        const kwh = calculateKwh(app.watts, extraManualHours, app.quantity || 1);
        const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

        sessionBlocks.push({
          id: `manual-extra-${app.id}`,
          type: "manual_routine" as const,
          startHour: startH,
          endHour: endH,
          durationHours: extraManualHours,
          kwh,
          cost,
          startTimeStr: `${String(startH).padStart(2, "0")}:00 (Manual)`,
          endTimeStr: `${String(Math.floor(endH)).padStart(2, "0")}:${String(Math.round((endH % 1) * 60)).padStart(2, "0")}`,
        });
      } else if (sessionBlocks.length === 0 && manualHours > 0) {
        const startH = app.start_hour !== undefined ? app.start_hour : 8;
        const endH = Math.min(24, startH + manualHours);
        const kwh = calculateKwh(app.watts, manualHours, app.quantity || 1);
        const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

        sessionBlocks.push({
          id: `manual-${app.id}`,
          type: "manual_routine" as const,
          startHour: startH,
          endHour: endH,
          durationHours: manualHours,
          kwh,
          cost,
          startTimeStr: `${String(startH).padStart(2, "0")}:00 (Manual)`,
          endTimeStr: `${String(Math.floor(endH)).padStart(2, "0")}:${String(Math.round((endH % 1) * 60)).padStart(2, "0")}`,
        });
      }

      const totalAppHours = sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0);

      return {
        appliance: app,
        sessions: sessionBlocks,
        totalHours: totalAppHours,
      };
    });
  }, [filteredAppliances, logs, dateKey, isSelectedToday, usageState]);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;

    createEvent(
      {
        resource: "user_calendar_events",
        values: {
          title: eventTitle,
          category: "appliance",
          day: dayStr,
          hour: startHour,
          duration_hours: durationHours,
          appliance_id: eventApplianceId || null,
          is_recurring: false,
        },
      },
      {
        onSuccess: () => {
          setEventTitle("");
          setIsAddingEvent(false);
          showSuccess("Schedule task added!");
        },
      }
    );
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              border: "1px solid",
              borderColor: "rgba(129, 140, 248, 0.25)",
              backdropFilter: "blur(24px)",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
            },
          },
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: { xs: 2.5, sm: 3 }, py: 2, flexShrink: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarIcon sx={{ color: "#ffd54f", fontSize: 24 }} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {formattedDate}
                </Typography>
                {hasLoggedData ? (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#34d399 !important" }} />}
                    label="Actual Logged"
                    size="small"
                    color="success"
                    sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 22 }}
                  />
                ) : (
                  <Chip
                    label="Projected Estimate"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.6875rem", height: 22 }}
                  />
                )}
                {isDirty && (
                  <Chip
                    label="Unsaved Changes"
                    size="small"
                    color="warning"
                    sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 22 }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Track daily appliance hours, inspect 24h peak concurrency, and manage scheduled energy tasks.
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        {/* Tabs */}
        <Box sx={{ px: { xs: 2, sm: 3 }, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 46,
              "& .MuiTab-root": {
                minHeight: 46,
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.8125rem",
              },
            }}
          >
            <Tab
              icon={<BoltIcon fontSize="small" />}
              iconPosition="start"
              label={`Daily Usage Log (${dayTotals.activeDevices}/${appliances.length})`}
            />
            <Tab
              icon={<TimelineIcon fontSize="small" />}
              iconPosition="start"
              label="24-Hour Activity Timeline"
            />
            <Tab
              icon={<ListIcon fontSize="small" />}
              iconPosition="start"
              label={`Scheduled Tasks (${dayEvents.length})`}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: { xs: 2, sm: 2.75 }, display: "flex", flexDirection: "column", gap: 2.5, overflowY: "auto" }}>
          {/* KPI Banner always visible */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.5, flexShrink: 0 }}>
            {/* Day Bill Cost */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 3,
                textAlign: "center",
                bgcolor: isSelectedToday && hasActiveStopwatch ? "rgba(6, 78, 59, 0.3)" : "rgba(15, 14, 58, 0.5)",
                borderColor: isSelectedToday && hasActiveStopwatch ? "rgba(52, 211, 153, 0.4)" : "rgba(108, 122, 224, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.04em", fontSize: "0.6875rem" }}>
                  DAY BILL COST
                </Typography>
                {isSelectedToday && hasActiveStopwatch && (
                  <Chip
                    label="LIVE"
                    size="small"
                    color="success"
                    sx={{ height: 16, fontSize: "0.5625rem", fontWeight: 900 }}
                  />
                )}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f", my: 0.25, letterSpacing: "-0.01em" }}>
                ₱{dayTotals.cost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                @ ₱{DEFAULT_EFFECTIVE_RATE.toFixed(2)}/kWh
              </Typography>
            </Paper>

            {/* Day Consumption */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 3,
                textAlign: "center",
                bgcolor: isSelectedToday && hasActiveStopwatch ? "rgba(6, 78, 59, 0.3)" : "rgba(15, 14, 58, 0.5)",
                borderColor: isSelectedToday && hasActiveStopwatch ? "rgba(52, 211, 153, 0.4)" : "rgba(108, 122, 224, 0.2)",
                transition: "all 0.2s ease",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.04em", fontSize: "0.6875rem" }}>
                  DAY CONSUMPTION
                </Typography>
                {isSelectedToday && hasActiveStopwatch && (
                  <Chip
                    label="LIVE"
                    size="small"
                    color="success"
                    sx={{ height: 16, fontSize: "0.5625rem", fontWeight: 900 }}
                  />
                )}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.light", my: 0.25, letterSpacing: "-0.01em" }}>
                {dayTotals.kwh < 0.01 ? dayTotals.kwh.toFixed(4) : dayTotals.kwh.toFixed(3)} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                {dayTotals.activeDevices} Devices Active
              </Typography>
            </Paper>

            {/* Max Hourly Load */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 3,
                textAlign: "center",
                bgcolor: "rgba(15, 14, 58, 0.5)",
                borderColor: "rgba(108, 122, 224, 0.2)",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: "0.04em", fontSize: "0.6875rem", display: "block" }}>
                MAX HOURLY LOAD
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: peakWatts > 2000 ? "error.main" : "warning.main", my: 0.25, letterSpacing: "-0.01em" }}>
                {peakWatts} W
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Concurrent Peak Draw
              </Typography>
            </Paper>
          </Box>

          {/* TAB 0: DAILY USAGE LOG (INVENTORY SLIDERS) */}
          {activeTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Quick Action Toolbar */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SparklesIcon />}
                    onClick={handleApplyDefaults}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    Use Routine Defaults
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={isLoadingYesterday ? <CircularProgress size={14} /> : <CopyIcon />}
                    onClick={handleCopyFromYesterday}
                    disabled={isLoadingYesterday}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    Copy Yesterday
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<ResetIcon />}
                    onClick={handleClearAll}
                    sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    Clear (0h)
                  </Button>
                </Box>

                {/* Space / Tariff Filter */}
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Chip
                    label="All Spaces"
                    size="small"
                    clickable
                    onClick={() => setSelectedSpaceFilter("all")}
                    color={selectedSpaceFilter === "all" ? "primary" : "default"}
                    variant={selectedSpaceFilter === "all" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    icon={<HomeIcon sx={{ fontSize: "14px !important" }} />}
                    label="Residential"
                    size="small"
                    clickable
                    onClick={() => setSelectedSpaceFilter("residential")}
                    color={selectedSpaceFilter === "residential" ? "primary" : "default"}
                    variant={selectedSpaceFilter === "residential" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    icon={<StoreIcon sx={{ fontSize: "14px !important" }} />}
                    label="Commercial"
                    size="small"
                    clickable
                    onClick={() => setSelectedSpaceFilter("commercial")}
                    color={selectedSpaceFilter === "commercial" ? "secondary" : "default"}
                    variant={selectedSpaceFilter === "commercial" ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>
              </Box>

              {/* Search Input */}
              <TextField
                size="small"
                fullWidth
                placeholder="Search appliances by name, room, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Appliance Cards List */}
              {filteredAppliances.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No appliances match your selected filters. Register appliances in your Inventory first!
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {filteredAppliances.map((app) => {
                    const state = usageState[app.id] || { hours: 0, notes: "" };
                    const hours = state.hours;
                    const qty = app.quantity || 1;
                    const kwh = calculateKwh(app.watts, hours, qty);
                    const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

                    // Compute specific logs recorded for this appliance today
                    const appLogsToday: { log: ApplianceUsageLog; slice: any }[] = [];
                    (logs || []).forEach((log) => {
                      if (log.appliance_id !== app.id) return;
                      const start = new Date(log.started_at);
                      const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
                      const slices = splitSessionAcrossDays(start, end);
                      const match = slices.find((s) => s.dateKey === dateKey);
                      if (match) {
                        appLogsToday.push({ log, slice: match });
                      }
                    });

                    const isLive = Boolean(applianceStopwatchMap[app.id]?.isLive);
                    const hasSessionLogs = appLogsToday.length > 0 || isLive;

                    return (
                      <Paper
                        key={app.id}
                        variant="outlined"
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 3,
                          borderColor: hours > 0 ? "primary.main" : "rgba(108, 122, 224, 0.25)",
                          bgcolor: hours > 0 ? "rgba(99, 102, 241, 0.07)" : "rgba(15, 14, 58, 0.45)",
                          transition: "all 0.2s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.5,
                          "&:hover": {
                            borderColor: "primary.light",
                          },
                        }}
                      >
                        {/* Row 1: Appliance Info & Estimated Cost */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                          <Box sx={{ flex: 1, minWidth: 240 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                                {app.name}
                              </Typography>
                              {app.quantity && app.quantity > 1 && (
                                <Chip label={`x${app.quantity}`} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700 }} />
                              )}
                              {app.room_location && (
                                <Chip label={app.room_location} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.6875rem" }} />
                              )}
                              <Chip label={`${app.watts}W`} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, bgcolor: "rgba(255, 255, 255, 0.08)" }} />
                              {applianceStopwatchMap[app.id]?.totalHours > 0 && (
                                <Chip
                                  icon={<TimerIcon sx={{ fontSize: "13px !important", color: "#34d399 !important" }} />}
                                  label={
                                    hours > applianceStopwatchMap[app.id].totalHours + 0.05
                                      ? `⏱️ ${applianceStopwatchMap[app.id].totalHours.toFixed(1)}h (Stopwatch) + ${(hours - applianceStopwatchMap[app.id].totalHours).toFixed(1)}h (Manual)`
                                      : `⏱️ ${applianceStopwatchMap[app.id].totalHours >= 1 ? applianceStopwatchMap[app.id].totalHours.toFixed(1) + 'h' : Math.round(applianceStopwatchMap[app.id].totalHours * 60) + 'm'} (Stopwatch)`
                                  }
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800 }}
                                />
                              )}
                              {isLive && (
                                <Chip
                                  label="🟢 Live Active"
                                  size="small"
                                  color="success"
                                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800 }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                              {app.category} {app.brand ? `• ${app.brand}` : ""} {app.model ? `(${app.model})` : ""}
                            </Typography>
                          </Box>

                          {/* Calculated Day Preview */}
                          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: hours > 0 ? "#ffd54f" : "text.secondary", letterSpacing: "-0.01em", lineHeight: 1.1 }}>
                              ₱{cost.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontFamily: "monospace" }}>
                              {kwh.toFixed(3)} kWh
                            </Typography>
                          </Box>
                        </Box>

                        {/* Row 2: Logged Sessions (if any exist) */}
                        {hasSessionLogs && (
                          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            <Typography variant="caption" sx={{ fontSize: "0.6875rem", fontWeight: 800, color: "primary.light", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                              <ClockIcon sx={{ fontSize: 13 }} /> Logged Sessions on this Date:
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                              {appLogsToday.map(({ log, slice }) => {
                                const startStr = slice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                const endStr = slice.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                const sliceKwh = calculateKwh(app.watts, slice.hours, app.quantity || 1);
                                const sliceCost = calculateCost(sliceKwh, DEFAULT_EFFECTIVE_RATE);

                                return (
                                  <Chip
                                    key={`${log.id}-${slice.dateKey}`}
                                    size="small"
                                    icon={<TimerIcon sx={{ fontSize: "13px !important", color: "#60a5fa !important" }} />}
                                    label={`${startStr} – ${endStr} (${slice.hours.toFixed(1)}h • ₱${sliceCost.toFixed(2)})`}
                                    onDelete={() => handleDeleteSessionLog(log.id)}
                                    deleteIcon={<TrashIcon sx={{ fontSize: "14px !important" }} />}
                                    sx={{
                                      height: 24,
                                      fontSize: "0.6875rem",
                                      fontWeight: 700,
                                      bgcolor: "rgba(99, 102, 241, 0.2)",
                                      borderColor: "rgba(99, 102, 241, 0.4)",
                                      border: "1px solid",
                                    }}
                                  />
                                );
                              })}
                              {isLive && (
                                <Chip
                                  size="small"
                                  label="🟢 Live Stopwatch Active"
                                  color="success"
                                  sx={{ height: 24, fontSize: "0.6875rem", fontWeight: 800 }}
                                />
                              )}
                            </Box>
                          </Box>
                        )}

                        <Divider sx={{ my: 0.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />

                        {/* Row 3: Daily Runtime Inputs & Quick Presets Bar */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                          {/* Left: HH:MM:SS text fields */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.75rem", mr: 0.5 }}>
                              Daily Runtime:
                            </Typography>
                            {(() => {
                              const hms = decimalHoursToHms(hours);
                              return (
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "rgba(0, 0, 0, 0.3)", p: 0.5, borderRadius: 2, border: "1px solid rgba(129, 140, 248, 0.2)" }}>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={hms.hours}
                                    onChange={(e) => {
                                      const h = Math.max(0, Math.min(24, parseInt(e.target.value) || 0));
                                      handleHoursChange(app.id, hmsToDecimalHours(h, hms.minutes, hms.seconds));
                                    }}
                                    slotProps={{ input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
                                    sx={{
                                      width: 65,
                                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.8125rem", fontWeight: 800, fontFamily: "monospace" },
                                      "& input": { textAlign: "center", py: 0 },
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>:</Typography>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={hms.minutes}
                                    onChange={(e) => {
                                      const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                      handleHoursChange(app.id, hmsToDecimalHours(hms.hours, m, hms.seconds));
                                    }}
                                    slotProps={{ input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
                                    sx={{
                                      width: 65,
                                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.8125rem", fontWeight: 800, fontFamily: "monospace" },
                                      "& input": { textAlign: "center", py: 0 },
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>:</Typography>
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={hms.seconds}
                                    onChange={(e) => {
                                      const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                                      handleHoursChange(app.id, hmsToDecimalHours(hms.hours, hms.minutes, s));
                                    }}
                                    slotProps={{ input: { endAdornment: <InputAdornment position="end">s</InputAdornment> } }}
                                    sx={{
                                      width: 65,
                                      "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.8125rem", fontWeight: 800, fontFamily: "monospace" },
                                      "& input": { textAlign: "center", py: 0 },
                                    }}
                                  />
                                </Box>
                              );
                            })()}
                          </Box>

                          {/* Right: Presets & Log Past Range */}
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PlusIcon sx={{ fontSize: "14px" }} />}
                              onClick={() => handleOpenPastSessionModal(app)}
                              sx={{ borderRadius: 1.5, fontWeight: 800, fontSize: "0.75rem", height: 30, px: 1.25, mr: 0.5 }}
                            >
                              Log Past Range
                            </Button>
                            {[
                              { label: "0h", value: 0 },
                              { label: "30m", value: 0.5 },
                              { label: "1h", value: 1 },
                              { label: "2h", value: 2 },
                              { label: "4h", value: 4 },
                              { label: "8h", value: 8 },
                              { label: "24h", value: 24 },
                            ].map((preset) => {
                              const isSelected = Math.abs(hours - preset.value) < 0.02;
                              return (
                                <Button
                                  key={preset.label}
                                  size="small"
                                  variant={isSelected ? "contained" : "outlined"}
                                  onClick={() => handleHoursChange(app.id, preset.value)}
                                  sx={{
                                    minWidth: 36,
                                    px: 0.75,
                                    py: 0.3,
                                    fontSize: "0.6875rem",
                                    fontWeight: 800,
                                    borderRadius: 1.5,
                                    height: 30,
                                  }}
                                >
                                  {preset.label}
                                </Button>
                              );
                            })}
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}

          {/* TAB 1: 24-HOUR DAY ACTIVITY & STOPWATCH TIMELINE */}
          {activeTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <Card sx={{ p: 2.5, borderRadius: 3 }}>
                {/* Header & Legend */}
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                      <TimelineIcon sx={{ color: "primary.main" }} />
                      24-Hour Activity & Stopwatch Timeline
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Exact session blocks throughout the day (00:00 – 24:00) with real-time stopwatch metering
                    </Typography>
                  </Box>

                  {/* Timeline Legend */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#34d399", animation: "pulse 1.5s infinite" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#34d399", fontSize: "0.6875rem" }}>
                        Live Running Stopwatch
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#6366f1" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#818cf8", fontSize: "0.6875rem" }}>
                        Logged Session
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "rgba(168, 85, 247, 0.6)" }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.6875rem" }}>
                        Daily Routine
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* 24-Hour Time Header Axis */}
                <Box sx={{ pl: { xs: 0, sm: "220px" }, mb: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", position: "relative", px: 0.5 }}>
                    {["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"].map((timeLabel, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        sx={{
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          color: "text.secondary",
                          fontFamily: "monospace",
                        }}
                      >
                        {timeLabel}
                      </Typography>
                    ))}
                  </Box>
                </Box>

                {/* Appliance Tracks List */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {timelineData.map(({ appliance, sessions, totalHours }) => {
                    return (
                      <Paper
                        key={appliance.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2.5,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "stretch", sm: "center" },
                          gap: 1.5,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.01)",
                        }}
                      >
                        {/* Left: Appliance Info */}
                        <Box sx={{ minWidth: { xs: "100%", sm: 205 }, maxWidth: { xs: "100%", sm: 205 } }}>
                          <Typography noWrap variant="body2" sx={{ fontWeight: 800 }}>
                            {appliance.name}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                            <Chip
                              label={`${appliance.watts}W`}
                              size="small"
                              sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }}
                            />
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                              {totalHours > 0 ? `${totalHours.toFixed(1)}h total` : "Inactive"}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Right: 24-Hour Track */}
                        <Box
                          sx={{
                            flex: 1,
                            height: 32,
                            borderRadius: 2,
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.05)",
                            border: "1px solid",
                            borderColor: "divider",
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          {/* 3-Hour Grid Divider Lines */}
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
                                pointerEvents: "none",
                              }}
                            />
                          ))}

                          {/* Session Blocks */}
                          {sessions.length === 0 ? (
                            <Box sx={{ height: "100%", display: "flex", alignItems: "center", px: 2 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.4, fontSize: "0.6875rem" }}>
                                No activity recorded on this day
                              </Typography>
                            </Box>
                          ) : (
                            sessions.map((session) => {
                              const left = (session.startHour / 24) * 100;
                              const width = Math.max(1.5, (session.durationHours / 24) * 100);
                              const isLiveBlock = session.type === "live_stopwatch";
                              const isManual = session.type === "manual_routine";

                              return (
                                <Tooltip
                                  key={session.id}
                                  arrow
                                  title={
                                    <Box sx={{ p: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 800, color: isLiveBlock ? "#34d399" : "#a5b4fc", display: "block" }}>
                                        {isLiveBlock ? "⏱️ LIVE RUNNING STOPWATCH" : isManual ? "🟣 Routine Log" : "🔵 Logged Session"}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        Time: {session.startTimeStr} ➔ {session.endTimeStr}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: "block" }}>
                                        Duration: {session.durationHours >= 1 ? `${session.durationHours.toFixed(1)} hrs` : `${Math.round(session.durationHours * 60)} mins`}
                                      </Typography>
                                      <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                                        {session.kwh.toFixed(3)} kWh • ₱{session.cost.toFixed(2)}
                                      </Typography>
                                    </Box>
                                  }
                                >
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      top: 3,
                                      bottom: 3,
                                      borderRadius: 1.5,
                                      cursor: "pointer",
                                      bgcolor: isLiveBlock
                                        ? "#10b981"
                                        : isManual
                                        ? "rgba(168, 85, 247, 0.7)"
                                        : "#6366f1",
                                      border: isLiveBlock ? "1px solid #34d399" : "1px solid rgba(255, 255, 255, 0.2)",
                                      boxShadow: isLiveBlock ? "0 0 10px rgba(52, 211, 153, 0.6)" : "none",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      px: 0.5,
                                      transition: "all 0.15s ease",
                                      "&:hover": {
                                        transform: "scaleY(1.1)",
                                        filter: "brightness(1.2)",
                                        zIndex: 2,
                                      },
                                    }}
                                  >
                                    {width > 8 && (
                                      <Typography
                                        noWrap
                                        variant="caption"
                                        sx={{
                                          color: "#ffffff",
                                          fontSize: "0.5625rem",
                                          fontWeight: 800,
                                          fontFamily: "monospace",
                                        }}
                                      >
                                        {session.startTimeStr}
                                      </Typography>
                                    )}
                                  </Box>
                                </Tooltip>
                              );
                            })
                          )}
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>

                {/* Concurrency Summary */}
                <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Peak Simultaneous Demand: <strong>{peakWatts} W</strong> ({((peakWatts / 1000) * DEFAULT_EFFECTIVE_RATE).toFixed(2)} ₱/hr)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    💡 Hover over any colored session block to inspect metered kWh and peso cost.
                  </Typography>
                </Box>
              </Card>
            </Box>
          )}

          {/* TAB 2: SCHEDULED TASKS */}
          {activeTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Scheduled Tasks for {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}s ({dayEvents.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setIsAddingEvent(!isAddingEvent)}
                  startIcon={<PlusIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  {isAddingEvent ? "Cancel" : "Add Task"}
                </Button>
              </Box>

              {isAddingEvent && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
                  <form onSubmit={handleAddEvent}>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                      <TextField
                        required
                        fullWidth
                        size="small"
                        label="Event / Task Title"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Weekend Laundry Cycle"
                      />
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Associated Appliance (Optional)"
                        value={eventApplianceId}
                        onChange={(e) => setEventApplianceId(e.target.value)}
                      >
                        <MenuItem value="">Custom / Manual Draw</MenuItem>
                        {appliances.map((app) => (
                          <MenuItem key={app.id} value={app.id}>
                            {app.name} ({app.watts}W)
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Start Hour"
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <MenuItem key={h} value={h}>
                            {h % 12 === 0 ? 12 : h % 12} {h >= 12 ? "PM" : "AM"}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        label="Duration (Hours)"
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value) || 1)}
                      />
                      <Box sx={{ gridColumn: { xs: "1", sm: "1 / -1" }, display: "flex", justifyContent: "flex-end" }}>
                        <Button type="submit" variant="contained" size="small" disabled={isCreatingEvent} sx={{ fontWeight: 800 }}>
                          Schedule Task
                        </Button>
                      </Box>
                    </Box>
                  </form>
                </Paper>
              )}

              {dayEvents.length === 0 ? (
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center", py: 3 }}>
                  No scheduled tasks for this day. Add laundry, baking, or aircon routines!
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {dayEvents.map((ev) => (
                    <Paper
                      key={ev.id}
                      variant="outlined"
                      sx={{ p: 1.5, borderRadius: 2.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {ev.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {ev.hour % 12 === 0 ? 12 : ev.hour % 12} {ev.hour >= 12 ? "PM" : "AM"} • {ev.duration_hours}h duration
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          deleteEvent({
                            resource: "user_calendar_events",
                            id: ev.id,
                          });
                        }}
                      >
                        <TrashIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <Divider />

        {/* Footer Dialog Actions */}
        <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Close
          </Button>

          {activeTab === 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveUsage}
              disabled={isSaving}
              sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
            >
              {isSaving ? "Saving..." : isDirty ? "Save Day Log *" : "Saved (Save Again)"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Log Past Time Range Dialog */}
      {selectedApplianceForPastSession && (
        <Dialog
          open={isPastSessionModalOpen}
          onClose={() => setIsPastSessionModalOpen(false)}
          maxWidth="sm"
          fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, fontWeight: 800 }}>
            <TimerIcon sx={{ color: "primary.main", fontSize: 28 }} />
            Log Past Time Range
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Record an exact runtime window for <strong>{selectedApplianceForPastSession.name}</strong> ({selectedApplianceForPastSession.watts}W). Overnight sessions will automatically be split at 12:00 AM midnight across spanned dates!
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                size="small"
                fullWidth
                value={pastStartDateTime}
                onChange={(e) => setPastStartDateTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date & Time"
                type="datetime-local"
                size="small"
                fullWidth
                value={pastEndDateTime}
                onChange={(e) => setPastEndDateTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            {/* Dynamic Multi-Day Splitting Preview */}
            {pastSessionSlices.length > 0 ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(0,0,0,0.2)" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary", mb: 1, display: "block" }}>
                  🗓️ Smart Midnight Calendar Distribution ({pastSessionSlices.length} Day{pastSessionSlices.length > 1 ? "s" : ""} Spanned):
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {pastSessionSlices.map((slice) => {
                    const sliceKwh = calculateKwh(selectedApplianceForPastSession.watts, slice.hours, selectedApplianceForPastSession.quantity || 1);
                    const sliceCost = calculateCost(sliceKwh, DEFAULT_EFFECTIVE_RATE);
                    const startStr = slice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const endStr = slice.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                    return (
                      <Box
                        key={slice.dateKey}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 1.5,
                          bgcolor: "rgba(255, 255, 255, 0.04)",
                          fontSize: "0.75rem",
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>
                            📅 {slice.dateKey}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                            {startStr} – {endStr}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                          {slice.hours.toFixed(2)} hrs • {sliceKwh.toFixed(3)} kWh • ₱{sliceCost.toFixed(2)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.1)" }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    Total Runtime & Incurred Cost:
                  </Typography>
                  {(() => {
                    const totalH = pastSessionSlices.reduce((acc, s) => acc + s.hours, 0);
                    const totalK = calculateKwh(selectedApplianceForPastSession.watts, totalH, selectedApplianceForPastSession.quantity || 1);
                    const totalC = calculateCost(totalK, DEFAULT_EFFECTIVE_RATE);
                    return (
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#34d399" }}>
                        {totalH.toFixed(2)} hrs ({totalK.toFixed(3)} kWh • ₱{totalC.toFixed(2)})
                      </Typography>
                    );
                  })()}
                </Box>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }}>
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                  Please select an End Time that is after the Start Time.
                </Typography>
              </Paper>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsPastSessionModalOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSavePastSession}
              disabled={isSavingPastSession || pastSessionSlices.length === 0}
              startIcon={isSavingPastSession ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{ fontWeight: 800, borderRadius: 2 }}
            >
              {isSavingPastSession ? "Recording..." : "Save Past Session"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Routine Defaults Autofill Modal across Date Ranges */}
      <RoutineAutofillModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        currentSelectedDate={selectedDate}
        appliances={appliances}
        spaces={spaces}
        onApplyToCurrentDay={handleApplyRoutineToCurrentDay}
        onBatchSaved={() => {
          handleApplyRoutineToCurrentDay();
          setIsDirty(false);
          if (onUsageSaved) onUsageSaved();
        }}
      />
    </>
  );
};

export default DateAnalyticsModal;
