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
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Close as CloseIcon,
  Add as PlusIcon,
  Delete as TrashIcon,
  Bolt as BoltIcon,
  ContentCopy as CopyIcon,
  AutoAwesome as SparklesIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  Timeline as TimelineIcon,
  Search as SearchIcon,
  Timer as TimerIcon,
  AccessTime as ClockIcon,
  ChevronRight as ChevronRightIcon,
  Tune as TuneIcon,
  WarningAmber as WarningIcon,
  CalendarMonth as CalendarIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
} from "@mui/icons-material";
import { UserAppliance, DailyApplianceUsage, ApplianceList, ApplianceUsageLog } from "../../types";
import { useCreate, useDelete, useUpdate } from "@refinedev/core";
import {
  formatDateToKey,
  parseKeyToDate,
  batchSaveDailyUsage,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  hmsToDecimalHours,
  decimalHoursToHms,
  splitSessionAcrossDays,
  accumulateLiveSessionDailyUsage,
  deductSessionDailyUsage,
} from "../../lib/dailyUsageService";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";
import { RoutineAutofillModal } from "./RoutineAutofillModal";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events?: any[];
  initialUsageRecords?: DailyApplianceUsage[];
  spaces?: ApplianceList[];
  selectedSpaceId?: string;
  logs?: ApplianceUsageLog[];
  onUsageSaved?: () => void;
}

interface TimelineSessionBlock {
  id: string;
  logId?: string;
  rawLog?: ApplianceUsageLog;
  type: "logged_session" | "live_stopwatch";
  startHour: number;
  endHour: number;
  durationHours: number;
  kwh: number;
  cost: number;
  startTimeStr: string;
  endTimeStr: string;
}

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  initialUsageRecords = [],
  logs = [],
  onUsageSaved,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Usage state: Map of applianceId -> { hours: number, notes: string }
  const [usageState, setUsageState] = useState<Record<string, { hours: number; notes: string }>>({});
  const [selectedApplianceId, setSelectedApplianceId] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingYesterday, setIsLoadingYesterday] = useState<boolean>(false);

  const { showSuccess, showInfo, showError } = useToast();
  const { mutate: createLog } = useCreate();
  const { mutate: deleteLog } = useDelete();
  const { mutate: updateAppliance } = useUpdate();

  // Timeline Block Action Modal State
  const [selectedBlockForAction, setSelectedBlockForAction] = useState<{
    block: TimelineSessionBlock;
    appliance: UserAppliance;
  } | null>(null);
  const [isEditingBlockRange, setIsEditingBlockRange] = useState(false);
  const [blockEditStartDateTime, setBlockEditStartDateTime] = useState("");
  const [blockEditEndDateTime, setBlockEditEndDateTime] = useState("");
  const [isSavingBlockAction, setIsSavingBlockAction] = useState(false);

  // Progressive Routine Conversion Modal (Route 3 -> 4)
  const [progressiveRoutinePrompt, setProgressiveRoutinePrompt] = useState<{
    appliance: UserAppliance;
    durationHours: number;
  } | null>(null);

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

  const todayKey = formatDateToKey(new Date());
  const isSelectedToday = dateKey === todayKey;
  const isPastDate = dateKey < todayKey;
  const isFutureDate = dateKey > todayKey;
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
  const hasLoggedData = useMemo(() => {
    const hasLocalHours = Object.values(usageState).some((u) => u.hours > 0);
    const hasRecordHours = initialUsageRecords.some(
      (rec) => rec.usage_date === dateKey && Number(rec.hours_used) > 0
    );
    return hasLocalHours || hasRecordHours;
  }, [usageState, initialUsageRecords, dateKey]);

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

  const selectedAppliance = useMemo(() => {
    if (selectedApplianceId) {
      const found = filteredAppliances.find((a) => a.id === selectedApplianceId);
      if (found) return found;
    }
    return filteredAppliances[0] || null;
  }, [filteredAppliances, selectedApplianceId]);

  // Calculate live Day Totals based on current inputs, logs, and live stopwatches
  const dayTotals = useMemo(() => {
    let totalKwh = 0;
    let activeDevices = 0;

    appliances.forEach((app) => {
      const state = usageState[app.id];
      const effectiveHours = state ? state.hours : 0;

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
  }, [appliances, usageState]);

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

  // Action: Start or Stop Live Stopwatch for Today
  const handleToggleLiveStopwatch = async (app: UserAppliance) => {
    const isCurrentlyOn = Boolean(app.is_currently_on && app.last_turned_on_at);

    if (isCurrentlyOn && app.last_turned_on_at) {
      // Turning OFF
      const start = new Date(app.last_turned_on_at);
      const end = new Date();
      const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
      const hours = durationMinutes / 60;
      const kwh = calculateKwh(app.watts, hours, app.quantity || 1);
      const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

      try {
        await new Promise<void>((resolve, reject) => {
          createLog(
            {
              resource: "appliance_usage_logs",
              values: {
                appliance_id: app.id,
                user_id: app.user_id || null,
                started_at: start.toISOString(),
                ended_at: end.toISOString(),
                duration_minutes: durationMinutes,
                kwh_consumed: kwh,
                estimated_cost: cost,
                source: "stopwatch",
              },
            },
            {
              onSuccess: () => resolve(),
              onError: (err: any) => reject(err),
            }
          );
        });

        await accumulateLiveSessionDailyUsage({
          appliance_id: app.id,
          durationMinutes,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: app.user_id || null,
          startTime: start,
          endTime: end,
        });

        updateAppliance({
          resource: "user_appliances",
          id: app.id,
          values: {
            is_currently_on: false,
            last_turned_on_at: null,
          },
        });

        showSuccess(
          `Stopped stopwatch for ${app.name} (${(durationMinutes / 60).toFixed(2)} hrs • ${kwh.toFixed(3)} kWh • ₱${cost.toFixed(2)})`,
          "Stopwatch Session Saved"
        );

        if (onUsageSaved) onUsageSaved();
      } catch (err: any) {
        showError(`Failed to save stopwatch session: ${err?.message}`);
      }
    } else {
      // Turning ON
      const nowIso = new Date().toISOString();
      updateAppliance({
        resource: "user_appliances",
        id: app.id,
        values: {
          is_currently_on: true,
          last_turned_on_at: nowIso,
        },
      });

      showSuccess(`⏱️ Live stopwatch started for ${app.name}! Elapsed runtime is now tracking in real time.`, "Stopwatch Active");
      if (onUsageSaved) onUsageSaved();
    }
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

      // Progressive Routine Conversion (Route 3 -> 4): If appliance currently has no routine (0h), prompt user
      if (app && (!app.hours_per_day || app.hours_per_day <= 0)) {
        const totalHours = totalMinutes / 60;
        setProgressiveRoutinePrompt({
          appliance: app,
          durationHours: Number(totalHours.toFixed(1)),
        });
      }
    } catch (err: any) {
      showError(`Failed to save past session: ${err?.message}`);
    } finally {
      setIsSavingPastSession(false);
    }
  };

  const handleDeleteSessionLog = async (logId: string) => {
    const log = (logs || []).find((l) => l.id === logId);
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
    deleteLog(
      {
        resource: "appliance_usage_logs",
        id: logId,
      },
      {
        onSuccess: () => {
          showInfo("Session log removed and daily usage reconciled.");
          if (onUsageSaved) onUsageSaved();
        },
      }
    );
  };

  // Block Click Action Handlers
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
      const sDate = parseKeyToDate(dateKey);
      sDate.setHours(Math.floor(block.startHour), Math.round((block.startHour % 1) * 60));
      const eDate = parseKeyToDate(dateKey);
      eDate.setHours(Math.floor(block.endHour), Math.round((block.endHour % 1) * 60));

      const sIso = `${formatDateToKey(sDate)}T${String(sDate.getHours()).padStart(2, "0")}:${String(sDate.getMinutes()).padStart(2, "0")}`;
      const eIso = `${formatDateToKey(eDate)}T${String(eDate.getHours()).padStart(2, "0")}:${String(eDate.getMinutes()).padStart(2, "0")}`;

      setBlockEditStartDateTime(sIso);
      setBlockEditEndDateTime(eIso);
    }
  };

  const handleDeleteBlockSession = async () => {
    if (!selectedBlockForAction) return;
    const { block } = selectedBlockForAction;
    if (block.logId) {
      await handleDeleteSessionLog(block.logId);
      setSelectedBlockForAction(null);
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
      }
      setSelectedBlockForAction(null);
      if (onUsageSaved) onUsageSaved();
    } catch (err: any) {
      showError(`Failed to save session edit: ${err?.message}`);
    } finally {
      setIsSavingBlockAction(false);
    }
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

      const isActive =
        hours >= 24
          ? true
          : (appStart + hours) <= 24
          ? hour >= appStart && hour < (appStart + hours)
          : hour >= appStart || hour < ((appStart + hours) % 24);

      if (isActive && hours > 0) {
        totalWatts += app.watts * (app.quantity || 1);
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

  // Compute Pure 24-Hour Stopwatch Activity Timeline Data (Strictly Verified Stopwatch Logs)
  const timelineData = useMemo(() => {
    return filteredAppliances.map((app) => {
      const sessionBlocks: TimelineSessionBlock[] = [];

      // 1. Finished/Logged Stopwatch Sessions for this appliance that have a slice on this date
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

      // 2. If viewing today and appliance is currently running a live stopwatch
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
            endTimeStr: "LIVE ACTIVE",
          });
        }
      }

      // Sort session blocks chronologically by startHour
      sessionBlocks.sort((a, b) => a.startHour - b.startHour);

      const totalAppHours = Math.min(
        24,
        sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0)
      );

      return {
        appliance: app,
        sessions: sessionBlocks,
        totalHours: totalAppHours,
      };
    });
  }, [filteredAppliances, logs, dateKey, isSelectedToday]);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        slotProps={{
          paper: {
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              bgcolor: "#0b0a26",
              backgroundImage: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.15) 0%, rgba(11, 10, 38, 0.98) 70%)",
              boxShadow: "0 32px 80px rgba(0, 0, 0, 0.8)",
              border: "1px solid rgba(108, 122, 224, 0.3)",
              color: "#ffffff",
              overflow: "hidden",
              maxHeight: "92vh",
            },
          },
        }}
      >
        {/* MODAL HEADER */}
        <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: "rgba(99, 102, 241, 0.2)",
                color: "primary.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(99, 102, 241, 0.4)",
              }}
            >
              <CalendarIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                  {formattedDate}
                </Typography>
                {isSelectedToday ? (
                  <Chip
                    label={hasActiveStopwatch ? "🟢 Today • Live Active" : "🟢 Today • Live Ready"}
                    size="small"
                    color="success"
                    sx={{ height: 22, fontSize: "0.7rem", fontWeight: 800 }}
                  />
                ) : isPastDate ? (
                  <Chip
                    label={hasLoggedData ? "📅 Past Historical Log" : "📅 Unlogged Past Day"}
                    size="small"
                    color={hasLoggedData ? "primary" : "default"}
                    variant={hasLoggedData ? "filled" : "outlined"}
                    sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label="🔮 Projected Target / Future Budget"
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.7rem", fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isSelectedToday
                  ? "Track real-time stopwatch usage and inspect progress against your daily target energy quota."
                  : isPastDate
                  ? "Retrospective daily record. Enter exact elapsed runtime or inject timestamped time ranges."
                  : "Forecasted energy allocation and estimated bill based on inventory baseline targets."}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* TABS HEADER (2 STREAMLINED TABS) */}
        <Box sx={{ px: { xs: 2, sm: 3 }, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 800,
                fontSize: "0.85rem",
                minHeight: 44,
                py: 1,
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
              label="24-Hour Stopwatch Activity"
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: { xs: 2, sm: 2.75 }, display: "flex", flexDirection: "column", gap: 2.5, overflowY: "auto" }}>
          {/* KPI BANNER */}
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

          {/* TAB 0: DAILY USAGE LOG (MASTER-DETAIL STUDIO LAYOUT WITH TARGET BUDGET QUOTA GAUGE) */}
          {activeTab === 0 && (() => {
            const renderTimeLoggingStudio = (app: UserAppliance) => {
              const state = usageState[app.id] || { hours: 0, notes: "" };
              const hours = state.hours;
              const qty = app.quantity || 1;
              const kwh = calculateKwh(app.watts, hours, qty);
              const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

              // Target Quota & Remaining Hours Telemetry
              const targetHours = Number(app.hours_per_day) || 0;
              const isContinuous = targetHours >= 24;
              const remainingHours = Math.max(0, targetHours - hours);
              const overHours = Math.max(0, hours - targetHours);
              const remainingKwh = calculateKwh(app.watts, remainingHours, qty);
              const remainingCost = calculateCost(remainingKwh, DEFAULT_EFFECTIVE_RATE);
              const overKwh = calculateKwh(app.watts, overHours, qty);
              const overCost = calculateCost(overKwh, DEFAULT_EFFECTIVE_RATE);
              const targetKwh = calculateKwh(app.watts, targetHours, qty);
              const targetCost = calculateCost(targetKwh, DEFAULT_EFFECTIVE_RATE);
              const progressPct = targetHours > 0 ? Math.min(100, Math.round((hours / targetHours) * 100)) : 0;
              const isOverBudget = !isContinuous && targetHours > 0 && hours > targetHours;

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
              const hms = decimalHoursToHms(hours);

              return (
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: 3.5,
                    borderColor: isOverBudget ? "rgba(239, 68, 68, 0.4)" : "rgba(108, 122, 224, 0.35)",
                    bgcolor: "rgba(15, 14, 58, 0.65)",
                    backdropFilter: "blur(12px)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
                  }}
                >
                  {/* Header: Title, Category & Calculated Preview */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                    <Box sx={{ flex: 1, minWidth: 180 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", fontSize: "1.05rem" }}>
                          {app.name}
                        </Typography>
                        {app.quantity && app.quantity > 1 && (
                          <Chip label={`x${app.quantity}`} size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700 }} />
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
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                        <span>{app.category}</span>
                        {app.room_location && <span>• {app.room_location}</span>}
                        {app.brand && <span>• {app.brand}</span>}
                        {app.model && <span>({app.model})</span>}
                      </Typography>
                    </Box>

                    {/* Day Cost & Energy Preview */}
                    <Box
                      sx={{
                        p: 1.25,
                        px: 2,
                        borderRadius: 2.5,
                        bgcolor: isOverBudget ? "rgba(239, 68, 68, 0.15)" : "rgba(99, 102, 241, 0.15)",
                        border: isOverBudget ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(99, 102, 241, 0.35)",
                        textAlign: "right",
                        flexShrink: 0,
                      }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 900,
                          fontFamily: "monospace",
                          color: isOverBudget ? "#f87171" : hours > 0 ? "#ffd54f" : "text.secondary",
                          lineHeight: 1.1,
                        }}
                      >
                        ₱{cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontFamily: "monospace", display: "block" }}>
                        {kwh.toFixed(3)} kWh • {app.watts}W
                      </Typography>
                    </Box>
                  </Box>

                  {/* TARGET BUDGET & REMAINING QUOTA GAUGE BAR */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      bgcolor: isOverBudget
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(99, 102, 241, 0.08)",
                      borderColor: isOverBudget
                        ? "rgba(239, 68, 68, 0.25)"
                        : "rgba(99, 102, 241, 0.25)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                        🎯 Daily Target Quota: <strong>{targetHours > 0 ? `${targetHours.toFixed(1)} hrs` : "On-Demand"}</strong>
                        {targetHours > 0 && <span style={{ opacity: 0.7 }}>(₱{targetCost.toFixed(2)} budget)</span>}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: isOverBudget ? "#f87171" : "primary.light",
                          fontSize: "0.75rem",
                        }}
                      >
                        {targetHours > 0 ? `${Math.round((hours / targetHours) * 100)}% consumed` : `${hours.toFixed(1)}h logged`}
                      </Typography>
                    </Box>

                    {/* Progress Track */}
                    {targetHours > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={isContinuous ? 100 : progressPct}
                        sx={{
                          height: 8,
                          borderRadius: 2,
                          bgcolor: "rgba(255, 255, 255, 0.08)",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 2,
                            bgcolor: isOverBudget
                              ? "#ef4444"
                              : isContinuous
                              ? "#3b82f6"
                              : "linear-gradient(90deg, #6366f1 0%, #34d399 100%)",
                          },
                        }}
                      />
                    )}

                    {/* Telemetry Status Line */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 700 }}>
                        {isSelectedToday ? (
                          <>⏱️ Logged Today: <strong style={{ color: "#ffffff" }}>{hours.toFixed(1)} hrs</strong> ({kwh.toFixed(2)} kWh)</>
                        ) : isPastDate ? (
                          <>📋 Historical Record: <strong style={{ color: "#ffffff" }}>{hours.toFixed(1)} hrs</strong> ({kwh.toFixed(2)} kWh)</>
                        ) : (
                          <>🔮 Planned Target Quota: <strong style={{ color: "#ffffff" }}>{targetHours.toFixed(1)} hrs</strong> ({targetKwh.toFixed(2)} kWh)</>
                        )}
                      </Typography>

                      {isContinuous ? (
                        <Chip
                          label="🔄 24/7 Steady Background Load"
                          size="small"
                          sx={{ height: 20, fontSize: "0.625rem", fontWeight: 800, bgcolor: "rgba(59, 130, 246, 0.2)", color: "#93c5fd" }}
                        />
                      ) : isOverBudget ? (
                        <Typography variant="caption" sx={{ color: "#f87171", fontWeight: 800, fontSize: "0.72rem", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <WarningIcon sx={{ fontSize: 14 }} /> Exceeded target by +{overHours.toFixed(1)} hrs (+₱{overCost.toFixed(2)} over budget)
                        </Typography>
                      ) : targetHours > 0 ? (
                        <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800, fontSize: "0.72rem" }}>
                          ⏳ Remaining: {remainingHours.toFixed(1)} hrs (₱{remainingCost.toFixed(2)} budget left)
                        </Typography>
                      ) : null}
                    </Box>
                  </Paper>

                  {/* Logged Sessions (if any exist) */}
                  {hasSessionLogs && (
                    <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "rgba(0, 0, 0, 0.35)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.6875rem", fontWeight: 800, color: "primary.light", mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <ClockIcon sx={{ fontSize: 13 }} /> Logged Stopwatch Sessions on this Date:
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
                                height: 26,
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
                            sx={{ height: 26, fontSize: "0.6875rem", fontWeight: 800 }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

                  {/* Runtime Input Section */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.75rem", letterSpacing: "0.02em" }}>
                        {isSelectedToday ? "TODAY OPERATING RUNTIME:" : isPastDate ? "RETROSPECTIVE OPERATING RUNTIME:" : "PROJECTED OPERATING RUNTIME:"}
                      </Typography>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        {isSelectedToday && (
                          <Button
                            size="small"
                            variant="contained"
                            color={isLive ? "error" : "success"}
                            startIcon={isLive ? <StopIcon sx={{ fontSize: "14px" }} /> : <PlayIcon sx={{ fontSize: "14px" }} />}
                            onClick={() => handleToggleLiveStopwatch(app)}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 800,
                              fontSize: "0.72rem",
                              height: 28,
                              px: 1.5,
                              boxShadow: isLive ? "0 0 12px rgba(239, 68, 68, 0.5)" : "0 0 12px rgba(16, 185, 129, 0.4)",
                            }}
                          >
                            {isLive ? "⏹️ Stop Stopwatch" : "⏱️ Start Stopwatch Now"}
                          </Button>
                        )}

                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={<PlusIcon sx={{ fontSize: "14px" }} />}
                          onClick={() => handleOpenPastSessionModal(app)}
                          sx={{ borderRadius: 2, fontWeight: 800, fontSize: "0.72rem", height: 28, px: 1.25 }}
                        >
                          {isPastDate ? "Log Past Time Range (Exact Times)" : "Log Past Time Range"}
                        </Button>
                      </Box>
                    </Box>

                    {/* Numeric Fields & Default Habit */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "rgba(0, 0, 0, 0.4)", p: 0.75, borderRadius: 2.5, border: "1px solid rgba(129, 140, 248, 0.25)" }}>
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
                            width: 68,
                            "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
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
                            width: 68,
                            "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
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
                            width: 68,
                            "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
                            "& input": { textAlign: "center", py: 0 },
                          }}
                        />
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SparklesIcon sx={{ fontSize: "14px" }} />}
                        onClick={() => handleHoursChange(app.id, app.hours_per_day || 8)}
                        sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.72rem", height: 34, textTransform: "none" }}
                      >
                        Apply Target Quota ({app.hours_per_day || 8}h)
                      </Button>
                    </Box>

                    {/* Quick Presets Bar */}
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        { label: "0h", value: 0 },
                        { label: "30m", value: 0.5 },
                        { label: "1h", value: 1 },
                        { label: "2h", value: 2 },
                        { label: "4h", value: 4 },
                        { label: "8h", value: 8 },
                        { label: "12h", value: 12 },
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
                              minWidth: 42,
                              px: 1,
                              py: 0.4,
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              borderRadius: 2,
                              height: 32,
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
            };

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Quick Action Toolbar */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
                      sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", opacity: 0.8 }}
                    >
                      Clear (0h)
                    </Button>
                  </Box>

                  {/* Tariff Space Filter */}
                  <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                    {["all", "residential", "commercial"].map((sp) => (
                      <Chip
                        key={sp}
                        label={sp.charAt(0).toUpperCase() + sp.slice(1)}
                        size="small"
                        clickable
                        onClick={() => setSelectedSpaceFilter(sp)}
                        variant={selectedSpaceFilter === sp ? "filled" : "outlined"}
                        color={selectedSpaceFilter === sp ? "primary" : "default"}
                        sx={{ fontWeight: 800, fontSize: "0.7rem", height: 26 }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Master-Detail Layout */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
                    gap: 2,
                    alignItems: "start",
                  }}
                >
                  {/* Left Column: Appliance Selection List */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: "rgba(15, 14, 58, 0.4)",
                      borderColor: "rgba(108, 122, 224, 0.2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                      maxHeight: { xs: "auto", md: "520px" },
                      overflowY: "auto",
                    }}
                  >
                    {/* Search Bar */}
                    <TextField
                      size="small"
                      placeholder="Search appliances..."
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
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          height: 34,
                          fontSize: "0.8rem",
                          bgcolor: "rgba(0, 0, 0, 0.3)",
                        },
                      }}
                    />

                    {/* Appliance Items */}
                    {filteredAppliances.length === 0 ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
                        No appliances found.
                      </Typography>
                    ) : (
                      filteredAppliances.map((app) => {
                        const isSelected = selectedAppliance?.id === app.id;
                        const state = usageState[app.id] || { hours: 0, notes: "" };
                        const hours = state.hours;
                        const cost = calculateCost(calculateKwh(app.watts, hours, app.quantity || 1), DEFAULT_EFFECTIVE_RATE);
                        const isLive = Boolean(applianceStopwatchMap[app.id]?.isLive);
                        const targetHours = Number(app.hours_per_day) || 0;
                        const isOver = targetHours > 0 && targetHours < 24 && hours > targetHours;

                        return (
                          <Paper
                            key={app.id}
                            variant="outlined"
                            onClick={() => setSelectedApplianceId(app.id)}
                            sx={{
                              p: 1.25,
                              borderRadius: 2.5,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                              bgcolor: isSelected
                                ? "rgba(99, 102, 241, 0.2)"
                                : "rgba(255, 255, 255, 0.02)",
                              borderColor: isSelected
                                ? "primary.main"
                                : isOver
                                ? "rgba(239, 68, 68, 0.4)"
                                : "rgba(255, 255, 255, 0.06)",
                              transition: "all 0.15s ease",
                              "&:hover": {
                                bgcolor: "rgba(99, 102, 241, 0.12)",
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 2,
                                  bgcolor: hours > 0 ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                  color: hours > 0 ? "primary.light" : "text.secondary",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <BoltIcon fontSize="small" />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography noWrap variant="body2" sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
                                    {app.name}
                                  </Typography>
                                  {isLive && (
                                    <Chip label="LIVE" size="small" color="success" sx={{ height: 16, fontSize: "0.5625rem", fontWeight: 900 }} />
                                  )}
                                </Box>
                                <Typography noWrap variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                                  {app.category} • {app.watts}W {app.room_location ? `(${app.room_location})` : ""}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", color: isOver ? "#f87171" : hours > 0 ? "#ffd54f" : "text.secondary", fontSize: "0.82rem" }}>
                                ₱{cost.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                                {hours.toFixed(1)}h
                              </Typography>
                            </Box>
                          </Paper>
                        );
                      })
                    )}
                  </Paper>

                  {/* Right Column: Selected Appliance Logging Studio */}
                  <Box>
                    {selectedAppliance ? (
                      renderTimeLoggingStudio(selectedAppliance)
                    ) : (
                      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3.5, bgcolor: "rgba(15, 14, 58, 0.4)" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          Select an appliance from the list to adjust its operating hours.
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })()}

          {/* TAB 1: 24-HOUR PURE STOPWATCH ACTIVITY TIMELINE */}
          {activeTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Card sx={{ p: 2.5, borderRadius: 3 }}>
                {/* Header & Legend */}
                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1.5, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                      <TimelineIcon sx={{ color: "primary.main" }} />
                      24-Hour Stopwatch Activity Timeline
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Exact metered sessions recorded via stopwatch (00:00 – 24:00)
                    </Typography>
                  </Box>

                  {/* Timeline Legend */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#34d399", animation: "pulse 1.5s infinite" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#34d399", fontSize: "0.6875rem" }}>
                        Live Running Stopwatch (Present)
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#6366f1" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#818cf8", fontSize: "0.6875rem" }}>
                        Logged Stopwatch Session (Past)
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
                              {totalHours > 0 ? `${totalHours.toFixed(1)}h metered` : "No stopwatch logs"}
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
                            <Box
                              onClick={() => handleOpenPastSessionModal(appliance)}
                              sx={{
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                px: 1.5,
                                cursor: "pointer",
                                bgcolor: isPastDate ? "rgba(99, 102, 241, 0.05)" : "transparent",
                                transition: "all 0.15s ease",
                                "&:hover": {
                                  bgcolor: isPastDate ? "rgba(99, 102, 241, 0.15)" : "transparent",
                                },
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isPastDate ? "primary.light" : "text.secondary",
                                  fontWeight: isPastDate ? 700 : 400,
                                  fontSize: "0.6875rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  opacity: isPastDate ? 0.95 : 0.4,
                                }}
                              >
                                {isPastDate ? (
                                  <>
                                    <PlusIcon sx={{ fontSize: 13 }} /> No session logged on this date • Click to record exact duration / session
                                  </>
                                ) : (
                                  "No live stopwatch session recorded yet today"
                                )}
                              </Typography>
                            </Box>
                          ) : (
                            sessions.map((session) => {
                              const left = (session.startHour / 24) * 100;
                              const width = Math.max(1.5, (session.durationHours / 24) * 100);
                              const isLiveBlock = session.type === "live_stopwatch";

                              return (
                                <Tooltip
                                  key={session.id}
                                  arrow
                                  title={
                                    <Box sx={{ p: 0.5 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 800, color: isLiveBlock ? "#34d399" : "#a5b4fc", display: "block" }}>
                                        {isLiveBlock ? "⏱️ LIVE RUNNING STOPWATCH" : "🔵 Logged Stopwatch Session (Click to Edit / Delete)"}
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
                                      {!isLiveBlock && (
                                        <Typography variant="caption" sx={{ display: "block", color: "primary.light", fontWeight: 800, mt: 0.5 }}>
                                          👉 Click block to inspect / edit / delete
                                        </Typography>
                                      )}
                                    </Box>
                                  }
                                >
                                  <Box
                                    onClick={() => handleBlockClick(session, appliance)}
                                    sx={{
                                      position: "absolute",
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      top: 3,
                                      bottom: 3,
                                      borderRadius: 1.5,
                                      cursor: "pointer",
                                      bgcolor: isLiveBlock ? "#10b981" : "#6366f1",
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
                                          maxWidth: "100%",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          px: 0.25,
                                        }}
                                      >
                                        {width > 16
                                          ? session.startTimeStr
                                          : `${String(Math.floor(session.startHour)).padStart(2, "0")}:${String(Math.round((session.startHour % 1) * 60)).padStart(2, "0")}`}
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
                    💡 Hover over any session block to inspect metered kWh and peso cost.
                  </Typography>
                </Box>
              </Card>
            </Box>
          )}
        </DialogContent>

        <Divider />

        {/* MODAL FOOTER */}
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1.5, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2.5, fontWeight: 700 }}>
            Close
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveUsage}
            disabled={isSaving}
            sx={{
              borderRadius: 2.5,
              fontWeight: 800,
              px: 3,
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
            }}
          >
            {isSaving ? "Saving..." : isDirty ? "Save Daily Log" : "Saved (Save Again)"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Routine Autofill Modal */}
      <RoutineAutofillModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        currentSelectedDate={selectedDate}
        appliances={appliances}
        onApplyToCurrentDay={() => {
          appliances.forEach((app) => {
            handleHoursChange(app.id, app.hours_per_day || 0);
          });
          showInfo("Loaded routine baseline hours.");
        }}
        onBatchSaved={() => {
          if (onUsageSaved) onUsageSaved();
          onClose();
        }}
      />

      {/* Past Session Range Modal */}
      {isPastSessionModalOpen && selectedApplianceForPastSession && (
        <Dialog
          open={isPastSessionModalOpen}
          onClose={() => setIsPastSessionModalOpen(false)}
          fullWidth
          maxWidth="xs"
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
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                Log Past Session
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {selectedApplianceForPastSession.name} ({selectedApplianceForPastSession.watts}W)
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setIsPastSessionModalOpen(false)}>
              <CloseIcon sx={{ color: "text.secondary" }} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
            <TextField
              type="datetime-local"
              label="Start Date & Time"
              value={pastStartDateTime}
              onChange={(e) => setPastStartDateTime(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type="datetime-local"
              label="End Date & Time"
              value={pastEndDateTime}
              onChange={(e) => setPastEndDateTime(e.target.value)}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {pastSessionSlices.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(99, 102, 241, 0.1)" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light", display: "block" }}>
                  Summary:
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  Spans {pastSessionSlices.length} calendar day(s)
                </Typography>
                {pastSessionSlices.map((s) => (
                  <Typography key={s.dateKey} variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>
                    • {s.dateKey}: {s.hours.toFixed(2)}h ({calculateKwh(selectedApplianceForPastSession.watts, s.hours, selectedApplianceForPastSession.quantity || 1).toFixed(3)} kWh)
                  </Typography>
                ))}
              </Paper>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setIsPastSessionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleSavePastSession}
              disabled={isSavingPastSession || pastSessionSlices.length === 0}
              sx={{ fontWeight: 800 }}
            >
              {isSavingPastSession ? "Saving..." : "Save Session"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Selected Block Session Action Dialog */}
      {selectedBlockForAction && (
        <Dialog
          open={Boolean(selectedBlockForAction)}
          onClose={() => {
            if (!isSavingBlockAction) {
              setSelectedBlockForAction(null);
              setIsEditingBlockRange(false);
            }
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
                  bgcolor: selectedBlockForAction.block.type === "live_stopwatch" ? "rgba(16, 185, 129, 0.2)" : "rgba(99, 102, 241, 0.2)",
                  color: selectedBlockForAction.block.type === "live_stopwatch" ? "#34d399" : "#818cf8",
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
                  {selectedBlockForAction.appliance.watts}W • {selectedBlockForAction.block.type === "live_stopwatch" ? "Live Running Stopwatch" : "Timestamped Stopwatch Session Log"}
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
            ) : selectedBlockForAction.block.type === "live_stopwatch" ? (
              <Button
                color="warning"
                variant="contained"
                startIcon={<TimerIcon />}
                onClick={() => {
                  setSelectedBlockForAction(null);
                  setSelectedApplianceForPastSession(null);
                  if (onUsageSaved) onUsageSaved();
                }}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Live Stopwatch Active
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
      {/* Progressive Routine Conversion Prompt Dialog (Route 3 -> 4) */}
      {progressiveRoutinePrompt && (
        <Dialog
          open={Boolean(progressiveRoutinePrompt)}
          onClose={() => setProgressiveRoutinePrompt(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 3.5,
                bgcolor: "#0b0a26",
                backgroundImage: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.2) 0%, rgba(11, 10, 38, 0.98) 70%)",
                border: "1px solid rgba(129, 140, 248, 0.35)",
                boxShadow: "0 32px 80px rgba(0, 0, 0, 0.8)",
                color: "#ffffff",
                p: 1,
              },
            },
          }}
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SparklesIcon sx={{ color: "#ffd54f", fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Set as Routine Target Quota?
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {progressiveRoutinePrompt.appliance.name} has no daily routine set.
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
              You logged <strong style={{ color: "#ffffff" }}>{progressiveRoutinePrompt.durationHours} hours</strong> for this device. Would you like to use <strong style={{ color: "#ffd54f" }}>{progressiveRoutinePrompt.durationHours}h/day</strong> as your baseline target routine?
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Paper
                variant="outlined"
                onClick={() => {
                  updateAppliance({
                    resource: "user_appliances",
                    id: progressiveRoutinePrompt.appliance.id,
                    values: {
                      hours_per_day: progressiveRoutinePrompt.durationHours,
                      days_per_month: 30,
                    },
                  });
                  showSuccess(`Set ${progressiveRoutinePrompt.durationHours}h/day everyday routine for ${progressiveRoutinePrompt.appliance.name}!`);
                  setProgressiveRoutinePrompt(null);
                  if (onUsageSaved) onUsageSaved();
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  bgcolor: "rgba(99, 102, 241, 0.12)",
                  borderColor: "primary.main",
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "rgba(99, 102, 241, 0.25)" },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.light" }}>
                  🗓️ Everyday (7 Days / Week)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Applies {progressiveRoutinePrompt.durationHours}h/day quota across 30 days/month
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                onClick={() => {
                  updateAppliance({
                    resource: "user_appliances",
                    id: progressiveRoutinePrompt.appliance.id,
                    values: {
                      hours_per_day: progressiveRoutinePrompt.durationHours,
                      days_per_month: 22,
                    },
                  });
                  showSuccess(`Set ${progressiveRoutinePrompt.durationHours}h/day weekday routine for ${progressiveRoutinePrompt.appliance.name}!`);
                  setProgressiveRoutinePrompt(null);
                  if (onUsageSaved) onUsageSaved();
                }}
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  transition: "all 0.15s ease",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)" },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                  📆 Custom Frequency (Weekdays / 22 Days)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Applies {progressiveRoutinePrompt.durationHours}h/day quota on active days
                </Typography>
              </Paper>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, px: 3, justifyContent: "space-between" }}>
            <Button
              variant="text"
              size="small"
              color="inherit"
              onClick={() => setProgressiveRoutinePrompt(null)}
              sx={{ fontWeight: 700, textTransform: "none" }}
            >
              No, Just Log for this Day
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default DateAnalyticsModal;
