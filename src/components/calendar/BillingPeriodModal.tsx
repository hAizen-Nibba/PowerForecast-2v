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
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  DateRange as DateRangeIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Repeat as RepeatIcon,
  Tune as TuneIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as RestartAltIcon,
  Bolt as BoltIcon,
} from "@mui/icons-material";
import {
  BillingPeriodConfig,
  BillingPeriodMode,
  CycleEndOffset,
} from "../../types";
import {
  resolveBillingPeriodWindow,
  formatDateToKey,
  DEFAULT_BILLING_PERIOD_CONFIG,
} from "../../lib/dailyUsageService";
import { tokens } from "../../theme/tokens";

interface BillingPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedDate: Date;
  currentConfig: BillingPeriodConfig;
  onSaveConfig: (newConfig: BillingPeriodConfig) => void;
}

export const BillingPeriodModal: React.FC<BillingPeriodModalProps> = ({
  isOpen,
  onClose,
  currentSelectedDate,
  currentConfig,
  onSaveConfig,
}) => {
  const [mode, setMode] = useState<BillingPeriodMode>(currentConfig.mode);
  const [cycleStartDay, setCycleStartDay] = useState<number>(currentConfig.cycleStartDay || 15);
  const [cycleEndOffset, setCycleEndOffset] = useState<CycleEndOffset>(currentConfig.cycleEndOffset || "same_day");

  const todayStr = formatDateToKey(new Date());
  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth();
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastOfMonthStr = formatDateToKey(new Date(year, month + 1, 0));

  const [customStartDate, setCustomStartDate] = useState<string>(
    currentConfig.customStartDate || firstOfMonthStr
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    currentConfig.customEndDate || lastOfMonthStr
  );

  // Sync internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(currentConfig.mode);
      setCycleStartDay(currentConfig.cycleStartDay || 15);
      setCycleEndOffset(currentConfig.cycleEndOffset || "same_day");
      setCustomStartDate(currentConfig.customStartDate || firstOfMonthStr);
      setCustomEndDate(currentConfig.customEndDate || lastOfMonthStr);
    }
  }, [isOpen, currentConfig, firstOfMonthStr, lastOfMonthStr]);

  // Live preview calculation based on temporary settings
  const tempConfig: BillingPeriodConfig = useMemo(() => {
    return {
      mode,
      cycleStartDay,
      cycleEndOffset,
      customStartDate,
      customEndDate,
    };
  }, [mode, cycleStartDay, cycleEndOffset, customStartDate, customEndDate]);

  const previewWindow = useMemo(() => {
    return resolveBillingPeriodWindow(currentSelectedDate, tempConfig);
  }, [currentSelectedDate, tempConfig]);

  const handleApply = () => {
    onSaveConfig(tempConfig);
    onClose();
  };

  const handleResetToStandard = () => {
    setMode("calendar_month");
    setCycleStartDay(15);
    setCycleEndOffset("same_day");
    onSaveConfig(DEFAULT_BILLING_PERIOD_CONFIG);
    onClose();
  };

  const quickCyclePresets = [1, 5, 10, 15, 20, 25, 28];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
            backgroundImage: "none",
            p: 0.5,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 0.75,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DateRangeIcon sx={{ fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              Billing Period & Cutoff Settings
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              Tailor calendar calculations to match your exact utility meter cutoff dates
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
        {/* Mode Selector Bento Cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            Select Billing Calculation Mode
          </Typography>

          {/* Option 1: Standard Calendar Month */}
          <Paper
            onClick={() => setMode("calendar_month")}
            sx={{
              p: 1.5,
              borderRadius: 1,
              cursor: "pointer",
              border: "1px solid",
              borderColor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "calendar_month"
                  ? isDark ? tokens.dark.borderStrong : tokens.light.borderStrong
                  : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
              },
              bgcolor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "calendar_month"
                  ? isDark ? tokens.dark.active : tokens.light.active
                  : "transparent";
              },
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "border-color 0.15s ease",
            }}
          >
            <CalendarIcon sx={{ mt: 0.25, fontSize: 20, color: mode === "calendar_month" ? "text.primary" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Standard Calendar Month
                </Typography>
                {mode === "calendar_month" && (
                  <Chip
                    size="small"
                    label="Active"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                      color: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, fontSize: "0.75rem" }}>
                Computes energy draw and bills from the 1st to the last day of each month (e.g. Oct 1 – Oct 31).
              </Typography>
            </Box>
          </Paper>

          {/* Option 2: Monthly Recurring Cycle (Cutoff Day) */}
          <Paper
            onClick={() => setMode("recurring_cycle")}
            sx={{
              p: 1.5,
              borderRadius: 1,
              cursor: "pointer",
              border: "1px solid",
              borderColor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "recurring_cycle"
                  ? isDark ? tokens.dark.borderStrong : tokens.light.borderStrong
                  : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
              },
              bgcolor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "recurring_cycle"
                  ? isDark ? tokens.dark.active : tokens.light.active
                  : "transparent";
              },
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "border-color 0.15s ease",
            }}
          >
            <RepeatIcon sx={{ mt: 0.25, fontSize: 20, color: mode === "recurring_cycle" ? "text.primary" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Monthly Recurring Billing Cycle (e.g. 15th to 15th)
                </Typography>
                {mode === "recurring_cycle" && (
                  <Chip
                    size="small"
                    label="Active"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                      color: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, fontSize: "0.75rem" }}>
                Automatically computes your exact monthly billing cycle across month boundaries (e.g. Sep 15 to Oct 15) for every month.
              </Typography>
            </Box>
          </Paper>

          {/* Option 3: Custom Date Range */}
          <Paper
            onClick={() => setMode("custom_range")}
            sx={{
              p: 1.5,
              borderRadius: 1,
              cursor: "pointer",
              border: "1px solid",
              borderColor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "custom_range"
                  ? isDark ? tokens.dark.borderStrong : tokens.light.borderStrong
                  : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
              },
              bgcolor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return mode === "custom_range"
                  ? isDark ? tokens.dark.active : tokens.light.active
                  : "transparent";
              },
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "border-color 0.15s ease",
            }}
          >
            <TuneIcon sx={{ mt: 0.25, fontSize: 20, color: mode === "custom_range" ? "text.primary" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Custom Specific Date Range
                </Typography>
                {mode === "custom_range" && (
                  <Chip
                    size="small"
                    label="Active"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 600,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                      color: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                    }}
                  />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, fontSize: "0.75rem" }}>
                Select an arbitrary start and end date for special audits, sub-meter billing, or irregular cutoff dates.
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Dynamic Controls based on selected mode */}
        {mode === "recurring_cycle" && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Start Day of Cycle */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                1. Billing Cutoff / Start Day of Month
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 1 }}>
                {quickCyclePresets.map((dayNum) => (
                  <Button
                    key={dayNum}
                    size="small"
                    variant={cycleStartDay === dayNum ? "contained" : "outlined"}
                    onClick={() => setCycleStartDay(dayNum)}
                    sx={{
                      minWidth: 44,
                      px: 1,
                      py: 0.4,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      borderRadius: 1,
                    }}
                  >
                    Day {dayNum}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                  Custom Day:
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={cycleStartDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCycleStartDay(Math.max(1, Math.min(31, val)));
                    }
                  }}
                  slotProps={{
                    htmlInput: { min: 1, max: 31, style: { width: 60, textAlign: "center", fontWeight: 700 } },
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  (Enter 1 to 31)
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Cycle End Day Offset Toggle */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                2. Cycle End Day Convention
              </Typography>
              <RadioGroup
                value={cycleEndOffset}
                onChange={(e) => setCycleEndOffset(e.target.value as CycleEndOffset)}
                sx={{ mt: 0.75 }}
              >
                <FormControlLabel
                  value="same_day"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Same Day of Next Month (Recommended)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {cycleStartDay} (e.g. Sep {cycleStartDay} to Oct {cycleStartDay})
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="day_before"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Day Before in Next Month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {Math.max(1, cycleStartDay - 1)} (e.g. Sep {cycleStartDay} to Oct {Math.max(1, cycleStartDay - 1)})
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="day_after"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Day After in Next Month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {cycleStartDay + 1} (e.g. Sep {cycleStartDay} to Oct {cycleStartDay + 1})
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start" }}
                />
              </RadioGroup>
            </Box>
          </Box>
        )}

        {mode === "custom_range" && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
              Specify Custom Billing Window
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        )}

        {/* Live Preview Bento Box */}
        <Paper
          sx={{
            p: 1.75,
            borderRadius: 1,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <BoltIcon sx={{ color: "text.primary", fontSize: 22 }} />
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                fontSize: "0.6875rem",
              }}
            >
              Active Calculation Preview
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
              }}
            >
              {previewWindow.label}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.75rem" }}>
              {previewWindow.subLabel || `${previewWindow.days.length} days timeframe`} • Telemetry and savings calculated strictly within these dates.
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
          onClick={handleResetToStandard}
          sx={{ fontWeight: 600, textTransform: "none", fontSize: "0.75rem" }}
        >
          Reset to Standard Month
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            onClick={onClose}
            sx={{ fontWeight: 600, textTransform: "none", fontSize: "0.75rem" }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.75rem",
              px: 2,
              borderRadius: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
              boxShadow: "none",
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.zinc[200] : tokens.zinc[800],
                boxShadow: "none",
              },
            }}
          >
            Apply Billing Period
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
