import React, { useState, useMemo, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  Bolt as BoltIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  AutoAwesome as SparklesIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Check as CheckIcon,
  Lock as LockIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import { useCreate } from "@refinedev/core";
import {
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  formatDateToKey,
  parseKeyToDate,
  batchSaveDailyUsageAcrossRange,
  hmsToDecimalHours,
  decimalHoursToHms,
} from "../../lib/dailyUsageService";
import { useToast } from "../common/ToastProvider";

interface ApplianceRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingAppliance: Partial<UserAppliance> | null;
  spaces: ApplianceList[];
  selectedListId?: string;
  onApplianceCreated: (created: any) => void;
}

export const ApplianceRoutineModal: React.FC<ApplianceRoutineModalProps> = ({
  isOpen,
  onClose,
  incomingAppliance,
  spaces,
  selectedListId,
  onApplianceCreated,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [targetListId, setTargetListId] = useState<string>("");
  const [roomLocation, setRoomLocation] = useState<string>("Living Room");
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [hms, setHms] = useState({ hours: 8, minutes: 0, seconds: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Month and Date boundaries for the Mini Calendar
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed
  const todayDateNumber = today.getDate();
  const todayKey = formatDateToKey(today);

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekdayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Initial set of selected past dates: Day 1 up to yesterday
  const [selectedDateKeys, setSelectedDateKeys] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    for (let d = 1; d < todayDateNumber; d++) {
      const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      keys.add(dKey);
    }
    return keys;
  });

  const { showSuccess, showWarning, showError } = useToast();
  const { mutateAsync: createAppliance } = useCreate();

  useEffect(() => {
    if (isOpen && incomingAppliance) {
      const initialHours = incomingAppliance.hours_per_day !== undefined ? incomingAppliance.hours_per_day : 8;
      setHoursPerDay(initialHours);
      setHms(decimalHoursToHms(initialHours));
      setTargetListId(selectedListId || incomingAppliance.list_id || spaces[0]?.id || "");
      setRoomLocation(incomingAppliance.room_location || "Living Room");
      setActiveTab(0);

      // Re-initialize past days
      const keys = new Set<string>();
      for (let d = 1; d < todayDateNumber; d++) {
        const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        keys.add(dKey);
      }
      setSelectedDateKeys(keys);
    }
  }, [isOpen, incomingAppliance, selectedListId, spaces, currentYear, currentMonth, todayDateNumber]);

  const handleHoursChange = (decimal: number) => {
    const clamped = Math.max(0, Math.min(24, Number(decimal.toFixed(2))));
    setHoursPerDay(clamped);
    setHms(decimalHoursToHms(clamped));
  };

  // Mini Calendar Selection Shortcuts
  const handleSelectAllPast = () => {
    const keys = new Set<string>();
    for (let d = 1; d < todayDateNumber; d++) {
      const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      keys.add(dKey);
    }
    setSelectedDateKeys(keys);
  };

  const handleSelectWeekdays = () => {
    const keys = new Set<string>();
    for (let d = 1; d < todayDateNumber; d++) {
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        keys.add(dKey);
      }
    }
    setSelectedDateKeys(keys);
  };

  const handleSelectWeekends = () => {
    const keys = new Set<string>();
    for (let d = 1; d < todayDateNumber; d++) {
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        keys.add(dKey);
      }
    }
    setSelectedDateKeys(keys);
  };

  const handleClearSelection = () => {
    setSelectedDateKeys(new Set<string>());
  };

  const handleToggleDay = (dKey: string, isPast: boolean) => {
    if (!isPast) return;
    setSelectedDateKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dKey)) {
        next.delete(dKey);
      } else {
        next.add(dKey);
      }
      return next;
    });
  };

  const watts = incomingAppliance?.watts || 100;
  const quantity = incomingAppliance?.quantity || 1;

  // Real-time calculations
  const dailyKwh = calculateKwh(watts, hoursPerDay, quantity);
  const dailyCost = calculateCost(dailyKwh, DEFAULT_EFFECTIVE_RATE);
  const monthlyKwh = dailyKwh * 30;
  const monthlyCost = dailyCost * 30;

  // Elaborated selection totals
  const selectedDaysCount = selectedDateKeys.size;
  const backfillTotalKwh = dailyKwh * selectedDaysCount;
  const backfillTotalCost = dailyCost * selectedDaysCount;

  const handleSave = async () => {
    if (!incomingAppliance) return;

    setIsSaving(true);
    try {
      const isZeroHours = hoursPerDay <= 0;

      // Prepare final appliance payload
      const finalPayload: Partial<UserAppliance> = {
        ...incomingAppliance,
        list_id: targetListId || spaces[0]?.id || null,
        room_location: roomLocation,
        hours_per_day: hoursPerDay,
        days_per_month: 30,
      };

      const res = await createAppliance({
        resource: "user_appliances",
        values: finalPayload,
      });

      const createdItem = (res as any)?.data || (res as any)?.result || finalPayload;

      // If user skipped / 0h quota
      if (isZeroHours) {
        showWarning(
          `No target quota set for ${incomingAppliance.name}. Saved as "On-Demand" (0h baseline). You can set quotas anytime.`,
          "Saved as On-Demand"
        );
      } else {
        showSuccess(
          `Added ${incomingAppliance.name} with ${hoursPerDay}h/day target quota (₱${monthlyCost.toFixed(2)}/mo)!`,
          "Appliance Added"
        );
      }

      // If Elaborated Past Dates mode was used and user has selected past dates
      if (activeTab === 1 && selectedDateKeys.size > 0 && hoursPerDay > 0 && createdItem?.id) {
        try {
          const sortedDates = Array.from(selectedDateKeys).sort();
          for (const dKey of sortedDates) {
            const dDate = parseKeyToDate(dKey);
            await batchSaveDailyUsageAcrossRange({
              startDate: dDate,
              endDate: dDate,
              appliances: [{ ...createdItem, hours_per_day: hoursPerDay, watts, quantity }],
              effectiveRate: DEFAULT_EFFECTIVE_RATE,
              source: "routine_default",
              overwriteExisting: true,
            });
          }
          showSuccess(
            `Backfilled ${selectedDateKeys.size} historical day(s) for ${incomingAppliance.name}!`,
            "History Backfilled"
          );
        } catch (backfillErr: any) {
          console.warn("Backfill history warning:", backfillErr);
        }
      }

      onApplianceCreated(createdItem);
      onClose();
    } catch (err: any) {
      showError(`Failed to save appliance: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!incomingAppliance) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1.5,
            bgcolor: "background.paper",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 32px 80px rgba(0, 0, 0, 0.8)"
                : "0 20px 60px rgba(15, 23, 42, 0.12)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0, 229, 201, 0.25)"
                : "#e2e8f0",
            color: "text.primary",
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#ffffff") }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Set Daily Target Quota & Routine
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Configure typical operating hours and budget benchmark for this device
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* TABS HEADER */}
      <Box sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.8125rem",
              minHeight: 44,
              py: 1,
            },
          }}
        >
          <Tab icon={<SparklesIcon fontSize="small" />} iconPosition="start" label="Quick Target Quota" />
          <Tab icon={<CalendarIcon fontSize="small" />} iconPosition="start" label="Elaborated Past Dates (Backfill)" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Device Information Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "#f8fafc",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              {incomingAppliance.name || `${incomingAppliance.brand} ${incomingAppliance.model}`}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.75 }}>
              <span>{incomingAppliance.category}</span>
              <span>•</span>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                  fontWeight: 800,
                }}
              >
                {watts} Watts
              </Typography>
              {incomingAppliance.energy_rating && <span>• {incomingAppliance.energy_rating}</span>}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              select
              size="small"
              label="Space"
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              sx={{ minWidth: 140, "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.78rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            >
              {spaces.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Room"
              value={roomLocation}
              onChange={(e) => setRoomLocation(e.target.value)}
              sx={{ width: 130, "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.78rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Paper>

        {/* TAB 0: QUICK TARGET QUOTA */}
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.04em" }}>
                HOW MANY HOURS DO YOU PLAN TO USE THIS PER DAY?
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                Serves as your baseline budget quota. Your live stopwatch or past logging will track actual usage against this.
              </Typography>
            </Box>

            {/* Quick Presets Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {[
                { label: "1h (Light)", value: 1 },
                { label: "2h (Moderate)", value: 2 },
                { label: "4h (Standard)", value: 4 },
                { label: "8h (Typical)", value: 8 },
                { label: "12h (Heavy)", value: 12 },
                { label: "24h Steady", value: 24 },
              ].map((preset) => {
                const isSelected = Math.abs(hoursPerDay - preset.value) < 0.02;
                return (
                  <Button
                    key={preset.label}
                    size="small"
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => handleHoursChange(preset.value)}
                    sx={{
                      py: 1,
                      borderRadius: 2,
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      bgcolor: isSelected
                        ? "primary.main"
                        : (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
                      borderColor: isSelected
                        ? "primary.main"
                        : (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
                      color: isSelected ? "#ffffff" : "text.primary",
                    }}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </Box>

            {/* Custom Input */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#f8fafc",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Custom Runtime:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <TextField
                  type="number"
                  size="small"
                  value={hms.hours}
                  onChange={(e) => {
                    const h = Math.max(0, Math.min(24, parseInt(e.target.value) || 0));
                    handleHoursChange(hmsToDecimalHours(h, hms.minutes, hms.seconds));
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
                  sx={{
                    width: 72,
                    "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
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
                    handleHoursChange(hmsToDecimalHours(hms.hours, m, hms.seconds));
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
                  sx={{
                    width: 72,
                    "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
                    "& input": { textAlign: "center", py: 0 },
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* TAB 1: ELABORATED PAST DATES (INTERACTIVE MINI CALENDAR GRID) */}
        {activeTab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.04em" }}>
                  SELECT PAST DATES TO BACKFILL USAGE ({monthName.toUpperCase()}):
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                  Click days you operated this appliance before today. Future dates are strictly locked.
                </Typography>
              </Box>
            </Box>

            {/* Quick Selection Shortcuts */}
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectAllPast}
                sx={{
                  fontSize: "0.6875rem",
                  py: 0.4,
                  px: 1,
                  borderRadius: 1,
                  fontWeight: 800,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                  color: "text.primary",
                }}
              >
                All Past (1–{todayDateNumber - 1})
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectWeekdays}
                sx={{
                  fontSize: "0.6875rem",
                  py: 0.4,
                  px: 1,
                  borderRadius: 1,
                  fontWeight: 800,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                  color: "text.primary",
                }}
              >
                Weekdays Only
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectWeekends}
                sx={{
                  fontSize: "0.6875rem",
                  py: 0.4,
                  px: 1,
                  borderRadius: 1,
                  fontWeight: 800,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                  color: "text.primary",
                }}
              >
                Weekends Only
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={handleClearSelection}
                startIcon={<ClearIcon sx={{ fontSize: 13 }} />}
                sx={{
                  fontSize: "0.6875rem",
                  py: 0.4,
                  px: 1,
                  borderRadius: 1,
                  fontWeight: 700,
                  opacity: 0.85,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                }}
              >
                Clear
              </Button>
            </Box>

            {/* Mini Calendar Grid */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1.25,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "#f8fafc",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              }}
            >
              {/* Month Header Label */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                  mb: 1,
                  display: "block",
                  textAlign: "center",
                  letterSpacing: "0.06em",
                }}
              >
                {monthName.toUpperCase()}
              </Typography>

              {/* Day-of-Week Headers */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.75, textAlign: "center" }}>
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((dName, idx) => (
                  <Typography
                    key={dName}
                    variant="caption"
                    sx={{
                      fontSize: "0.625rem",
                      fontWeight: 800,
                      color: idx === 0 || idx === 6 ? "text.secondary" : "text.primary",
                      opacity: 0.65,
                    }}
                  >
                    {dName}
                  </Typography>
                ))}
              </Box>

              {/* Days Grid */}
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
                {/* Empty cells before Day 1 */}
                {Array.from({ length: firstDayWeekdayIndex }).map((_, i) => (
                  <Box key={`pad-${i}`} sx={{ height: 32 }} />
                ))}

                {/* Days of Month */}
                {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isPast = dayNum < todayDateNumber;
                  const isToday = dayNum === todayDateNumber;
                  const isFuture = dayNum > todayDateNumber;
                  const isSelected = selectedDateKeys.has(dKey);

                  if (isFuture) {
                    return (
                      <Tooltip key={dKey} title="Future date (cannot log past usage)">
                        <Box
                          sx={{
                            height: 32,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f1f5f9",
                            opacity: 0.4,
                            cursor: "not-allowed",
                            border: "1px solid",
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "#e2e8f0",
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                            {dayNum}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  }

                  if (isToday) {
                    return (
                      <Tooltip key={dKey} title="Today (tracked via live stopwatch)">
                        <Box
                          sx={{
                            height: 32,
                            borderRadius: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(0, 229, 201, 0.12)"
                                : "rgba(13, 148, 136, 0.1)",
                            border: (theme) =>
                              theme.palette.mode === "dark"
                                ? "1px dashed rgba(0, 229, 201, 0.6)"
                                : "1px dashed rgba(13, 148, 136, 0.6)",
                            cursor: "not-allowed",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.6875rem",
                              fontWeight: 900,
                              color: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
                              lineHeight: 1,
                            }}
                          >
                            {dayNum}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.5rem",
                              fontWeight: 800,
                              color: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
                              lineHeight: 1,
                            }}
                          >
                            TODAY
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  }

                  // Past Clickable Day
                  return (
                    <Box
                      key={dKey}
                      onClick={() => handleToggleDay(dKey, isPast)}
                      sx={{
                        height: 32,
                        borderRadius: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        bgcolor: (theme) =>
                          isSelected
                            ? theme.palette.mode === "dark"
                              ? "primary.main"
                              : "#0d9488"
                            : theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.03)"
                            : "#ffffff",
                        border: (theme) =>
                          isSelected
                            ? theme.palette.mode === "dark"
                              ? "1px solid #00e5c9"
                              : "1px solid #0d9488"
                            : theme.palette.mode === "dark"
                            ? "1px solid rgba(255, 255, 255, 0.08)"
                            : "1px solid #e2e8f0",
                        color: isSelected ? "#ffffff" : "text.primary",
                        boxShadow: (theme) =>
                          isSelected
                            ? theme.palette.mode === "dark"
                              ? "0 0 10px rgba(0, 229, 201, 0.5)"
                              : "0 2px 8px rgba(13, 148, 136, 0.3)"
                            : "none",
                        transition: "all 0.12s ease",
                        "&:hover": {
                          bgcolor: (theme) =>
                            isSelected
                              ? theme.palette.mode === "dark"
                                ? "primary.dark"
                                : "#0f766e"
                              : theme.palette.mode === "dark"
                              ? "rgba(0, 229, 201, 0.15)"
                              : "rgba(13, 148, 136, 0.1)",
                          borderColor: "primary.main",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                        <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: isSelected ? 900 : 600 }}>
                          {dayNum}
                        </Typography>
                        {isSelected && <CheckIcon sx={{ fontSize: 11, color: "#ffffff" }} />}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>

            {/* Daily Hours for Backfill */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.25,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#f8fafc",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  Daily Runtime for Backfill Days:
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
                  }}
                >
                  {hoursPerDay} hrs / day
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {[1, 2, 4, 8, 12, 24].map((h) => (
                  <Button
                    key={h}
                    size="small"
                    variant={hoursPerDay === h ? "contained" : "outlined"}
                    onClick={() => handleHoursChange(h)}
                    sx={{
                      minWidth: 40,
                      px: 1,
                      py: 0.25,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      bgcolor:
                        hoursPerDay === h
                          ? "primary.main"
                          : (theme) => (theme.palette.mode === "dark" ? "transparent" : "#ffffff"),
                      borderColor:
                        hoursPerDay === h
                          ? "primary.main"
                          : (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1"),
                      color: hoursPerDay === h ? "#ffffff" : "text.primary",
                    }}
                  >
                    {h}h
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Backfill Total Summary Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1.25,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Backfill Selection Total ({selectedDaysCount} days):
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                }}
              >
                ~₱{backfillTotalCost.toFixed(2)} ({backfillTotalKwh.toFixed(2)} kWh)
              </Typography>
            </Paper>
          </Box>
        )}

        {/* FORECASTED IMPACT PREVIEW BANNER */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#f8fafc",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 16 }} />
              FORECASTED ENERGY & COST IMPACT:
            </Typography>
            <Chip
              label={hoursPerDay > 0 ? `${hoursPerDay}h/day baseline` : "0h On-Demand"}
              size="small"
              color={hoursPerDay > 0 ? "primary" : "default"}
              sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800 }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, textAlign: "center" }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#ffffff",
                border: (theme) =>
                  theme.palette.mode === "dark" ? "none" : "1px solid #e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Daily Consumption
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                }}
              >
                {dailyKwh.toFixed(3)} kWh/day (₱{dailyCost.toFixed(2)})
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#ffffff",
                border: (theme) =>
                  theme.palette.mode === "dark" ? "none" : "1px solid #e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Estimated Monthly Bill
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                }}
              >
                ₱{monthlyCost.toFixed(2)}/mo ({monthlyKwh.toFixed(1)} kWh)
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          p: 2,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#f8fafc"),
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
          sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
        >
          {isSaving ? "Saving to Inventory..." : "Save & Add to Inventory"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplianceRoutineModal;
