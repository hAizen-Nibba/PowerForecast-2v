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
    <Card
      data-tour="forecasting-budget-sentinel"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: (theme) =>
          isExceeded
            ? theme.palette.mode === "dark"
              ? "rgba(239, 68, 68, 0.4)"
              : "rgba(239, 68, 68, 0.3)"
            : isBreachRisk
            ? theme.palette.mode === "dark"
              ? "rgba(245, 158, 11, 0.4)"
              : "rgba(245, 158, 11, 0.3)"
            : theme.palette.mode === "dark"
            ? "rgba(16, 185, 129, 0.35)"
            : "rgba(16, 185, 129, 0.3)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? isExceeded
              ? "rgba(35, 18, 20, 0.75)"
              : isBreachRisk
              ? "rgba(35, 27, 18, 0.75)"
              : "rgba(18, 32, 28, 0.75)"
            : isExceeded
            ? "rgba(254, 242, 242, 0.85)"
            : isBreachRisk
            ? "rgba(255, 251, 235, 0.85)"
            : "rgba(240, 253, 244, 0.85)",
        boxShadow: (theme) =>
          theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
      }}
    >
      {/* 1. Header Bar: Title, Presets, and Status Chip */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TargetIcon
              sx={{
                color: isExceeded
                  ? "error.main"
                  : isBreachRisk
                  ? "warning.main"
                  : "success.main",
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl"
                ? "Bantay sa Buwanang Badyet at Alerto sa Paglabis"
                : "Monthly Budget Sentinel & Breach Guard"}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {language === "tl"
              ? "Magtakda ng target na limitasyon upang maiwasan ang sorpresang mataas na bill sa Meralco."
              : "Set a monthly target ceiling to monitor real-time burn rate and avoid unexpected bill surges."}
          </Typography>
        </Box>

        {/* Status Chip */}
        <Chip
          icon={
            isExceeded ? (
              <DangerIcon sx={{ fontSize: "16px !important" }} />
            ) : isBreachRisk ? (
              <WarningIcon sx={{ fontSize: "16px !important" }} />
            ) : (
              <CheckIcon sx={{ fontSize: "16px !important" }} />
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
          color={isExceeded ? "error" : isBreachRisk ? "warning" : "success"}
          sx={{ fontWeight: 800, fontSize: "0.75rem", height: 28, px: 0.5 }}
        />
      </Box>

      {/* 2. Target Budget Input & Presets */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          p: 2,
          mb: 2.5,
          borderRadius: 1.25,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.8)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary", whiteSpace: "nowrap" }}>
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
                sx={{ width: 140, "& input": { fontWeight: 800, fontFamily: "monospace" } }}
              />
              <Button size="small" variant="contained" color="primary" onClick={handleSaveBudget} sx={{ fontWeight: 700 }}>
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
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
                  border: "1px dashed",
                  borderColor: "primary.main",
                  "&:hover": { bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.1)" : "#e2e8f0") },
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
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
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, mr: 0.5 }}>
            {language === "tl" ? "Mga Karaniwan:" : "Quick Presets:"}
          </Typography>
          {PRESET_BUDGETS.map((amt) => (
            <Chip
              key={amt}
              size="small"
              label={`₱${amt.toLocaleString()}`}
              variant={budgetTarget === amt ? "filled" : "outlined"}
              color={budgetTarget === amt ? "primary" : "default"}
              onClick={() => handleSelectPreset(amt)}
              sx={{ fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}
            />
          ))}
        </Stack>
      </Box>

      {/* 3. Visual Multi-Segment Consumption Track */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            {language === "tl" ? "Konsumo Laban sa Badyet" : "Budget Consumption Progress"}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "text.primary" }}>
            {totalForecastPct.toFixed(1)}% {language === "tl" ? "ng badyet" : "of budget"}
          </Typography>
        </Box>

        {/* Dual Bar Track */}
        <Box
          sx={{
            height: 12,
            width: "100%",
            borderRadius: 1.5,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"),
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
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
              transition: "width 0.4s ease",
            }}
          />
          {/* Projected Remaining (Tinted / Patterned) */}
          <Box
            sx={{
              width: `${Math.min(100 - actualPct, projectedExtraPct)}%`,
              height: "100%",
              bgcolor: isBreachRisk || isExceeded ? "#f59e0b" : "#10b981",
              opacity: 0.65,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.25) 6px, rgba(255,255,255,0.25) 12px)",
              transition: "width 0.4s ease",
            }}
          />
          {/* Over Budget Spike */}
          {overBudgetPct > 0 && (
            <Box
              sx={{
                width: `${Math.min(100, overBudgetPct)}%`,
                height: "100%",
                bgcolor: "#ef4444",
                opacity: 0.9,
              }}
            />
          )}
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, flexWrap: "wrap", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "primary.main" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {language === "tl" ? "Naitalang MTD" : "MTD Actual"} (₱{mtdCost.toFixed(2)})
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: isBreachRisk ? "#f59e0b" : "#10b981", opacity: 0.7 }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {language === "tl" ? "Tinatayang Natitira" : "Projected Remaining"} (₱{Math.max(0, forecastedBill - mtdCost).toFixed(2)})
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "text.primary" }}>
            {language === "tl" ? "Limit:" : "Cap:"} ₱{budgetTarget.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* 4. Proactive Sentinel Guidance & Actionable Recommendations */}
      <Grid container spacing={2}>
        {/* Burn Rate vs Safe Allowance */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 1.75,
              borderRadius: 1.25,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc"),
              border: "1px solid",
              borderColor: "divider",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              {language === "tl" ? "KASALUKUYANG BILIS NG KONSUMO" : "CURRENT DAILY BURN RATE"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", my: 0.5 }}>
              {effectiveBurnRate.toFixed(1)} kWh/d{" "}
              <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                (≈ ₱{(effectiveBurnRate * effectiveCostPerKwh).toFixed(2)}/day)
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
              p: 1.75,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                isBreachRisk || isExceeded
                  ? theme.palette.mode === "dark"
                    ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(245, 158, 11, 0.06)"
                  : theme.palette.mode === "dark"
                  ? "rgba(16, 185, 129, 0.08)"
                  : "rgba(16, 185, 129, 0.06)",
              border: "1px solid",
              borderColor: (theme) =>
                isBreachRisk || isExceeded
                  ? theme.palette.mode === "dark"
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(245, 158, 11, 0.25)"
                  : theme.palette.mode === "dark"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(16, 185, 129, 0.25)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: isBreachRisk || isExceeded ? "warning.main" : "success.main",
              }}
            >
              {language === "tl" ? "LIGTAS NA ALOKASYON ARAW-ARAW" : "SAFE DAILY ALLOWANCE"}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                fontFamily: "monospace",
                color: isBreachRisk || isExceeded ? "warning.main" : "success.main",
                my: 0.5,
              }}
            >
              {safeDailyKwh.toFixed(1)} kWh/d{" "}
              <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>
                (≤ ₱{safeDailyBudget.toFixed(2)}/day)
              </Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
            borderRadius: 1.25,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.06)" : "#fffbeb"),
            border: "1px dashed",
            borderColor: "warning.main",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <TipsIcon sx={{ color: "warning.main", fontSize: 20, flexShrink: 0 }} />
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
    </Card>
  );
};

export default BudgetSentinelCard;
