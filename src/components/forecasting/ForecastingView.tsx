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
import { calculateApplianceKwh, calculateCost, DEFAULT_EFFECTIVE_RATE } from "../../lib/dailyUsageService";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../common/ToastProvider";
import { saveSimulatedAppliance } from "../../lib/simulationService";
import { BudgetSentinelCard } from "./BudgetSentinelCard";
import { VirtualMeralcoBillCard } from "./VirtualMeralcoBillCard";

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

  // Active Billing Cycle Timeline Telemetry (e.g. Current Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthStr = String(currentMonthIdx + 1).padStart(2, "0");
  const activeMonthKey = `${currentYear}-${currentMonthStr}`;
  const daysInActiveMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const elapsedDays = Math.min(now.getDate(), daysInActiveMonth);
  const remainingDays = Math.max(0, daysInActiveMonth - elapsedDays);

  const activeMonthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Active space tariff
  const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
  const tariffType: "residential" | "commercial" = activeSpace?.tariff_type || "residential";

  // 2. Month-To-Date (MTD) Actual Logged Telemetry
  const mtdActuals = useMemo(() => {
    let actualKwh = 0;
    let actualCost = 0;
    const loggedDatesSet = new Set<string>();

    dailyRecords.forEach((rec) => {
      if (rec.usage_date && rec.usage_date.startsWith(activeMonthKey) && targetApplianceIds.has(rec.appliance_id)) {
        actualKwh += Number(rec.kwh_consumed) || 0;
        actualCost += Number(rec.estimated_cost) || 0;
        if (Number(rec.hours_used) > 0) {
          loggedDatesSet.add(rec.usage_date);
        }
      }
    });

    // Factor in live currently running stopwatch sessions for Today
    const runningTargetApps = targetAppliances.filter((a) => a.is_currently_on);
    let liveSessionKwh = 0;
    let liveSessionCost = 0;

    runningTargetApps.forEach((curr) => {
      if (curr.last_turned_on_at) {
        const start = new Date(curr.last_turned_on_at).getTime();
        const diffSeconds = Math.max(0, (liveNow - start) / 1000);
        const totalWatts = curr.watts * (curr.quantity || 1);
        const kwh = (totalWatts / 1000) * (diffSeconds / 3600);
        const rate = curr.tariff_type === "commercial" ? 15.2 : 14.8261;
        liveSessionKwh += kwh;
        liveSessionCost += kwh * rate;
      }
    });

    if (runningTargetApps.length > 0) {
      const todayStr = `${activeMonthKey}-${String(now.getDate()).padStart(2, "0")}`;
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
      hasLoggedRecords: actualKwh > 0,
    };
  }, [dailyRecords, activeMonthKey, targetApplianceIds, targetAppliances, liveNow, now]);

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

    const monthlyBaselineKwh = Number((dailyKwh * daysInActiveMonth).toFixed(3));
    const monthlyBaselineBill = calculateMeralcoBill(monthlyBaselineKwh, undefined, 0, false, tariffType).totalBill;

    return {
      dailyKwh: Number(dailyKwh.toFixed(3)),
      dailyStandbyKwh: Number(dailyStandbyKwh.toFixed(3)),
      monthlyBaselineKwh,
      monthlyBaselineBill,
    };
  }, [targetAppliances, daysInActiveMonth, tariffType]);

  // Map simulated kWh per date for the active month
  const simulatedDateMap = useMemo(() => {
    const map = new Map<string, number>();
    simulatedRecords.forEach((rec) => {
      if (rec.usage_date && rec.usage_date.startsWith(activeMonthKey) && targetApplianceIds.has(rec.appliance_id)) {
        map.set(rec.usage_date, (map.get(rec.usage_date) || 0) + (Number(rec.kwh_consumed) || 0));
      }
    });
    return map;
  }, [simulatedRecords, activeMonthKey, targetApplianceIds]);

  // 4. Composite End-of-Month Forecast (Actual Logged + Simulation Plan / Remaining Routine Days)
  const trajectoryForecast = useMemo(() => {
    let forecastedKwh = 0;
    let projectedRemainingKwh = 0;
    let simulatedDaysCount = 0;
    const unloggedDaysCount = Math.max(0, daysInActiveMonth - mtdActuals.loggedDaysCount);

    if (mtdActuals.hasLoggedRecords) {
      for (let d = 1; d <= daysInActiveMonth; d++) {
        const dateStr = `${activeMonthKey}-${String(d).padStart(2, "0")}`;
        const isLogged = dailyRecords.some(
          (r) => r.usage_date === dateStr && targetApplianceIds.has(r.appliance_id) && (Number(r.hours_used) > 0 || Number(r.kwh_consumed) > 0)
        );
        if (!isLogged) {
          if (simulatedDateMap.has(dateStr)) {
            projectedRemainingKwh += simulatedDateMap.get(dateStr)!;
            simulatedDaysCount++;
          } else {
            projectedRemainingKwh += routineBaseline.dailyKwh;
          }
        }
      }
      forecastedKwh = Number((mtdActuals.actualKwh + projectedRemainingKwh).toFixed(3));
    } else {
      for (let d = 1; d <= daysInActiveMonth; d++) {
        const dateStr = `${activeMonthKey}-${String(d).padStart(2, "0")}`;
        if (simulatedDateMap.has(dateStr)) {
          forecastedKwh += simulatedDateMap.get(dateStr)!;
          simulatedDaysCount++;
        } else {
          forecastedKwh += routineBaseline.dailyKwh;
        }
      }
      forecastedKwh = Number(forecastedKwh.toFixed(3));
      projectedRemainingKwh = forecastedKwh;
    }

    const forecastedBill = calculateMeralcoBill(forecastedKwh, undefined, 0, false, tariffType).totalBill;
    const effectiveBurnRate = daysInActiveMonth > 0 ? forecastedKwh / daysInActiveMonth : 0;

    return {
      forecastedKwh,
      projectedRemainingKwh: Number(projectedRemainingKwh.toFixed(3)),
      forecastedBill,
      unloggedDaysCount,
      simulatedDaysCount,
      effectiveBurnRate: Number(effectiveBurnRate.toFixed(3)),
    };
  }, [mtdActuals, routineBaseline, daysInActiveMonth, tariffType, activeMonthKey, dailyRecords, targetApplianceIds, simulatedDateMap]);

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

    const daysMultiplier = mtdActuals.hasLoggedRecords ? remainingDays : daysInActiveMonth;
    const simulatedRemainingKwh = whatIfDailyKwh * daysMultiplier;
    const whatIfTotalKwh = Number(((mtdActuals.hasLoggedRecords ? mtdActuals.actualKwh : 0) + simulatedRemainingKwh).toFixed(3));
    const whatIfBill = calculateMeralcoBill(whatIfTotalKwh, undefined, 0, false, tariffType).totalBill;
    const billDelta = whatIfBill - trajectoryForecast.forecastedBill;

    return {
      whatIfTotalKwh,
      whatIfBill,
      billDelta,
    };
  }, [targetAppliances, whatIfHours, mtdActuals, remainingDays, daysInActiveMonth, tariffType, trajectoryForecast]);

  // 6. Appliance Pareto Breakdown (Ranked by Forecasted Energy Share)
  const paretoBreakdown = useMemo(() => {
    return targetAppliances
      .map((app) => {
        const hours = app.hours_per_day || 0;
        const monthlyKwh = calculateApplianceKwh(app, hours) * daysInActiveMonth;
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
  }, [targetAppliances, daysInActiveMonth, routineBaseline]);

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
      const startDay = now.getDate();
      for (let d = startDay; d <= daysInActiveMonth; d++) {
        remainingDates.push(`${activeMonthKey}-${String(d).padStart(2, "0")}`);
      }
      const unbundledRate = calculateMeralcoBill(100, undefined, 0, false, tariffType).effectiveRatePerKwh || 14.8;
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
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
            <AutoGraphIcon sx={{ color: "primary.main" }} />
            {t("fc.title", "Predictive Energy Forecasting")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("fc.subtitle", "Data-driven Meralco bill projections based on actual logged days and your registered appliance routines.")}
          </Typography>
        </Box>
        <Chip
          icon={<BoltIcon sx={{ fontSize: "16px !important", color: "#00e5c9 !important" }} />}
          label={`Forecast Load: ${trajectoryForecast.forecastedKwh.toFixed(1)} kWh/mo`}
          variant="outlined"
          sx={{ fontWeight: 700, borderColor: "rgba(0, 229, 201, 0.4)", bgcolor: "rgba(0, 229, 201, 0.08)", color: "#00e5c9" }}
        />
      </Box>

      {/* 2. Space Selector Tabs (When spaces exist) */}
      {spaces.length > 0 && (
        <Box data-tour="forecasting-space-tabs">
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.05em" }}>
            FORECAST SCOPE / TARGET SPACE
          </Typography>
          <Tabs
            value={selectedSpaceId}
            onChange={(_, val) => setSelectedSpaceId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                borderRadius: 1,
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                mr: 1,
              },
            }}
          >
            <Tab value="all" label={language === "tl" ? `Lahat ng Espasyo (${spaces.length})` : `All Spaces Combined (${spaces.length})`} />
            {spaces.map((s) => (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={`${s.name} (${s.tariff_type === "commercial" ? "Commercial GP" : "Residential"})`}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* 3. Zero Active Appliances Empty State */}
      {targetAppliances.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 1.5,
            textAlign: "center",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "background.paper"),
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {blacklistedCount > 0 ? (
            <BlockIcon sx={{ fontSize: 52, color: "warning.main", opacity: 0.9 }} />
          ) : (
            <ElectricBoltIcon sx={{ fontSize: 52, color: "primary.light", opacity: 0.8 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {blacklistedCount > 0
              ? language === "tl"
                ? "Lahat ng Kagamitan ay Naka-Blacklist"
                : "All Appliances in this Space are Blacklisted"
              : language === "tl"
              ? "Walang Rehistradong Kagamitan"
              : "No Registered Appliances Found"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 460 }}>
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
            startIcon={blacklistedCount > 0 ? <BlockIcon /> : <BoltIcon />}
            sx={{ borderRadius: 1, fontWeight: 800, px: 3, py: 1, mt: 1 }}
          >
            {language === "tl" ? "Pumunta sa Sentro ng Kagamitan" : "Go to Appliances Hub"}
          </Button>
        </Paper>
      ) : (
        <>
          {/* Blacklisted Appliances Exclusion Notice Banner */}
          {blacklistedCount > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                mb: 2.5,
                borderRadius: 1.5,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.06)"),
                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)"),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <BlockIcon sx={{ color: "warning.main", fontSize: 22 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
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
                sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
              >
                Manage in Appliances Hub
              </Button>
            </Paper>
          )}

          {/* 4. Active Billing Cycle Run-Rate Telemetry Banner */}
          <Card
            data-tour="forecasting-hero-kpi"
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "#e2e8f0",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.78)" : "#ffffff",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TimelineIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {t("fc.activeCycleTitle", "Active Billing Cycle Run-Rate Telemetry")}
                </Typography>
              </Box>
              <Chip
                label={`${mtdActuals.loggedDaysCount} Days In • ${remainingDays} Days Left`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                  color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e"),
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                }}
              />
            </Box>

            <Grid container spacing={2}>
              {/* MTD Actual */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {language === "tl" ? "NAITALANG MTD" : "RECORDED MTD ACTUAL"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                      my: 0.5,
                    }}
                  >
                    {mtdActuals.actualKwh.toFixed(1)} <Typography component="span" variant="caption">kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {mtdActuals.loggedDaysCount} {language === "tl" ? "araw na may log" : "days logged"} (₱{mtdActuals.actualCost.toFixed(2)})
                  </Typography>
                </Paper>
              </Grid>

              {/* Projected Remaining */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {language === "tl" ? "TINATAYANG NATITIRA" : "PROJECTED REMAINING"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                      my: 0.5,
                    }}
                  >
                    {trajectoryForecast.projectedRemainingKwh.toFixed(1)} <Typography component="span" variant="caption">kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {remainingDays} {language === "tl" ? "natitirang araw sa cycle" : "days remaining"}
                    {trajectoryForecast.simulatedDaysCount > 0
                      ? ` (${trajectoryForecast.simulatedDaysCount} ${language === "tl" ? "naka-plano sa simulasyon" : "planned in simulation"})`
                      : ""}
                  </Typography>
                </Paper>
              </Grid>

              {/* Composite Forecast */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                      fontWeight: 800,
                    }}
                  >
                    {language === "tl" ? "KABUUANG PREDIKSYON SA BILL" : "COMPOSITE FORECASTED BILL"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                      my: 0.5,
                    }}
                  >
                    ₱{trajectoryForecast.forecastedBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {trajectoryForecast.forecastedKwh.toFixed(1)} kWh {language === "tl" ? "kabuuang buwan" : "month total"} ({trajectoryForecast.effectiveBurnRate} kWh/d)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Card>

          {/* 5. NEW: Monthly Budget Sentinel & Breach Guard */}
          <BudgetSentinelCard
            budgetTarget={budgetTarget}
            onBudgetTargetChange={handleBudgetTargetChange}
            mtdCost={mtdActuals.actualCost}
            mtdKwh={mtdActuals.actualKwh}
            forecastedBill={trajectoryForecast.forecastedBill}
            forecastedKwh={trajectoryForecast.forecastedKwh}
            daysInActiveMonth={daysInActiveMonth}
            elapsedDays={elapsedDays}
            remainingDays={remainingDays}
            effectiveBurnRate={trajectoryForecast.effectiveBurnRate}
            topApplianceName={topHeavyApplianceName}
            language={language}
          />

          {/* 6. NEW: Projected Meralco Statement Breakdown ("Virtual Bill") */}
          <VirtualMeralcoBillCard
            forecastedKwh={trajectoryForecast.forecastedKwh}
            tariffType={tariffType}
            activeMonthName={activeMonthName}
            language={language}
          />

          {/* 7. Interactive What-If Appliance Runtime Studio */}
          <Card
            data-tour="forecasting-whatif-studio"
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff"),
              boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1 }}>
                  <TuneIcon sx={{ color: "primary.main" }} />
                  {t("fc.whatIfTitle", 'Interactive "What-If" Appliance Studio')}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("fc.whatIfSubtitle", "Adjust operating hours on individual appliances to simulate instant month-end bill impacts")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {Object.keys(whatIfHours).length > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={isSavingPlan}
                    startIcon={<ScienceIcon sx={{ fontSize: 16 }} />}
                    onClick={handleSaveWhatIfToSimulationPlan}
                    sx={{ borderRadius: 1, fontSize: "0.75rem", fontWeight: 700 }}
                  >
                    {isSavingPlan
                      ? language === "tl" ? "Sini-save..." : "Saving..."
                      : language === "tl" ? "Ilapat sa Simulation Plan" : "Apply to Simulation Plan"}
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ResetIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResetWhatIf}
                  sx={{ borderRadius: 1, fontSize: "0.75rem", fontWeight: 700 }}
                >
                  {t("fc.resetDefaults", "Reset Defaults")}
                </Button>

                {/* Impact vs Baseline */}
                <Chip
                  label={
                    whatIfSimulation.billDelta === 0
                      ? language === "tl" ? "Neutral (₱0.00)" : "Neutral (₱0.00)"
                      : whatIfSimulation.billDelta < 0
                      ? `${language === "tl" ? "Makakatipid ng" : "Saves"} ₱${Math.abs(whatIfSimulation.billDelta).toFixed(2)}/mo`
                      : `+₱${whatIfSimulation.billDelta.toFixed(2)}/mo ${language === "tl" ? "Dagdag" : "Increase"}`
                  }
                  color={whatIfSimulation.billDelta < 0 ? "success" : whatIfSimulation.billDelta > 0 ? "warning" : "default"}
                  sx={{ fontWeight: 800, fontSize: "0.78rem" }}
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
                    color={whatIfSimulation.whatIfBill <= budgetTarget ? "success" : "error"}
                    variant="outlined"
                    sx={{ fontWeight: 800, fontSize: "0.75rem" }}
                  />
                )}
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2}>
              {targetAppliances.map((app) => {
                const currentHours = whatIfHours[app.id] !== undefined ? whatIfHours[app.id] : (app.hours_per_day || 0);
                const defaultHours = app.hours_per_day || 0;
                const isModified = whatIfHours[app.id] !== undefined && whatIfHours[app.id] !== defaultHours;

                return (
                  <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        bgcolor: isModified ? "rgba(0, 229, 201, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        borderColor: isModified ? "primary.main" : "rgba(255, 255, 255, 0.08)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography noWrap variant="body2" sx={{ fontWeight: 800 }}>
                            {app.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {app.category} • {app.watts}W {app.room_location ? `(${app.room_location})` : ""}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${currentHours.toFixed(1)}h/day`}
                          size="small"
                          color={isModified ? "primary" : "default"}
                          variant={isModified ? "filled" : "outlined"}
                          sx={{ fontWeight: 800, fontSize: "0.75rem", fontFamily: "monospace" }}
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
                          "& .MuiSlider-thumb": { width: 16, height: 16 },
                        }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>

          {/* 8. Appliance Pareto Energy Contribution Breakdown */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.65)" : "#ffffff",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
              {t("fc.paretoTitle", "Appliance Monthly Energy Share (Pareto Breakdown)")}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {t("fc.paretoSubtitle", "Ranked breakdown of which registered devices contribute the highest share of your monthly power consumption.")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {paretoBreakdown.map(({ app, monthlyKwh, cost, sharePercent }, idx) => (
                <Paper
                  key={app.id}
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          bgcolor: (theme) =>
                            idx < 3
                              ? theme.palette.mode === "dark"
                                ? "primary.main"
                                : "#0d9488"
                              : theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.1)"
                              : "#e2e8f0",
                          color: (theme) =>
                            idx < 3
                              ? "#ffffff"
                              : theme.palette.mode === "dark"
                              ? "#ffffff"
                              : "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 900,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
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
                          fontWeight: 900,
                          fontFamily: "monospace",
                          color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                        }}
                      >
                        ₱{cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
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
                        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 1,
                        bgcolor: idx === 0 ? "#ef4444" : idx === 1 ? "#f59e0b" : "primary.main",
                      },
                    }}
                  />
                </Paper>
              ))}
            </Box>
          </Card>

          {/* 9. Advisory Insights Box */}
          <Paper
            data-tour="forecasting-advisory"
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2.5,
            }}
          >
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(0, 229, 201, 0.15)", color: "primary.main", flexShrink: 0 }}>
              <ShieldIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                ERC & Meralco Monthly Tariff Pass-Through Advisory
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block", lineHeight: 1.6 }}>
                In the Philippines, the generation charge is an automatic pass-through cost adjusted every billing cycle based on fuel costs (coal, natural gas) and WESM spot market rates. Meralco distributes electricity but does not profit from the generation charge. During hot dry months, higher grid demand pushes generation rates upward.
              </Typography>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ForecastingView;
