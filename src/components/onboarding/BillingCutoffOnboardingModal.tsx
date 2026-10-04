import React, { useState, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  CalendarMonth as CalendarIcon,
  Repeat as RepeatIcon,
  ElectricBolt as ElectricBoltIcon,
  CheckCircle as CheckCircleIcon,
  Tune as TuneIcon,
  AccessTime as ClockIcon,
  Shield as ShieldIcon,
  Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import { useBillingPeriod } from "../../context/BillingPeriodContext";
import { BillingPeriodMode, CycleEndOffset, BillingPeriodConfig } from "../../types";
import { resolveBillingPeriodWindow, formatDateToKey } from "../../lib/dailyUsageService";
import { tokens } from "../../theme/tokens";

export const BillingCutoffOnboardingModal: React.FC = () => {
  const { isOnboardingModalOpen, setIsOnboardingModalOpen, updateConfig, config } = useBillingPeriod();

  const [mode, setMode] = useState<BillingPeriodMode>(config.mode || "recurring_cycle");
  const [cycleStartDay, setCycleStartDay] = useState<number>(config.cycleStartDay || 15);
  const [cycleEndOffset, setCycleEndOffset] = useState<CycleEndOffset>(config.cycleEndOffset || "same_day");

  const today = useMemo(() => new Date(), []);

  // Temporary config for live calculation preview
  const tempConfig: BillingPeriodConfig = useMemo(() => {
    return {
      mode,
      cycleStartDay,
      cycleEndOffset,
    };
  }, [mode, cycleStartDay, cycleEndOffset]);

  const previewWindow = useMemo(() => {
    return resolveBillingPeriodWindow(today, tempConfig);
  }, [today, tempConfig]);

  const daysRemaining = useMemo(() => {
    const end = previewWindow.endDate.getTime();
    const cur = today.getTime();
    const diff = Math.ceil((end - cur) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [previewWindow, today]);

  const handleConfirm = () => {
    updateConfig(tempConfig);
    setIsOnboardingModalOpen(false);
  };

  const quickCyclePresets = [1, 5, 10, 15, 20, 25, 28];

  // Suppress modal on public/auth routes so it never covers the signup/login form
  const isAuthOrPublicPage = typeof window !== "undefined" && (
    window.location.hash.startsWith("#/login") ||
    window.location.hash.startsWith("#/signup") ||
    window.location.hash.startsWith("#/forgot-password") ||
    window.location.hash.startsWith("#/verify-email") ||
    window.location.hash.startsWith("#/verified") ||
    window.location.hash === "#/" ||
    window.location.pathname === "/login" ||
    window.location.pathname === "/signup"
  );

  if (isAuthOrPublicPage) {
    return null;
  }

  return (
    <Dialog
      open={isOnboardingModalOpen}
      onClose={(_, reason) => {
        if (reason !== "backdropClick") {
          setIsOnboardingModalOpen(false);
        }
      }}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
            backgroundImage: "none",
            p: 1,
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 48px -12px rgba(0,0,0,0.8)"
                : "0 24px 48px -12px rgba(0,0,0,0.15)",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.main",
            }}
          >
            <ElectricBoltIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
                Choose Your Billing Due Date & Cutoff
              </Typography>
              <Chip
                label="Step 1: Setup"
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  color: "text.secondary",
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Configure your monthly Meralco due date / meter reading cutoff for 100% accurate electric bills
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.25, pt: 1 }}>
        {/* Educational Info Box */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.08)" : "rgba(37, 99, 235, 0.05)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.2)",
            display: "flex",
            alignItems: "flex-start",
            gap: 1.25,
          }}
        >
          <LightbulbIcon sx={{ color: "#3b82f6", fontSize: 20, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "text.primary" }}>
              Why choose your Due Date / Meter Cutoff?
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, lineHeight: 1.4 }}>
              Meralco bills your electricity across your specific monthly meter reading cycle (e.g. 15th to 15th), not
              standard calendar months. Setting your cutoff day aligns your telemetry, unbundled tariffs, and forecasting to your actual statement.
            </Typography>
          </Box>
        </Paper>

        {/* Calculation Mode Selector */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            Select Your Meter Cutoff Mode
          </Typography>

          {/* Option 1: Monthly Recurring Billing Cycle (Recommended) */}
          <Paper
            onClick={() => setMode("recurring_cycle")}
            sx={{
              p: 1.75,
              borderRadius: 1.25,
              cursor: "pointer",
              border: "1.5px solid",
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
            <RepeatIcon sx={{ mt: 0.25, fontSize: 22, color: mode === "recurring_cycle" ? "primary.main" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                  Monthly Recurring Billing Cycle (Recommended)
                </Typography>
                <Chip
                  size="small"
                  label="Meralco Standard"
                  sx={{
                    height: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, fontSize: "0.75rem" }}>
                Automatically computes monthly cycles across month boundaries (e.g. Sep 15 to Oct 15) for all past, present, and future statements.
              </Typography>
            </Box>
          </Paper>

          {/* Option 2: Standard Calendar Month */}
          <Paper
            onClick={() => setMode("calendar_month")}
            sx={{
              p: 1.75,
              borderRadius: 1.25,
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
            <CalendarIcon sx={{ mt: 0.25, fontSize: 22, color: mode === "calendar_month" ? "primary.main" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                  Standard Calendar Month
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, fontSize: "0.75rem" }}>
                Computes energy draw and bills strictly from the 1st to the last day of each month (e.g. Oct 1 – Oct 31).
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Dynamic Recurring Cutoff Controls */}
        {mode === "recurring_cycle" && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc"),
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Cutoff Day Picker */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                1. What day of the month is your meter reading cutoff / statement due date?
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
                      px: 1.25,
                      py: 0.4,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      borderRadius: 1,
                    }}
                  >
                    {dayNum === 15 ? "Day 15 (Default)" : `Day ${dayNum}`}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                  Or enter specific day:
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
                  (1 to 31)
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* End Day Convention */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                2. Cycle End Day Convention
              </Typography>
              <RadioGroup
                value={cycleEndOffset}
                onChange={(e) => setCycleEndOffset(e.target.value as CycleEndOffset)}
                sx={{ mt: 0.5 }}
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
                        Example: Day {cycleStartDay + 1} to Day {cycleStartDay} (e.g. Sep {cycleStartDay + 1} to Oct {cycleStartDay})
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start" }}
                />
              </RadioGroup>
            </Box>
          </Box>
        )}

        {/* Live Active Calculation Preview */}
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: 1.25,
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
          <ClockIcon sx={{ color: "text.primary", fontSize: 24 }} />
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
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
                fontWeight: 700,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
              }}
            >
              {previewWindow.label}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.75rem", mt: 0.25 }}>
              {previewWindow.days.length} Days Window • {daysRemaining} days remaining until cutoff • Applied Rate: September 2026 Schedule (Gen: ₱9.28)
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="medium"
          variant="contained"
          onClick={handleConfirm}
          startIcon={<CheckCircleIcon sx={{ fontSize: 18 }} />}
          sx={{
            fontWeight: 700,
            textTransform: "none",
            fontSize: "0.8125rem",
            px: 3,
            py: 1,
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
          Confirm Due Date & Enter Dashboard
        </Button>
      </DialogActions>
    </Dialog>
  );
};
