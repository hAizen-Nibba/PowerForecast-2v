import React, { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import {
  TrackChanges as TargetIcon,
  CheckCircle as CheckIcon,
  WarningAmber as WarningIcon,
  ErrorOutlined as DangerIcon,
  TrendingDown as TrendingDownIcon,
  TipsAndUpdates as TipsIcon,
  Bolt as BoltIcon,
} from "@mui/icons-material";
import { SectionCard } from "../common/SectionCard";
import { tokens } from "../../theme/tokens";

interface BudgetSentinelCardProps {
  budgetTarget: number;
  onBudgetTargetChange: (target: number) => void;
  mtdCost: number;
  mtdKwh: number;
  forecastedBill: number;
  forecastedKwh: number;
  daysInActiveMonth: number;
  elapsedDays: number;
  remainingDays: number;
  effectiveBurnRate: number; // daily kWh
  topApplianceName?: string | null;
  language: string;
}

const PRESET_BUDGETS = [2500, 3500, 5000, 7500, 10000];

export const BudgetSentinelCard: React.FC<BudgetSentinelCardProps> = ({
  budgetTarget,
  onBudgetTargetChange,
  mtdCost,
  mtdKwh,
  forecastedBill,
  forecastedKwh,
  daysInActiveMonth,
  elapsedDays,
  remainingDays,
  effectiveBurnRate,
  topApplianceName,
  language,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudget, setTempBudget] = useState<string>(String(budgetTarget));

  // Handle setting a new target
  const handleSaveBudget = () => {
    const parsed = parseFloat(tempBudget);
    if (!isNaN(parsed) && parsed > 0) {
      onBudgetTargetChange(Math.round(parsed));
    } else {
      setTempBudget(String(budgetTarget));
    }
    setIsEditing(false);
  };

  const handleSelectPreset = (amount: number) => {
    setTempBudget(String(amount));
    onBudgetTargetChange(amount);
    setIsEditing(false);
  };

  // Status & Breach Math
  const isExceeded = budgetTarget > 0 && mtdCost >= budgetTarget;
  const isBreachRisk = budgetTarget > 0 && !isExceeded && forecastedBill > budgetTarget;
  const isOnTrack = budgetTarget > 0 && !isExceeded && !isBreachRisk;

  // Breach Day Projection
  let breachDay: number | null = null;
  if (isBreachRisk && remainingDays > 0) {
    const remainingToBreach = Math.max(0, budgetTarget - mtdCost);
    const remainingDailyCostBurn = (forecastedBill - mtdCost) / remainingDays;
    if (remainingDailyCostBurn > 0) {
      const daysToBreach = Math.ceil(remainingToBreach / remainingDailyCostBurn);
      breachDay = Math.min(daysInActiveMonth, elapsedDays + daysToBreach);
    }
  }

  // Safe Daily Allowance Math
  const remainingBudget = Math.max(0, budgetTarget - mtdCost);
  const safeDailyBudget = remainingDays > 0 ? remainingBudget / remainingDays : 0;
  const effectiveCostPerKwh = forecastedKwh > 0 ? forecastedBill / forecastedKwh : 14.8;
  const safeDailyKwh = effectiveCostPerKwh > 0 ? safeDailyBudget / effectiveCostPerKwh : 0;
  const dailyKwhCutNeeded = Math.max(0, effectiveBurnRate - safeDailyKwh);

  // Progress Bar Percentages (capped relative to budget target)
  const actualPct = budgetTarget > 0 ? Math.min(100, (mtdCost / budgetTarget) * 100) : 0;
  const totalForecastPct = budgetTarget > 0 ? (forecastedBill / budgetTarget) * 100 : 0;
  const projectedExtraPct = Math.max(0, Math.min(100 - actualPct, totalForecastPct - actualPct));
  const overBudgetPct = Math.max(0, totalForecastPct - 100);

  // Headroom or Overrun
  const budgetDelta = forecastedBill - budgetTarget;

  return (
    <SectionCard
      dataTour="forecasting-budget-sentinel"
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TargetIcon
            sx={{
              fontSize: 18,
              color: isExceeded
                ? "error.main"
                : isBreachRisk
                ? "warning.main"
                : "text.primary",
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
            {language === "tl"
              ? "Bantay sa Buwanang Badyet at Alerto sa Paglabis"
              : "Monthly Budget Sentinel & Breach Guard"}
          </Typography>
        </Box>
      }
      subtitle={
        language === "tl"
          ? "Magtakda ng target na limitasyon upang maiwasan ang sorpresang mataas na bill sa Meralco."
          : "Set a monthly target ceiling to monitor real-time burn rate and avoid unexpected bill surges."
      }
      headerActions={
        <Chip
          icon={
            isExceeded ? (
              <DangerIcon sx={{ fontSize: "14px !important" }} />
            ) : isBreachRisk ? (
              <WarningIcon sx={{ fontSize: "14px !important" }} />
            ) : (
              <CheckIcon sx={{ fontSize: "14px !important" }} />
            )
          }
          label={
            isExceeded
              ? language === "tl"
                ? `LUMAMPAS NA (+₱${Math.abs(budgetDelta).toFixed(2)})`
                : `BUDGET EXCEEDED (+₱${Math.abs(budgetDelta).toFixed(2)})`
              : isBreachRisk
              ? language === "tl"
                ? `PELIGRO SA ARAW ${breachDay || elapsedDays + 1} (+₱${Math.abs(budgetDelta).toFixed(2)})`
                : `BREACH RISK: DAY ${breachDay || elapsedDays + 1} (+₱${Math.abs(budgetDelta).toFixed(2)})`
              : language === "tl"
              ? `PASOK SA BADYET (-₱${Math.abs(budgetDelta).toFixed(2)})`
              : `ON TRACK (-₱${Math.abs(budgetDelta).toFixed(2)} Under)`
          }
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: "0.72rem",
            fontVariantNumeric: "tabular-nums",
            bgcolor: (theme) =>
              isExceeded
                ? theme.palette.mode === "dark" ? tokens.dark.errorBg : tokens.light.errorBg
                : isBreachRisk
                ? theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg
                : theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg,
            color: (theme) =>
              isExceeded
                ? theme.palette.mode === "dark" ? tokens.dark.error : tokens.light.error
                : isBreachRisk
                ? theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn
                : theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
            border: "1px solid",
            borderColor: (theme) =>
              isExceeded
                ? theme.palette.mode === "dark" ? tokens.dark.errorBorder : tokens.light.errorBorder
                : isBreachRisk
                ? theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder
                : theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder,
          }}
        />
      }
      sx={{
        border: "1px solid",
        borderColor: (theme) =>
          isExceeded
            ? theme.palette.mode === "dark" ? tokens.dark.errorBorder : tokens.light.errorBorder
            : isBreachRisk
            ? theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder
            : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
      }}
    >
      {/* 1. Target Budget Input & Presets */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          p: 1.75,
          mb: 2.5,
          borderRadius: 1,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" }}>
            {language === "tl" ? "Target na Badyet:" : "Target Monthly Budget:"}
          </Typography>
          {isEditing ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                size="small"
                type="number"
                value={tempBudget}
                onChange={(e) => setTempBudget(e.target.value)}
                autoFocus
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                  },
                }}
                sx={{ width: 140, "& input": { fontWeight: 700, fontVariantNumeric: "tabular-nums" } }}
              />
              <Button size="small" variant="contained" onClick={handleSaveBudget} sx={{ fontWeight: 600, borderRadius: 1, textTransform: "none" }}>
                {language === "tl" ? "Ilapat" : "Apply"}
              </Button>
            </Box>
          ) : (
            <Tooltip title={language === "tl" ? "I-click para palitan" : "Click to edit target budget"}>
              <Box
                onClick={() => setIsEditing(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
                  px: 1.25,
                  py: 0.35,
                  borderRadius: 0.75,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                  "&:hover": { bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover) },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
                  ₱{budgetTarget.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", ml: 0.5 }}>
                  ✎
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Preset Chips */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mr: 0.5 }}>
            {language === "tl" ? "Mga Karaniwan:" : "Quick Presets:"}
          </Typography>
          {PRESET_BUDGETS.map((amt) => (
            <Chip
              key={amt}
              size="small"
              label={`₱${amt.toLocaleString()}`}
              variant={budgetTarget === amt ? "filled" : "outlined"}
              onClick={() => handleSelectPreset(amt)}
              sx={{
                fontWeight: 600,
                fontSize: "0.72rem",
                fontVariantNumeric: "tabular-nums",
                cursor: "pointer",
                bgcolor: budgetTarget === amt ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active) : "transparent",
                borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* 2. Visual Multi-Segment Consumption Track */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            {language === "tl" ? "Konsumo Laban sa Badyet" : "Budget Consumption Progress"}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
            {totalForecastPct.toFixed(1)}% {language === "tl" ? "ng badyet" : "of budget"}
          </Typography>
        </Box>

        {/* Dual Bar Track */}
        <Box
          sx={{
            height: 10,
            width: "100%",
            borderRadius: 1,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
            position: "relative",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {/* MTD Actual (Solid) */}
          <Box
            sx={{
              width: `${Math.min(100, actualPct)}%`,
              height: "100%",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
              transition: "width 0.4s ease",
            }}
          />
          {/* Projected Remaining */}
          <Box
            sx={{
              width: `${Math.min(100 - actualPct, projectedExtraPct)}%`,
              height: "100%",
              bgcolor: (theme) =>
                isBreachRisk || isExceeded
                  ? theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn
                  : theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
              transition: "width 0.4s ease",
            }}
          />
          {/* Over Budget Spike */}
          {overBudgetPct > 0 && (
            <Box
              sx={{
                width: `${Math.min(100, overBudgetPct)}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.error : tokens.light.error),
              }}
            />
          )}
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary) }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                {language === "tl" ? "Naitalang MTD" : "MTD Actual"} (₱{mtdCost.toFixed(2)})
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: (theme) => isBreachRisk ? (theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn) : (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong) }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                {language === "tl" ? "Tinatayang Natitira" : "Projected Remaining"} (₱{Math.max(0, forecastedBill - mtdCost).toFixed(2)})
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "text.primary" }}>
            {language === "tl" ? "Limit:" : "Cap:"} ₱{budgetTarget.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* 3. Proactive Sentinel Guidance & Actionable Recommendations */}
      <Grid container spacing={2}>
        {/* Burn Rate vs Safe Allowance */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.03em" }}>
              {language === "tl" ? "Kasalukuyang Bilis ng Konsumo" : "Current Daily Burn Rate"}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", my: 0.5 }}>
              {effectiveBurnRate.toFixed(1)} kWh/d{" "}
              <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                (≈ ₱{(effectiveBurnRate * effectiveCostPerKwh).toFixed(2)}/day)
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              {language === "tl"
                ? `${elapsedDays} araw na lumipas, ${remainingDays} araw na natitira sa buwan.`
                : `${elapsedDays} days elapsed, ${remainingDays} days remaining in cycle.`}
            </Typography>
          </Box>
        </Grid>

        {/* Safe Allowance & Required Cut */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: (theme) =>
                isBreachRisk || isExceeded
                  ? theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg
                  : theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              border: "1px solid",
              borderColor: (theme) =>
                isBreachRisk || isExceeded
                  ? theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder
                  : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "0.7rem",
                letterSpacing: "0.03em",
                color: isBreachRisk || isExceeded ? "warning.main" : "text.secondary",
              }}
            >
              {language === "tl" ? "Ligtas na Alokasyon Araw-Araw" : "Safe Daily Allowance"}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: isBreachRisk || isExceeded ? "warning.main" : "text.primary",
                my: 0.5,
              }}
            >
              {safeDailyKwh.toFixed(1)} kWh/d{" "}
              <Typography component="span" variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                (≤ ₱{safeDailyBudget.toFixed(2)}/day)
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
              {isBreachRisk
                ? language === "tl"
                  ? `Bawasan ng ${dailyKwhCutNeeded.toFixed(1)} kWh/araw upang hindi lumagpas sa ₱${budgetTarget.toLocaleString()}.`
                  : `Reduce daily load by ${dailyKwhCutNeeded.toFixed(1)} kWh/d to stay within ₱${budgetTarget.toLocaleString()}.`
                : language === "tl"
                ? `Nasa ligtas na lebel ang iyong paggamit!`
                : `Your daily usage is well within your safe budget envelope!`}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Sentinel Actionable Advice Box */}
      {isBreachRisk && topApplianceName && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder),
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <TipsIcon sx={{ color: "warning.main", fontSize: 18, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: "text.primary", lineHeight: 1.5 }}>
            {language === "tl" ? (
              <>
                <strong>Payo ng Sentinel:</strong> Bawasan ng humigit-kumulang <strong>1 oras bawat araw</strong> ang paggamit ng{" "}
                <strong>{topApplianceName}</strong> sa natitirang mga araw upang maiwasan ang paglabis sa badyet sa Araw{" "}
                {breachDay || elapsedDays + 1}. Subukan ito sa What-If Studio sa ibaba!
              </>
            ) : (
              <>
                <strong>Sentinel Recommendation:</strong> Trimming <strong>{topApplianceName}</strong> by ~<strong>1 hr/day</strong> across
                the remaining {remainingDays} days recovers {dailyKwhCutNeeded.toFixed(1)} kWh/day and keeps your bill under the ₱
                {budgetTarget.toLocaleString()} target ceiling. Test this below in the What-If Studio!
              </>
            )}
          </Typography>
        </Box>
      )}
    </SectionCard>
  );
};

export default BudgetSentinelCard;
