import React, { useState, useMemo } from "react";
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
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AutoAwesome as SparklesIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  DateRange as DateRangeIcon,
  Bolt as BoltIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import {
  formatDateToKey,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  batchSaveDailyUsageAcrossRange,
} from "../../lib/dailyUsageService";
import { useToast } from "../common/ToastProvider";

export type AutofillRangeType = "month_to_today" | "full_month" | "custom" | "single_day";

interface RoutineAutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedDate: Date;
  appliances: UserAppliance[];
  spaces?: ApplianceList[];
  onApplyToCurrentDay: () => void;
  onBatchSaved: () => void;
}

export const RoutineAutofillModal: React.FC<RoutineAutofillModalProps> = ({
  isOpen,
  onClose,
  currentSelectedDate,
  appliances,
  onApplyToCurrentDay,
  onBatchSaved,
}) => {
  const [rangeType, setRangeType] = useState<AutofillRangeType>("month_to_today");
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDayNum = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();

  // Custom date inputs
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastOfMonthStr = formatDateToKey(new Date(year, month + 1, 0));
  const todayStr = formatDateToKey(today);

  const [customStartDate, setCustomStartDate] = useState<string>(firstOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState<string>(isCurrentMonth ? todayStr : lastOfMonthStr);

  const { showSuccess, showError } = useToast();

  // Filter appliances by space if specified
  const targetAppliances = useMemo(() => {
    if (selectedSpaceFilter === "all") return appliances;
    return appliances.filter((a) => a.tariff_type === selectedSpaceFilter);
  }, [appliances, selectedSpaceFilter]);

  // Compute active date boundaries based on selected rangeType
  const { startDate, endDate, dateCount, rangeLabel } = useMemo(() => {
    let start = new Date(year, month, 1);
    let end = new Date(year, month, currentDayNum);
    let label = `Aug 1 – Today (${currentDayNum} days)`;

    const monthName = currentSelectedDate.toLocaleDateString("en-US", { month: "short" });

    if (rangeType === "month_to_today") {
      start = new Date(year, month, 1);
      end = isCurrentMonth ? new Date() : new Date(year, month + 1, 0);
      label = `${monthName} 1 – ${isCurrentMonth ? "Today (" + monthName + " " + today.getDate() + ")" : "End of Month"}`;
    } else if (rangeType === "full_month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
      label = `Entire Month (${monthName} 1 – ${monthName} ${end.getDate()})`;
    } else if (rangeType === "custom") {
      start = new Date(customStartDate || firstOfMonthStr);
      end = new Date(customEndDate || lastOfMonthStr);
      label = `${customStartDate} to ${customEndDate}`;
    } else if (rangeType === "single_day") {
      start = new Date(currentSelectedDate);
      end = new Date(currentSelectedDate);
      label = currentSelectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    // Count days
    let count = 0;
    if (end >= start) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      startDate: start,
      endDate: end,
      dateCount: Math.max(1, count),
      rangeLabel: label,
    };
  }, [rangeType, year, month, currentDayNum, isCurrentMonth, today, currentSelectedDate, customStartDate, customEndDate, firstOfMonthStr, lastOfMonthStr]);

  // Compute daily metrics from routine baselines
  const dailyMetrics = useMemo(() => {
    let dailyKwh = 0;
    let activeDeviceCount = 0;

    targetAppliances.forEach((app) => {
      const hours = Number(app.hours_per_day) || 0;
      if (hours > 0) {
        activeDeviceCount += 1;
        dailyKwh += calculateKwh(app.watts, hours, app.quantity || 1);
      }
    });

    const dailyCost = calculateCost(dailyKwh, DEFAULT_EFFECTIVE_RATE);
    const totalKwh = dailyKwh * dateCount;
    const totalCost = dailyCost * dateCount;

    return {
      dailyKwh,
      dailyCost,
      totalKwh,
      totalCost,
      activeDeviceCount,
    };
  }, [targetAppliances, dateCount]);

  const handleBatchSave = async () => {
    if (rangeType === "single_day") {
      onApplyToCurrentDay();
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const result = await batchSaveDailyUsageAcrossRange({
        startDate,
        endDate,
        appliances: targetAppliances,
        effectiveRate: DEFAULT_EFFECTIVE_RATE,
        source: "routine_default",
        overwriteExisting,
      });

      if (result.success) {
        showSuccess(
          `Batch logged routine defaults for ${result.totalDays} days (${result.totalRows} appliance records, ₱${dailyMetrics.totalCost.toFixed(2)})!`,
          "Routine Defaults Logged"
        );
        onBatchSaved();
        onClose();
      } else {
        showError("Failed to save some daily logs across the selected range. Please try again.");
      }
    } catch (err: any) {
      showError(`Error during batch routine save: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            border: "1px solid",
            borderColor: "rgba(129, 140, 248, 0.25)",
            backdropFilter: "blur(24px)",
            p: 0.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SparklesIcon sx={{ color: "#ffd54f", fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Autofill Routine Defaults
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Batch apply inventory baseline hours across multiple calendar dates
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* 1. Range Preset Options */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.04em" }}>
            SELECT DATE RANGE TARGET:
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
            {/* Option 1: 1st to Today */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("month_to_today")}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "month_to_today" ? "primary.main" : "divider",
                bgcolor: rangeType === "month_to_today" ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 14, 58, 0.4)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 18, color: rangeType === "month_to_today" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "month_to_today" ? "primary.light" : "text.primary" }}>
                  1st of Month to Today
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Fills Day 1 up to today ({isCurrentMonth ? today.getDate() : currentDayNum} days)
              </Typography>
            </Paper>

            {/* Option 2: Full Month */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("full_month")}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "full_month" ? "primary.main" : "divider",
                bgcolor: rangeType === "full_month" ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 14, 58, 0.4)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <DateRangeIcon sx={{ fontSize: 18, color: rangeType === "full_month" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "full_month" ? "primary.light" : "text.primary" }}>
                  Entire Month
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Fills all days (Day 1 to 31) for this month
              </Typography>
            </Paper>

            {/* Option 3: Custom Range */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("custom")}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "custom" ? "primary.main" : "divider",
                bgcolor: rangeType === "custom" ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 14, 58, 0.4)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <DateRangeIcon sx={{ fontSize: 18, color: rangeType === "custom" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "custom" ? "primary.light" : "text.primary" }}>
                  Custom Date Range
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Select custom start and end dates
              </Typography>
            </Paper>

            {/* Option 4: Single Day */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("single_day")}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "single_day" ? "primary.main" : "divider",
                bgcolor: rangeType === "single_day" ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 14, 58, 0.4)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: rangeType === "single_day" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "single_day" ? "primary.light" : "text.primary" }}>
                  This Selected Day Only
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Applies baseline to open modal sliders
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Custom Date Pickers (Shown if Custom selected) */}
        {rangeType === "custom" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              fullWidth
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        )}

        {/* Space / Tariff Filter Chips */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
            APPLIANCE SCOPE:
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              label={`All Appliances (${appliances.length})`}
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

        {/* Impact Live Calculation Preview Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: "rgba(15, 14, 58, 0.6)",
            borderColor: "rgba(129, 140, 248, 0.3)",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light", display: "flex", alignItems: "center", gap: 0.5 }}>
              <BoltIcon sx={{ fontSize: 16 }} />
              Calculated Routine Projection:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#ffd54f" }}>
              {rangeLabel} ({dateCount} day{dateCount > 1 ? "s" : ""})
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, textAlign: "center" }}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.25)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Active Devices
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "text.primary" }}>
                {dailyMetrics.activeDeviceCount} of {targetAppliances.length}
              </Typography>
            </Box>

            <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.25)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Daily Estimate
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.light" }}>
                ₱{dailyMetrics.dailyCost.toFixed(2)}/day
              </Typography>
            </Box>

            <Box sx={{ p: 1, borderRadius: 2, bgcolor: "rgba(0, 0, 0, 0.25)" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Total Range Cost
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                ₱{dailyMetrics.totalCost.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {rangeType !== "single_day" && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Overwrite days that already have logged data (Uncheck to only fill unlogged/empty days)
                </Typography>
              }
              sx={{ mt: 0.5, mb: 0 }}
            />
          )}
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cancel
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {rangeType !== "single_day" && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                onApplyToCurrentDay();
                onClose();
              }}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Apply to Today Only
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleBatchSave}
            disabled={isSaving}
            sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
          >
            {isSaving
              ? "Batch Saving Logs..."
              : rangeType === "single_day"
              ? "Apply Routine Defaults"
              : `⚡ Batch Save & Log (${dateCount} Days)`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default RoutineAutofillModal;
