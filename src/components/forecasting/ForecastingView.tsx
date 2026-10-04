import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import { Link } from "react-router-dom";
import {
  AutoGraph as AutoGraphIcon,
  Tune as TuneIcon,
  Bolt as BoltIcon,
  Security as ShieldIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  ElectricBolt as ElectricBoltIcon,
  RestartAlt as ResetIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList, DailyApplianceUsage, ApplianceUsageLog, SimulatedApplianceUsage } from "../../types";
import { useList } from "@refinedev/core";
import { useTheme } from "@mui/material/styles";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { calculateApplianceKwh, calculateCost, DEFAULT_EFFECTIVE_RATE, formatDateToKey } from "../../lib/dailyUsageService";
import { useLanguage } from "../../context/LanguageContext";
import { useBillingPeriod } from "../../context/BillingPeriodContext";
import { useToast } from "../common/ToastProvider";
import { saveSimulatedAppliance } from "../../lib/simulationService";
import { BudgetSentinelCard } from "./BudgetSentinelCard";
import { VirtualMeralcoBillCard } from "./VirtualMeralcoBillCard";
import { PageHeader } from "../common/PageHeader";
import { SectionCard } from "../common/SectionCard";
import { MetricCard } from "../common/MetricCard";
import { tokens } from "../../theme/tokens";

export const ForecastingView: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { t, language } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [whatIfHours, setWhatIfHours] = useState<Record<string, number>>({});
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Target Budget state per space (persisted in localStorage)
  const [budgetTarget, setBudgetTarget] = useState<number>(() => {
    const saved = localStorage.getItem(`powerforecast_budget_${selectedSpaceId}`);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 3500;
  });

  useEffect(() => {
    const saved = localStorage.getItem(`powerforecast_budget_${selectedSpaceId}`);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) {
        setBudgetTarget(parsed);
        return;
      }
    }
    setBudgetTarget(3500);
  }, [selectedSpaceId]);

  const handleBudgetTargetChange = (newTarget: number) => {
    setBudgetTarget(newTarget);
    localStorage.setItem(`powerforecast_budget_${selectedSpaceId}`, String(newTarget));
  };

  // 1. Fetch Real User Inventory, Spaces, Daily Usage Records, Simulated Schedules, and Telemetry
  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const usageLogsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { mode: "off" },
  }) as any;

  const simulatedUsageRes = useList<SimulatedApplianceUsage>({
    resource: "simulated_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  // Synchronize circuit toggles and simulation updates across views
  useEffect(() => {
    const handleUpdate = () => {
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
      if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleUpdate);
    window.addEventListener("powerforecast_simulation_updated", handleUpdate);
    return () => {
      window.removeEventListener("powerforecast_circuit_toggled", handleUpdate);
      window.removeEventListener("powerforecast_simulation_updated", handleUpdate);
    };
  }, [dailyUsageRes, simulatedUsageRes, appliancesRes]);

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const dailyRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const simulatedRecords: SimulatedApplianceUsage[] = simulatedUsageRes?.data?.data || simulatedUsageRes?.result?.data || [];

  // Live 1-second ticker for running stopwatches
  const [liveNow, setLiveNow] = useState<number>(Date.now());
  useEffect(() => {
    const hasRunning = appliances.some((a) => a.is_currently_on);
    if (!hasRunning) return;
    const interval = setInterval(() => setLiveNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [appliances]);

  // Filter target appliances based on space selection (excluding blacklisted / inactive appliances)
  const allSpaceAppliances = useMemo(() => {
    if (selectedSpaceId === "all") return appliances;
    return appliances.filter((a) => a.list_id === selectedSpaceId);
  }, [appliances, selectedSpaceId]);

  const targetAppliances = useMemo(() => {
    return allSpaceAppliances.filter((a) => a.is_active !== false);
  }, [allSpaceAppliances]);

  const blacklistedCount = useMemo(() => {
    return allSpaceAppliances.filter((a) => a.is_active === false).length;
  }, [allSpaceAppliances]);

  const targetApplianceIds = useMemo(() => {
    return new Set(targetAppliances.map((a) => a.id));
  }, [targetAppliances]);

  // Global Billing Period Context: Now (Active Cycle) vs Future (Next Billing Cycle)
  const {
    activeCycle,
    futureCycles,
    forecastingHorizon,
    setForecastingHorizon,
    getCycleTariff,
  } = useBillingPeriod();

  // Next cycle (Upcoming cycle after active cutoff)
  const nextCycle = useMemo(() => {
    return futureCycles.find((c) => c.status === "future") || futureCycles[1] || activeCycle;
  }, [futureCycles, activeCycle]);

  // Target cycle being projected based on selected horizon
  const targetCycle = useMemo(() => {
    if (forecastingHorizon === "next_cycle") {
      return nextCycle;
    }
    return activeCycle;
  }, [forecastingHorizon, nextCycle, activeCycle]);

  const targetTariff = useMemo(() => {
    return getCycleTariff(targetCycle);
  }, [getCycleTariff, targetCycle]);

  const now = new Date();
  const cycleDaysCount = targetCycle.days.length;
  const targetCycleStartKey = useMemo(() => formatDateToKey(targetCycle.startDate), [targetCycle]);
  const targetCycleEndKey = useMemo(() => formatDateToKey(targetCycle.endDate), [targetCycle]);

  // Active Billing Cycle Timeline Telemetry
  const elapsedDays = useMemo(() => {
    if (forecastingHorizon === "next_cycle") return 0;
    const diff = Math.ceil((now.getTime() - targetCycle.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(cycleDaysCount, Math.max(1, diff));
  }, [forecastingHorizon, now, targetCycle.startDate, cycleDaysCount]);

  const remainingDays = useMemo(() => {
    if (forecastingHorizon === "next_cycle") return cycleDaysCount;
    return Math.max(0, cycleDaysCount - elapsedDays);
  }, [forecastingHorizon, cycleDaysCount, elapsedDays]);

  const activeMonthName = targetCycle.label;

  // Active space tariff
  const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
  const tariffType: "residential" | "commercial" = activeSpace?.tariff_type || "residential";

  // 2. Month-To-Date (MTD) Actual Logged Telemetry (Within target cycle)
  const mtdActuals = useMemo(() => {
    let actualKwh = 0;
    let actualCost = 0;
    const loggedDatesSet = new Set<string>();

    dailyRecords.forEach((rec) => {
      if (rec.usage_date && rec.usage_date >= targetCycleStartKey && rec.usage_date <= targetCycleEndKey && targetApplianceIds.has(rec.appliance_id)) {
        actualKwh += Number(rec.kwh_consumed) || 0;
        actualCost += Number(rec.estimated_cost) || 0;
        if (Number(rec.hours_used) > 0) {
          loggedDatesSet.add(rec.usage_date);
        }
      }
    });

    // Factor in live currently running stopwatch sessions for Today (only in current active cycle)
    const isTodayInCycle = formatDateToKey(now) >= targetCycleStartKey && formatDateToKey(now) <= targetCycleEndKey;
    const runningTargetApps = isTodayInCycle ? targetAppliances.filter((a) => a.is_currently_on) : [];
    let liveSessionKwh = 0;
    let liveSessionCost = 0;

    runningTargetApps.forEach((curr) => {
      if (curr.last_turned_on_at) {
        const start = new Date(curr.last_turned_on_at).getTime();
        const diffSeconds = Math.max(0, (liveNow - start) / 1000);
        const totalWatts = curr.watts * (curr.quantity || 1);
        const kwh = (totalWatts / 1000) * (diffSeconds / 3600);
        const rate = curr.tariff_type === "commercial" ? 15.2 : targetTariff.totalEffectiveRate;
        liveSessionKwh += kwh;
        liveSessionCost += kwh * rate;
      }
    });

    if (runningTargetApps.length > 0) {
      const todayStr = formatDateToKey(now);
      loggedDatesSet.add(todayStr);
    }

    actualKwh += liveSessionKwh;
    actualCost += liveSessionCost;

    const loggedDaysCount = loggedDatesSet.size;
    const avgDailyLoggedKwh = loggedDaysCount > 0 ? actualKwh / loggedDaysCount : 0;

    return {
      actualKwh: Number(actualKwh.toFixed(3)),
      actualCost: Number(actualCost.toFixed(2)),
      loggedDaysCount,
      avgDailyLoggedKwh: Number(avgDailyLoggedKwh.toFixed(3)),
      hasLoggedRecords: actualKwh > 0 && forecastingHorizon === "now",
    };
  }, [dailyRecords, targetCycleStartKey, targetCycleEndKey, targetApplianceIds, targetAppliances, liveNow, now, targetTariff.totalEffectiveRate, forecastingHorizon]);

  // 3. Daily Routine Baseline from User's Registered Inventory
  const routineBaseline = useMemo(() => {
    let dailyKwh = 0;
    let dailyStandbyKwh = 0;

    targetAppliances.forEach((app) => {
      const hours = app.hours_per_day || 0;
      const qty = app.quantity || 1;
      const kwh = calculateApplianceKwh(app, hours);
      dailyKwh += kwh;

      // Standby / vampire load estimation for non-operating hours
      const standbyWatts = (app.ai_metadata?.standby_watts as number | undefined) ?? 2.5;
      const nonOperatingHours = Math.max(0, 24 - hours);
      dailyStandbyKwh += (standbyWatts * nonOperatingHours * qty) / 1000;
    });

    const monthlyBaselineKwh = Number((dailyKwh * cycleDaysCount).toFixed(3));
    const monthlyBaselineBill = calculateMeralcoBill(monthlyBaselineKwh, targetTariff.generationRate, 0, false, tariffType).totalBill;

    return {
      dailyKwh: Number(dailyKwh.toFixed(3)),
      dailyStandbyKwh: Number(dailyStandbyKwh.toFixed(3)),
      monthlyBaselineKwh,
      monthlyBaselineBill,
    };
  }, [targetAppliances, cycleDaysCount, targetTariff.generationRate, tariffType]);

  // Map simulated kWh per date for the target cycle
  const simulatedDateMap = useMemo(() => {
    const map = new Map<string, number>();
    simulatedRecords.forEach((rec) => {
      if (rec.usage_date && rec.usage_date >= targetCycleStartKey && rec.usage_date <= targetCycleEndKey && targetApplianceIds.has(rec.appliance_id)) {
        map.set(rec.usage_date, (map.get(rec.usage_date) || 0) + (Number(rec.kwh_consumed) || 0));
      }
    });
    return map;
  }, [simulatedRecords, targetCycleStartKey, targetCycleEndKey, targetApplianceIds]);

  // 4. End-of-Month Forecast (Actual Logged + Paced Run-Rate Extrapolation / Simulation Plan)
  // 4. End-of-Cycle Forecast (Actual Logged + Paced Run-Rate Extrapolation / Simulation Plan)
  const trajectoryForecast = useMemo(() => {
    let forecastedKwh = 0;
    let projectedRemainingKwh = 0;
    let simulatedDaysCount = 0;
    const unloggedDaysCount = Math.max(0, cycleDaysCount - mtdActuals.loggedDaysCount);

    const pacedDailyKwh = mtdActuals.avgDailyLoggedKwh > 0 ? mtdActuals.avgDailyLoggedKwh : routineBaseline.dailyKwh;

    if (forecastingHorizon === "now" && mtdActuals.hasLoggedRecords) {
      targetCycle.days.forEach((dayDate) => {
        const dateStr = formatDateToKey(dayDate);
        const isLogged = dailyRecords.some(
          (r) => r.usage_date === dateStr && targetApplianceIds.has(r.appliance_id) && (Number(r.hours_used) > 0 || Number(r.kwh_consumed) > 0)
        );
        if (!isLogged) {
          if (simulatedDateMap.has(dateStr)) {
            projectedRemainingKwh += simulatedDateMap.get(dateStr)!;
            simulatedDaysCount++;
          } else {
            projectedRemainingKwh += pacedDailyKwh;
          }
        }
      });
      forecastedKwh = Number((mtdActuals.actualKwh + projectedRemainingKwh).toFixed(3));
    } else {
      targetCycle.days.forEach((dayDate) => {
        const dateStr = formatDateToKey(dayDate);
        if (simulatedDateMap.has(dateStr)) {
          forecastedKwh += simulatedDateMap.get(dateStr)!;
          simulatedDaysCount++;
        } else {
          forecastedKwh += routineBaseline.dailyKwh;
        }
      });
      forecastedKwh = Number(forecastedKwh.toFixed(3));
      projectedRemainingKwh = forecastedKwh;
    }

    const multiplier = forecastingHorizon === "three_months" ? 3 : 1;
    const effectiveForecastKwh = Number((forecastedKwh * multiplier).toFixed(3));

    const forecastedBill = calculateMeralcoBill(effectiveForecastKwh, targetTariff.generationRate, 0, false, tariffType).totalBill;
    const effectiveBurnRate = cycleDaysCount > 0 ? effectiveForecastKwh / (cycleDaysCount * multiplier) : 0;

    return {
      forecastedKwh: effectiveForecastKwh,
      projectedRemainingKwh: Number((projectedRemainingKwh * multiplier).toFixed(3)),
      forecastedBill,
      unloggedDaysCount,
      simulatedDaysCount,
      effectiveBurnRate: Number(effectiveBurnRate.toFixed(3)),
      pacedDailyKwh: Number(pacedDailyKwh.toFixed(3)),
      hasActualPace: mtdActuals.hasLoggedRecords && forecastingHorizon === "now",
    };
  }, [
    forecastingHorizon,
    mtdActuals,
    targetCycle.days,
    cycleDaysCount,
    routineBaseline.dailyKwh,
    dailyRecords,
    targetApplianceIds,
    simulatedDateMap,
    targetTariff.generationRate,
    tariffType,
  ]);

  // Rate hike impact when looking at future cycle with the newly published tariff (₱9.70 vs ₱9.28)
  const rateHikeVariance = useMemo(() => {
    const genDelta = 9.7032 - 9.2826;
    return Number((trajectoryForecast.forecastedKwh * genDelta).toFixed(2));
  }, [trajectoryForecast.forecastedKwh]);

  // Identify top heavy energy hog appliance
  const topHeavyApplianceName = useMemo(() => {
    if (targetAppliances.length === 0) return null;
    const sorted = [...targetAppliances].sort((a, b) => {
      const aKwh = a.watts * (a.hours_per_day || 0) * (a.quantity || 1);
      const bKwh = b.watts * (b.hours_per_day || 0) * (b.quantity || 1);
      return bKwh - aKwh;
    });
    return sorted[0]?.name || null;
  }, [targetAppliances]);

  // 5. Interactive What-If Simulator Math
  const whatIfSimulation = useMemo(() => {
    let whatIfDailyKwh = 0;

    targetAppliances.forEach((app) => {
      const activeHours = whatIfHours[app.id] !== undefined ? whatIfHours[app.id] : (app.hours_per_day || 0);
      whatIfDailyKwh += calculateApplianceKwh(app, activeHours);
    });

    const daysMultiplier = mtdActuals.hasLoggedRecords ? remainingDays : cycleDaysCount;
    const simulatedRemainingKwh = whatIfDailyKwh * daysMultiplier;
    const whatIfTotalKwh = Number(((mtdActuals.hasLoggedRecords ? mtdActuals.actualKwh : 0) + simulatedRemainingKwh).toFixed(3));
    const whatIfBill = calculateMeralcoBill(whatIfTotalKwh, targetTariff.generationRate, 0, false, tariffType).totalBill;
    const billDelta = whatIfBill - trajectoryForecast.forecastedBill;

    return {
      whatIfTotalKwh,
      whatIfBill,
      billDelta,
    };
  }, [targetAppliances, whatIfHours, mtdActuals, remainingDays, cycleDaysCount, targetTariff.generationRate, tariffType, trajectoryForecast]);

  // 6. Appliance Pareto Breakdown (Ranked by Forecasted Energy Share)
  const paretoBreakdown = useMemo(() => {
    return targetAppliances
      .map((app) => {
        const hours = app.hours_per_day || 0;
        const monthlyKwh = calculateApplianceKwh(app, hours) * cycleDaysCount;
        const cost = calculateCost(monthlyKwh, DEFAULT_EFFECTIVE_RATE);
        const sharePercent = routineBaseline.monthlyBaselineKwh > 0 ? (monthlyKwh / routineBaseline.monthlyBaselineKwh) * 100 : 0;

        return {
          app,
          monthlyKwh: Number(monthlyKwh.toFixed(2)),
          cost: Number(cost.toFixed(2)),
          sharePercent: Math.min(100, Number(sharePercent.toFixed(1))),
        };
      })
      .sort((a, b) => b.monthlyKwh - a.monthlyKwh);
  }, [targetAppliances, cycleDaysCount, routineBaseline]);

  const handleResetWhatIf = () => {
    setWhatIfHours({});
  };

  const handleWhatIfHourChange = (appId: string, hours: number) => {
    setWhatIfHours((prev) => ({
      ...prev,
      [appId]: Math.max(0, Math.min(24, Number(hours.toFixed(1)))),
    }));
  };

  const handleSaveWhatIfToSimulationPlan = async () => {
    setIsSavingPlan(true);
    try {
      const remainingDates: string[] = [];
      const curKey = formatDateToKey(now);
      targetCycle.days.forEach((dayDate) => {
        const key = formatDateToKey(dayDate);
        if (key >= curKey) {
          remainingDates.push(key);
        }
      });
      const unbundledRate = calculateMeralcoBill(100, targetTariff.generationRate, 0, false, tariffType).effectiveRatePerKwh || 14.8;
      for (const [appId, hours] of Object.entries(whatIfHours)) {
        const app = targetAppliances.find((a) => a.id === appId);
        if (!app) continue;
        for (const dateStr of remainingDates) {
          await saveSimulatedAppliance({
            appliance_id: app.id,
            usage_date: dateStr,
            hours_used: hours,
            watts: app.watts,
            quantity: app.quantity || 1,
            user_id: app.user_id,
            effectiveRate: unbundledRate,
            source: "simulation_plan",
          });
        }
      }
      showSuccess(
        language === "tl"
          ? `Nailapat ang What-If plan sa Simulation Plan para sa natitirang ${remainingDates.length} araw!`
          : `Applied What-If plan to Simulation Plan across ${remainingDates.length} remaining days!`
      );
      if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
    } catch (err: any) {
      showError(
        language === "tl"
          ? `Bigo sa pag-save ng simulation plan: ${err.message || err}`
          : `Failed to save simulation plan: ${err.message || err}`
      );
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Header Banner */}
      <PageHeader
        title={t("fc.title", "Predictive Energy Forecasting")}
        subtitle={t("fc.subtitle", "Data-driven Meralco bill projections based on actual logged days and your registered appliance routines.")}
        actions={
          <Chip
            icon={<BoltIcon sx={{ fontSize: "14px !important" }} />}
            label={`Forecast Load: ${trajectoryForecast.forecastedKwh.toFixed(1)} kWh/mo`}
            size="small"
            sx={{
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
            }}
          />
        }
      />

      {/* Prediction Horizon Selector Bar (Now vs Future Horizons) */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 1.25,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", color: "text.secondary" }}>
            Prediction Horizon:
          </Typography>

          <Box sx={{ display: "inline-flex", gap: 0.75, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant={forecastingHorizon === "now" ? "contained" : "outlined"}
              onClick={() => setForecastingHorizon("now")}
              startIcon={<BoltIcon sx={{ fontSize: 15 }} />}
              sx={{
                borderRadius: 1,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: forecastingHorizon === "now"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary)
                  : "transparent",
                color: forecastingHorizon === "now"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg)
                  : "text.primary",
              }}
            >
              Now: Active Cutoff ({activeCycle.label})
            </Button>
            <Button
              size="small"
              variant={forecastingHorizon === "next_cycle" ? "contained" : "outlined"}
              onClick={() => setForecastingHorizon("next_cycle")}
              startIcon={<AutoGraphIcon sx={{ fontSize: 15 }} />}
              sx={{
                borderRadius: 1,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: forecastingHorizon === "next_cycle"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary)
                  : "transparent",
                color: forecastingHorizon === "next_cycle"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg)
                  : "text.primary",
              }}
            >
              Future: Next Cycle ({nextCycle.label})
            </Button>
            <Button
              size="small"
              variant={forecastingHorizon === "three_months" ? "contained" : "outlined"}
              onClick={() => setForecastingHorizon("three_months")}
              startIcon={<TimelineIcon sx={{ fontSize: 15 }} />}
              sx={{
                borderRadius: 1,
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "none",
                bgcolor: forecastingHorizon === "three_months"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary)
                  : "transparent",
                color: forecastingHorizon === "three_months"
                  ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg)
                  : "text.primary",
              }}
            >
              Future: 3-Month Horizon
            </Button>
          </Box>
        </Box>

        <Chip
          size="small"
          icon={<ElectricBoltIcon sx={{ fontSize: 13 }} />}
          label={`Applied Tariff: ${targetTariff.billingPeriod} (Gen: ₱${targetTariff.generationRate.toFixed(2)})`}
          sx={{
            fontWeight: 700,
            fontSize: "0.75rem",
            borderRadius: 0.75,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface),
            border: "1px solid",
            borderColor: "divider",
          }}
        />
      </Paper>

      {/* Meralco Rate Hike Impact Banner (When viewing future cycle with ₱9.70 tariff) */}
      {forecastingHorizon === "next_cycle" && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 1.25,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.05)"),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.2)"),
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <ScienceIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8125rem", color: "text.primary" }}>
                Next Cycle Rate Adjustment Applied: October 2026 Tariff (₱9.70 Gen Rate)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Meralco announced the new ₱9.70/kWh generation charge. In accordance with utility cutoff rules, it takes effect for the upcoming cycle ({nextCycle.label}).
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={`Rate Hike Variance: +₱${rateHikeVariance.toFixed(2)}`}
            sx={{
              fontWeight: 700,
              bgcolor: "#f59e0b",
              color: "#000",
            }}
          />
        </Paper>
      )}

      {/* 2. Space Selector Tabs (When spaces exist) */}
      {spaces.length > 0 && (
        <Paper
          elevation={0}
          data-tour="forecasting-space-tabs"
          sx={{
            p: 0.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
          }}
        >
          <Tabs
            value={selectedSpaceId}
            onChange={(_, val) => setSelectedSpaceId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                minHeight: 36,
                borderRadius: 0.75,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                px: 1.5,
                py: 0.5,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                "&.Mui-selected": {
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                },
              },
            }}
          >
            <Tab value="all" label={language === "tl" ? `Lahat ng Espasyo (${spaces.length})` : `All Spaces Combined (${spaces.length})`} />
            {spaces.map((s) => (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon sx={{ fontSize: 16 }} /> : <HomeIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label={`${s.name} (${s.tariff_type === "commercial" ? "Commercial GP" : "Residential"})`}
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* 3. Zero Active Appliances Empty State */}
      {targetAppliances.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 1,
            textAlign: "center",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {blacklistedCount > 0 ? (
            <BlockIcon sx={{ fontSize: 44, color: "warning.main", opacity: 0.9 }} />
          ) : (
            <ElectricBoltIcon sx={{ fontSize: 44, color: "text.secondary", opacity: 0.8 }} />
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {blacklistedCount > 0
              ? language === "tl"
                ? "Lahat ng Kagamitan ay Naka-Blacklist"
                : "All Appliances in this Space are Blacklisted"
              : language === "tl"
              ? "Walang Rehistradong Kagamitan"
              : "No Registered Appliances Found"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 460, fontSize: "0.85rem" }}>
            {blacklistedCount > 0
              ? language === "tl"
                ? `Kasalukuyang may ${blacklistedCount} kagamitan na naka-blacklist at hindi kasama sa kalkulasyon ng prediksyon. I-unblock ang mga ito sa Sentro ng Kagamitan upang makita ang forecast.`
                : `You currently have ${blacklistedCount} appliance(s) blacklisted and excluded from forecasting calculations. Restore them in the Appliances Hub to generate a forecast.`
              : language === "tl"
              ? "Magrehistro ng iyong mga kagamitan sa bahay o negosyo sa Sentro ng Kagamitan para magsimulang makatanggap ng data-driven na prediksyon sa bill."
              : "Register your household or business appliances in the Appliances Hub to start receiving real-time data-driven energy forecasts and Meralco bill projections."}
          </Typography>
          <Button
            component={Link}
            to="/appliances"
            variant="contained"
            color={blacklistedCount > 0 ? "warning" : "primary"}
            startIcon={blacklistedCount > 0 ? <BlockIcon sx={{ fontSize: 16 }} /> : <BoltIcon sx={{ fontSize: 16 }} />}
            sx={{
              borderRadius: 1,
              fontWeight: 600,
              px: 2.5,
              py: 0.75,
              mt: 1,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary),
              color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg),
              boxShadow: "none",
            }}
          >
            {language === "tl" ? "Pumunta sa Sentro ng Kagamitan" : "Go to Appliances Hub"}
          </Button>
        </Paper>
      ) : (
        <>
          {/* Blacklisted Appliances Exclusion Notice Banner */}
          {blacklistedCount > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <BlockIcon sx={{ color: "warning.main", fontSize: 20 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    {blacklistedCount} appliance{blacklistedCount > 1 ? "s are" : " is"} currently blacklisted
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Excluded from routine baseline, energy hog ranking, what-if simulations, and month-end projected bill calculations.
                  </Typography>
                </Box>
              </Box>
              <Button
                component={Link}
                to="/appliances"
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 600, borderRadius: 1 }}
              >
                Manage in Appliances Hub
              </Button>
            </Paper>
          )}

          {/* 4. Active Billing Cycle Run-Rate Telemetry Banner */}
          <SectionCard
            dataTour="forecasting-hero-kpi"
            title={t("fc.activeCycleTitle", "Active Billing Cycle Run-Rate Telemetry")}
            subtitle="Cycle progression, recorded actuals, and projected trajectory"
            infoTooltip="Tracks actual energy consumed so far in the active billing month and projects remaining days forward based on your measured daily burn rate."
            headerActions={
              <Chip
                label={`${mtdActuals.loggedDaysCount} Days In • ${remainingDays} Days Left`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.72rem",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary),
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                }}
              />
            }
          >
            <Grid container spacing={2}>
              {/* MTD Actual */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                    {language === "tl" ? "Naitalang MTD" : "Recorded MTD Actual"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "text.primary",
                      my: 0.5,
                    }}
                  >
                    {mtdActuals.actualKwh.toFixed(1)} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {mtdActuals.loggedDaysCount} {language === "tl" ? "araw na may log" : "days logged"} (₱{mtdActuals.actualCost.toFixed(2)})
                  </Typography>
                </Box>
              </Grid>

              {/* Projected Remaining */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                    {language === "tl" ? "Tinatayang Natitira" : "Projected Remaining"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "text.primary",
                      my: 0.5,
                    }}
                  >
                    {trajectoryForecast.projectedRemainingKwh.toFixed(1)} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {remainingDays} {language === "tl" ? "natitirang araw sa cycle" : "days remaining"}
                    {trajectoryForecast.hasActualPace
                      ? ` • ${trajectoryForecast.pacedDailyKwh} kWh/d pace`
                      : trajectoryForecast.simulatedDaysCount > 0
                      ? ` (${trajectoryForecast.simulatedDaysCount} ${language === "tl" ? "naka-plano sa simulasyon" : "planned in simulation"})`
                      : ""}
                  </Typography>
                </Box>
              </Grid>

              {/* Composite Forecast */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {language === "tl" ? "Paced Prediksyon sa Bill" : "Paced Forecasted Bill"}
                    </Typography>
                    {trajectoryForecast.hasActualPace && (
                      <Chip
                        label="Run-Rate Paced"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg),
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder),
                          color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live),
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "text.primary",
                      my: 0.5,
                    }}
                  >
                    ₱{trajectoryForecast.forecastedBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {trajectoryForecast.forecastedKwh.toFixed(1)} kWh total ({trajectoryForecast.effectiveBurnRate} kWh/d)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </SectionCard>

          {/* 5. NEW: Monthly Budget Sentinel & Breach Guard */}
          <Box data-tour="forecasting-budget-sentinel">
            <BudgetSentinelCard
              budgetTarget={budgetTarget}
              onBudgetTargetChange={handleBudgetTargetChange}
              mtdCost={mtdActuals.actualCost}
              mtdKwh={mtdActuals.actualKwh}
              forecastedBill={trajectoryForecast.forecastedBill}
              forecastedKwh={trajectoryForecast.forecastedKwh}
              daysInActiveMonth={cycleDaysCount}
              elapsedDays={elapsedDays}
              remainingDays={remainingDays}
              effectiveBurnRate={trajectoryForecast.effectiveBurnRate}
              topApplianceName={topHeavyApplianceName}
              language={language}
            />
          </Box>

          {/* 6. NEW: Projected Meralco Statement Breakdown ("Virtual Bill") */}
          <Box data-tour="forecasting-virtual-bill">
            <VirtualMeralcoBillCard
              forecastedKwh={trajectoryForecast.forecastedKwh}
              tariffType={tariffType}
              activeMonthName={activeMonthName}
              language={language}
              genRate={targetTariff.generationRate}
              tariffLabel={targetTariff.billingPeriod}
              billingPeriodLabel={targetCycle.label}
            />
          </Box>

          {/* 7. Interactive What-If Appliance Runtime Studio */}
          <SectionCard
            dataTour="forecasting-whatif-studio"
            title={t("fc.whatIfTitle", 'Interactive "What-If" Appliance Studio')}
            subtitle={t("fc.whatIfSubtitle", "Adjust operating hours on individual appliances to simulate instant month-end bill impacts")}
            infoTooltip="Allows you to simulate adjusting daily runtime hours for individual appliances. Instantly calculates month-end bill impacts (savings or cost additions) and tests whether adjustments meet your target budget."
            headerActions={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {Object.keys(whatIfHours).length > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={isSavingPlan}
                    startIcon={<ScienceIcon sx={{ fontSize: 14 }} />}
                    onClick={handleSaveWhatIfToSimulationPlan}
                    sx={{
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary),
                      color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg),
                      boxShadow: "none",
                    }}
                  >
                    {isSavingPlan
                      ? language === "tl" ? "Sini-save..." : "Saving..."
                      : language === "tl" ? "Ilapat sa Simulation Plan" : "Apply to Plan"}
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ResetIcon sx={{ fontSize: 14 }} />}
                  onClick={handleResetWhatIf}
                  sx={{
                    borderRadius: 1,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                  }}
                >
                  {t("fc.resetDefaults", "Reset Defaults")}
                </Button>

                {/* Impact vs Baseline */}
                <Chip
                  label={
                    whatIfSimulation.billDelta === 0
                      ? "Neutral (₱0.00)"
                      : whatIfSimulation.billDelta < 0
                      ? `${language === "tl" ? "Makakatipid ng" : "Saves"} ₱${Math.abs(whatIfSimulation.billDelta).toFixed(2)}/mo`
                      : `+₱${whatIfSimulation.billDelta.toFixed(2)}/mo ${language === "tl" ? "Dagdag" : "Increase"}`
                  }
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.72rem",
                    fontVariantNumeric: "tabular-nums",
                    bgcolor: (theme) =>
                      whatIfSimulation.billDelta < 0
                        ? theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg
                        : whatIfSimulation.billDelta > 0
                        ? theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg
                        : theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    color: (theme) =>
                      whatIfSimulation.billDelta < 0
                        ? theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live
                        : whatIfSimulation.billDelta > 0
                        ? theme.palette.mode === "dark" ? tokens.dark.warn : tokens.light.warn
                        : "text.secondary",
                    border: "1px solid",
                    borderColor: (theme) =>
                      whatIfSimulation.billDelta < 0
                        ? theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder
                        : whatIfSimulation.billDelta > 0
                        ? theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder
                        : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                />

                {/* Impact vs Target Budget */}
                {budgetTarget > 0 && (
                  <Chip
                    label={
                      whatIfSimulation.whatIfBill <= budgetTarget
                        ? language === "tl"
                          ? `Pasok sa Badyet (-₱${(budgetTarget - whatIfSimulation.whatIfBill).toFixed(2)})`
                          : `Meets Budget (-₱${(budgetTarget - whatIfSimulation.whatIfBill).toFixed(2)})`
                        : language === "tl"
                        ? `Higit sa Badyet (+₱${(whatIfSimulation.whatIfBill - budgetTarget).toFixed(2)})`
                        : `Over Budget (+₱${(whatIfSimulation.whatIfBill - budgetTarget).toFixed(2)})`
                    }
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      fontVariantNumeric: "tabular-nums",
                      bgcolor: (theme) =>
                        whatIfSimulation.whatIfBill <= budgetTarget
                          ? theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg
                          : theme.palette.mode === "dark" ? tokens.dark.errorBg : tokens.light.errorBg,
                      color: (theme) =>
                        whatIfSimulation.whatIfBill <= budgetTarget
                          ? theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live
                          : theme.palette.mode === "dark" ? tokens.dark.error : tokens.light.error,
                      border: "1px solid",
                      borderColor: (theme) =>
                        whatIfSimulation.whatIfBill <= budgetTarget
                          ? theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder
                          : theme.palette.mode === "dark" ? tokens.dark.errorBorder : tokens.light.errorBorder,
                    }}
                  />
                )}
              </Box>
            }
          >
            <Grid container spacing={2}>
              {targetAppliances.map((app) => {
                const currentHours = whatIfHours[app.id] !== undefined ? whatIfHours[app.id] : (app.hours_per_day || 0);
                const defaultHours = app.hours_per_day || 0;
                const isModified = whatIfHours[app.id] !== undefined && whatIfHours[app.id] !== defaultHours;

                return (
                  <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        border: "1px solid",
                        borderColor: (theme) =>
                          isModified
                            ? theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong
                            : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                            {app.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {app.category} • {app.watts}W {app.room_location ? `(${app.room_location})` : ""}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${currentHours.toFixed(1)}h/day`}
                          size="small"
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.72rem",
                            fontVariantNumeric: "tabular-nums",
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface),
                            border: "1px solid",
                            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                          }}
                        />
                      </Box>

                      <Slider
                        value={currentHours}
                        min={0}
                        max={24}
                        step={0.5}
                        onChange={(_, val) => handleWhatIfHourChange(app.id, val as number)}
                        sx={{
                          my: 0.5,
                          color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
                          "& .MuiSlider-thumb": {
                            width: 14,
                            height: 14,
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
                          },
                          "& .MuiSlider-track": {
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
                          },
                          "& .MuiSlider-rail": {
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                          },
                        }}
                      />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </SectionCard>

          {/* 8. Appliance Pareto Energy Contribution Breakdown */}
          <SectionCard
            title={t("fc.paretoTitle", "Appliance Monthly Energy Share (Pareto Breakdown)")}
            subtitle={t("fc.paretoSubtitle", "Ranked breakdown of which registered devices contribute the highest share of your monthly power consumption.")}
            infoTooltip="Ranks your registered appliances from heaviest to lightest energy consumer to highlight which devices are driving your electric bill."
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {paretoBreakdown.map(({ app, monthlyKwh, cost, sharePercent }, idx) => (
                <Box
                  key={app.id}
                  sx={{
                    p: 1.75,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 0.75,
                          bgcolor: (theme) =>
                            idx === 0
                              ? theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary
                              : theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                          color: (theme) =>
                            idx === 0
                              ? theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg
                              : "text.secondary",
                          border: "1px solid",
                          borderColor: (theme) =>
                            idx === 0
                              ? "transparent"
                              : theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {app.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {app.category} • {app.watts}W • {app.hours_per_day || 0}h/day routine
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: "text.primary",
                        }}
                      >
                        ₱{cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {monthlyKwh.toFixed(1)} kWh ({sharePercent}%)
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={sharePercent}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          idx === 0
                            ? theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live
                            : theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </SectionCard>

          {/* 9. Advisory Insights Box */}
          <SectionCard
            title="ERC & Meralco Monthly Tariff Advisory"
            infoTooltip="Regulatory guidance explaining that Meralco's generation charge is a pass-through cost adjusted monthly according to fuel prices (coal, natural gas) and WESM wholesale spot market rates."
          >
            <Box
              data-tour="forecasting-advisory"
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                  color: "text.primary",
                  flexShrink: 0,
                  display: "flex",
                }}
              >
                <ShieldIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "text.primary" }}>
                  ERC & Meralco Monthly Tariff Pass-Through Advisory
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block", lineHeight: 1.6 }}>
                  In the Philippines, the generation charge is an automatic pass-through cost adjusted every billing cycle based on fuel costs (coal, natural gas) and WESM spot market rates. Meralco distributes electricity but does not profit from the generation charge. During hot dry months, higher grid demand pushes generation rates upward.
                </Typography>
              </Box>
            </Box>
          </SectionCard>
        </>
      )}
    </Box>
  );
};

export default ForecastingView;
