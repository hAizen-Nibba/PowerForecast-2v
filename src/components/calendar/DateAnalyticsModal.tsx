import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Card from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import Slider from "@mui/material/Slider";
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
  Speed as SpeedIcon,
  Home as HomeIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { UserAppliance, UserCalendarEvent, DailyApplianceUsage } from "../../types";
import { useCreate, useDelete } from "@refinedev/core";
import {
  formatDateToKey,
  batchSaveDailyUsage,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
} from "../../lib/dailyUsageService";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events: UserCalendarEvent[];
  initialUsageRecords?: DailyApplianceUsage[];
  onUsageSaved?: () => void;
}

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  events,
  initialUsageRecords = [],
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

  // Initialize usage state when modal opens or selectedDate/initialUsageRecords change
  useEffect(() => {
    if (!isOpen) return;

    const initialMap: Record<string, { hours: number; notes: string }> = {};

    // 1. First map from initialUsageRecords for this specific date
    initialUsageRecords.forEach((rec) => {
      if (rec.usage_date === dateKey) {
        initialMap[rec.appliance_id] = {
          hours: Number(rec.hours_used) || 0,
          notes: rec.notes || "",
        };
      }
    });

    // 2. For any appliances without a record for this day: default to 0 (or let user autofill)
    appliances.forEach((app) => {
      if (!initialMap[app.id]) {
        initialMap[app.id] = {
          hours: 0,
          notes: "",
        };
      }
    });

    setUsageState(initialMap);
    setIsDirty(false);
  }, [isOpen, dateKey, initialUsageRecords, appliances]);

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

  // Calculate live Day Totals based on current slider positions
  const dayTotals = useMemo(() => {
    let totalKwh = 0;
    let activeDevices = 0;

    appliances.forEach((app) => {
      const state = usageState[app.id];
      const hours = state ? state.hours : 0;
      if (hours > 0) {
        activeDevices += 1;
        totalKwh += calculateKwh(app.watts, hours, app.quantity || 1);
      }
    });

    const totalCost = calculateCost(totalKwh, DEFAULT_EFFECTIVE_RATE);

    return {
      kwh: Number(totalKwh.toFixed(2)),
      cost: totalCost,
      activeDevices,
    };
  }, [appliances, usageState]);

  // Update hours for a single appliance
  const handleHoursChange = (appId: string, hours: number) => {
    setUsageState((prev) => ({
      ...prev,
      [appId]: {
        hours: Math.max(0, Math.min(24, Number(hours.toFixed(1)))),
        notes: prev[appId]?.notes || "",
      },
    }));
    setIsDirty(true);
  };

  // Action: Populate with Routine Baseline Defaults (hours_per_day from inventory)
  const handleApplyDefaults = () => {
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
    showInfo("Loaded routine baseline hours for all inventory appliances.");
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
    showInfo("Reset all appliance hours to 0.");
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
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      {/* Header */}
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CalendarIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
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
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* Tabs */}
      <Box sx={{ px: 3, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab
            icon={<BoltIcon fontSize="small" />}
            iconPosition="start"
            label={`Daily Usage Log (${dayTotals.activeDevices}/${appliances.length})`}
            sx={{ fontWeight: 700 }}
          />
          <Tab
            icon={<TimelineIcon fontSize="small" />}
            iconPosition="start"
            label="24-Hour Load Profile"
            sx={{ fontWeight: 700 }}
          />
          <Tab
            icon={<ListIcon fontSize="small" />}
            iconPosition="start"
            label={`Scheduled Tasks (${dayEvents.length})`}
            sx={{ fontWeight: 700 }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* KPI Banner always visible */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, textAlign: "center", bgcolor: "rgba(15, 14, 58, 0.4)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                DAY BILL COST
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f", my: 0.25 }}>
                ₱{dayTotals.cost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                @ ₱{DEFAULT_EFFECTIVE_RATE.toFixed(2)}/kWh
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, textAlign: "center", bgcolor: "rgba(15, 14, 58, 0.4)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                DAY CONSUMPTION
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.light", my: 0.25 }}>
                {dayTotals.kwh} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                {dayTotals.activeDevices} Devices Active
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, textAlign: "center", bgcolor: "rgba(15, 14, 58, 0.4)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                MAX HOURLY LOAD
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: peakWatts > 2000 ? "error.main" : "warning.main", my: 0.25 }}>
                {peakWatts} W
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Concurrent Peak Draw
              </Typography>
            </Paper>
          </Grid>
        </Grid>

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
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* Appliance Sliders List */}
            {filteredAppliances.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No appliances match your selected filters. Register appliances in your Inventory first!
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
                {filteredAppliances.map((app) => {
                  const state = usageState[app.id] || { hours: 0, notes: "" };
                  const hours = state.hours;
                  const qty = app.quantity || 1;
                  const kwh = calculateKwh(app.watts, hours, qty);
                  const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

                  return (
                    <Card
                      key={app.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        borderColor: hours > 0 ? "primary.main" : "divider",
                        bgcolor: hours > 0 ? "rgba(99, 102, 241, 0.05)" : "transparent",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                            {app.name}
                            {app.quantity && app.quantity > 1 && (
                              <Chip label={`x${app.quantity}`} size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }} />
                            )}
                            {app.room_location && (
                              <Chip label={app.room_location} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.625rem" }} />
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {app.category} • {app.watts}W {app.brand ? `• ${app.brand}` : ""}
                          </Typography>
                        </Box>

                        {/* Calculated day preview for this appliance */}
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", color: hours > 0 ? "#ffd54f" : "text.secondary" }}>
                            ₱{cost.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                            {kwh.toFixed(3)} kWh
                          </Typography>
                        </Box>
                      </Box>

                      {/* Slider + Stepper Controls */}
                      <Grid container spacing={2} sx={{ alignItems: "center" }}>
                        <Grid size={{ xs: 12, sm: 7 }}>
                          <Box sx={{ px: 1 }}>
                            <Slider
                              value={hours}
                              min={0}
                              max={24}
                              step={0.5}
                              onChange={(_, val) => handleHoursChange(app.id, val as number)}
                              valueLabelDisplay="auto"
                              valueLabelFormat={(v) => `${v}h`}
                              sx={{ py: 1 }}
                            />
                          </Box>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 5 }}>
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {[0, 1, 4, 8, 12, 24].map((h) => (
                              <Button
                                key={h}
                                size="small"
                                variant={hours === h ? "contained" : "outlined"}
                                onClick={() => handleHoursChange(app.id, h)}
                                sx={{
                                  minWidth: 32,
                                  px: 0.75,
                                  py: 0.25,
                                  fontSize: "0.6875rem",
                                  fontWeight: 700,
                                  borderRadius: 1.5,
                                }}
                              >
                                {h}h
                              </Button>
                            ))}
                          </Box>
                        </Grid>
                      </Grid>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* TAB 1: 24-HOUR LOAD PROFILE */}
        {activeTab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Card sx={{ p: 2.5, borderRadius: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  24-Hour Power Load Simulation (Watts)
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Peak: {peakWatts} W
                </Typography>
              </Box>

              <Box sx={{ height: 240, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#0f0e3a", border: "1px solid rgba(99, 102, 241, 0.4)", color: "#ffffff" }}>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                {d.hour}
                              </Typography>
                              <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, fontFamily: "monospace" }}>
                                {d.watts} Watts (₱{d.cost.toFixed(2)}/hr)
                              </Typography>
                            </Box>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="watts" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorWatts)" />
                  </AreaChart>
                </ResponsiveContainer>
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
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        required
                        fullWidth
                        size="small"
                        label="Event / Task Title"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g. Weekend Laundry Cycle"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
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
                    </Grid>
                    <Grid size={6}>
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
                    </Grid>
                    <Grid size={6}>
                      <TextField
                        type="number"
                        fullWidth
                        size="small"
                        label="Duration (Hours)"
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value) || 1)}
                      />
                    </Grid>
                    <Grid size={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button type="submit" variant="contained" size="small" disabled={isCreatingEvent}>
                        Schedule Task
                      </Button>
                    </Grid>
                  </Grid>
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
                    sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}
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
      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2 }}>
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
  );
};

export default DateAnalyticsModal;
