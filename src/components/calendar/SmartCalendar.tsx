import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Bolt as BoltIcon,
  Savings as SavingsIcon,
  DateRange as DateRangeIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { PageHeader } from "../common/PageHeader";
import { SectionCard } from "../common/SectionCard";
import { MetricCard } from "../common/MetricCard";
import { tokens } from "../../theme/tokens";
import {
  UserCalendarEvent,
  UserAppliance,
  DailyApplianceUsage,
  SimulatedApplianceUsage,
  ApplianceList,
  ApplianceUsageLog,
  BillingPeriodConfig,
} from "../../types";
import { useList } from "@refinedev/core";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import { SimulatedDayModal } from "./SimulatedDayModal";
import { SimulateApplianceModal } from "./SimulateApplianceModal";
import { BillingPeriodModal } from "./BillingPeriodModal";
import {
  formatDateToKey,
  computeActualDayMetrics,
  computeSimulatedDayMetrics,
  DEFAULT_EFFECTIVE_RATE,
  calculateApplianceKwh,
  getStoredBillingPeriodConfig,
  setStoredBillingPeriodConfig,
  resolveBillingPeriodWindow,
} from "../../lib/dailyUsageService";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { useRoom } from "../../context/RoomContext";

export const SmartCalendar: React.FC = () => {
  const { canEdit, isViewer } = useRoom();
  // Calendar Tab: Actual Tracker vs Simulation Plan
  const [calendarTab, setCalendarTab] = useState<"actual" | "simulation">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("powerforecast_calendar_tab") as "actual" | "simulation") || "actual";
    }
    return "actual";
  });

  const handleTabChange = (newTab: "actual" | "simulation") => {
    setCalendarTab(newTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("powerforecast_calendar_tab", newTab);
    }
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedMobileDate, setSelectedMobileDate] = useState<Date>(() => new Date());
  const [selectedDateForActualModal, setSelectedDateForActualModal] = useState<Date | null>(null);
  const [selectedDateForSimModal, setSelectedDateForSimModal] = useState<Date | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");

  // Billing Period state & config modal
  const [billingConfig, setBillingConfig] = useState<BillingPeriodConfig>(getStoredBillingPeriodConfig());
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Simulate Appliance modal state
  const [isSimulateApplianceOpen, setIsSimulateApplianceOpen] = useState(false);

  // Queries
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

  const simulatedUsageRes = useList<SimulatedApplianceUsage>({
    resource: "simulated_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { mode: "off" },
  }) as any;

  const allAppliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const dailyUsageList: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const simulatedUsageList: SimulatedApplianceUsage[] = simulatedUsageRes?.data?.data || simulatedUsageRes?.result?.data || [];
  const usageLogs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Filter appliances by selected space
  const appliances = useMemo(() => {
    const spaceFiltered = selectedSpaceId === "all" ? allAppliances : allAppliances.filter((a) => a.list_id === selectedSpaceId);
    return spaceFiltered.filter((a) => a.is_active !== false);
  }, [allAppliances, selectedSpaceId]);

  // Group actual daily usage by dateKey
  const dailyUsageMap = useMemo(() => {
    const map: Record<string, DailyApplianceUsage[]> = {};
    dailyUsageList.forEach((item) => {
      if (!map[item.usage_date]) {
        map[item.usage_date] = [];
      }
      map[item.usage_date].push(item);
    });
    return map;
  }, [dailyUsageList]);

  // Group simulated daily usage by dateKey
  const simulatedUsageMap = useMemo(() => {
    const map: Record<string, SimulatedApplianceUsage[]> = {};
    simulatedUsageList.forEach((item) => {
      if (!map[item.usage_date]) {
        map[item.usage_date] = [];
      }
      map[item.usage_date].push(item);
    });
    return map;
  }, [simulatedUsageList]);

  // Resolve custom billing window
  const billingWindow = useMemo(() => {
    return resolveBillingPeriodWindow(currentDate, billingConfig);
  }, [currentDate, billingConfig]);

  const handleSaveBillingConfig = (newConfig: BillingPeriodConfig) => {
    setBillingConfig(newConfig);
    setStoredBillingPeriodConfig(newConfig);
    setIsBillingModalOpen(false);
  };

  const handlePrevPeriod = () => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() - 1);
    setCurrentDate(nextDate);
  };

  const handleNextPeriod = () => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    setCurrentDate(nextDate);
  };

  const realToday = new Date();
  const realTodayKey = formatDateToKey(realToday);

  // Dynamically resolve tiered effective rate based on total monthly projected load for rate parity with Forecasting
  const calendarEffectiveRate = useMemo(() => {
    const totalBaselineKwh = appliances.reduce(
      (acc, a) => acc + calculateApplianceKwh(a, Number(a.hours_per_day) || 0),
      0
    ) * (billingWindow.days.length || 30);
    if (totalBaselineKwh <= 0) return DEFAULT_EFFECTIVE_RATE;
    const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
    const tariff = activeSpace?.tariff_type || "residential";
    const billRes = calculateMeralcoBill(totalBaselineKwh, undefined, 0, false, tariff);
    return billRes.effectiveRatePerKwh || DEFAULT_EFFECTIVE_RATE;
  }, [appliances, billingWindow.days.length, selectedSpaceId, spaces]);

  // Period Summaries
  const actualPeriodSummary = useMemo(() => {
    let totCost = 0;
    let totKwh = 0;
    let loggedDays = 0;

    billingWindow.days.forEach((dayDate) => {
      const dKey = formatDateToKey(dayDate);
      const metrics = computeActualDayMetrics(dKey, dailyUsageMap[dKey] || [], appliances, calendarEffectiveRate);
      if (metrics.isLogged) {
        totCost += metrics.cost;
        totKwh += metrics.kwh;
        loggedDays++;
      }
    });

    const runningCount = appliances.filter((a) => a.is_currently_on).length;

    return {
      actualCost: Number(totCost.toFixed(2)),
      actualKwh: Number(totKwh.toFixed(2)),
      loggedDaysCount: loggedDays,
      runningCircuitsCount: runningCount,
      totalDays: billingWindow.days.length,
    };
  }, [billingWindow.days, dailyUsageMap, appliances, calendarEffectiveRate]);

  const simPeriodSummary = useMemo(() => {
    let baseCost = 0;
    let baseKwh = 0;
    let simCost = 0;
    let simKwh = 0;
    let customSimCount = 0;

    billingWindow.days.forEach((dayDate) => {
      const dKey = formatDateToKey(dayDate);
      const metrics = computeSimulatedDayMetrics(dKey, dayDate, simulatedUsageMap[dKey] || [], appliances, calendarEffectiveRate);
      baseCost += metrics.baselineCost;
      baseKwh += metrics.baselineKwh;
      simCost += metrics.cost;
      simKwh += metrics.kwh;
      if (metrics.isCustomSimulated) customSimCount++;
    });

    const savings = baseCost - simCost;
    const savingsPct = baseCost > 0 ? ((savings / baseCost) * 100).toFixed(1) : "0.0";

    return {
      baselinePeriodCost: Number(baseCost.toFixed(2)),
      baselinePeriodKwh: Number(baseKwh.toFixed(2)),
      simulatedPeriodCost: Number(simCost.toFixed(2)),
      simulatedPeriodKwh: Number(simKwh.toFixed(2)),
      periodSavings: Number(savings.toFixed(2)),
      periodSavingsPct: savingsPct,
      simulatedDaysCount: customSimCount,
      totalDays: billingWindow.days.length,
    };
  }, [billingWindow.days, simulatedUsageMap, appliances, calendarEffectiveRate]);

  // Mobile selected day metrics
  const selectedMobileDateKey = formatDateToKey(selectedMobileDate);

  const mobileSelectedActualMetrics = useMemo(() => {
    return computeActualDayMetrics(
      selectedMobileDateKey,
      dailyUsageMap[selectedMobileDateKey] || [],
      appliances,
      calendarEffectiveRate
    );
  }, [selectedMobileDateKey, dailyUsageMap, appliances, calendarEffectiveRate]);

  const mobileSelectedSimMetrics = useMemo(() => {
    return computeSimulatedDayMetrics(
      selectedMobileDateKey,
      selectedMobileDate,
      simulatedUsageMap[selectedMobileDateKey] || [],
      appliances,
      calendarEffectiveRate
    );
  }, [selectedMobileDateKey, selectedMobileDate, simulatedUsageMap, appliances, calendarEffectiveRate]);

  // Calendar Grid Setup
  const firstDayOfPeriod = billingWindow.days[0];
  const firstDayIndex = firstDayOfPeriod.getDay();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* 1. Header with Mode Toggle & Actions */}
      <PageHeader
        title="Smart Energy Calendar"
        subtitle={
          calendarTab === "actual"
            ? "Actual Tracker: Verified stopwatch sessions, real-time circuit switches, and authentic measured telemetry."
            : "Simulation Plan: Design what-if schedules, test appliance runtimes, and forecast Meralco monthly quotas."
        }
        badge={
          <Chip
            size="small"
            label={calendarTab === "actual" ? "Live Tracker" : "What-If Simulator"}
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              bgcolor: (theme) =>
                calendarTab === "actual"
                  ? theme.palette.mode === "dark"
                    ? tokens.dark.liveBg
                    : tokens.light.liveBg
                  : theme.palette.mode === "dark"
                  ? tokens.dark.surfaceSubtle
                  : tokens.light.surfaceSubtle,
              color: (theme) =>
                calendarTab === "actual"
                  ? theme.palette.mode === "dark"
                    ? tokens.dark.live
                    : tokens.light.live
                  : theme.palette.mode === "dark"
                  ? tokens.dark.textSecondary
                  : tokens.light.textSecondary,
              border: "1px solid",
              borderColor: (theme) =>
                calendarTab === "actual"
                  ? theme.palette.mode === "dark"
                    ? tokens.dark.liveBorder
                    : tokens.light.liveBorder
                  : theme.palette.mode === "dark"
                  ? tokens.dark.borderSubtle
                  : tokens.light.borderSubtle,
            }}
          />
        }
        actions={
          <>
            {/* Top Segmented Navigation Tab */}
            <Box
              sx={{
                display: "inline-flex",
                width: { xs: "100%", sm: "auto" },
                p: "3px",
                borderRadius: 1,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              }}
            >
              <Button
                size="small"
                onClick={() => handleTabChange("actual")}
                startIcon={<TimerIcon sx={{ fontSize: 15 }} />}
                sx={{
                  flex: { xs: 1, sm: "none" },
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.5,
                  py: 0.5,
                  textTransform: "none",
                  bgcolor:
                    calendarTab === "actual"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    calendarTab === "actual"
                      ? (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary
                      : "text.secondary",
                  boxShadow: calendarTab === "actual" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                Actual Tracker
              </Button>
              <Button
                size="small"
                onClick={() => handleTabChange("simulation")}
                startIcon={<ScienceIcon sx={{ fontSize: 15 }} />}
                sx={{
                  flex: { xs: 1, sm: "none" },
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.5,
                  py: 0.5,
                  textTransform: "none",
                  bgcolor:
                    calendarTab === "simulation"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    calendarTab === "simulation"
                      ? (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary
                      : "text.secondary",
                  boxShadow: calendarTab === "simulation" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                Simulation Plan
              </Button>
            </Box>

            {/* Billing Period Selector */}
            <Button
              variant="outlined"
              size="small"
              data-tour="calendar-billing-period"
              startIcon={<DateRangeIcon sx={{ fontSize: 15 }} />}
              onClick={() => setIsBillingModalOpen(true)}
              sx={{
                flex: { xs: calendarTab === "simulation" ? 1 : "1 1 100%", sm: "none" },
                borderRadius: 1,
                fontWeight: 600,
                fontSize: "0.75rem",
                textTransform: "none",
                px: 1.5,
                py: 0.6,
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                "&:hover": {
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                },
              }}
            >
              {billingConfig.mode === "recurring_cycle"
                ? `Cycle (Day ${billingConfig.cycleStartDay})`
                : billingConfig.mode === "custom_range"
                ? "Custom Range"
                : "Monthly Period"}
            </Button>

            {/* Simulate Appliance Button (Visible in Simulation Tab) */}
            {calendarTab === "simulation" && (
              <Tooltip title={!canEdit ? "View-only members cannot create simulation schedules" : ""}>
                <span style={{ display: "inline-flex", flex: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={<ScienceIcon sx={{ fontSize: 15 }} />}
                    disabled={!canEdit}
                    onClick={() => setIsSimulateApplianceOpen(true)}
                    sx={{
                      borderRadius: 1,
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "none",
                      px: 1.75,
                      py: 0.6,
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary),
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
                    Simulate Appliance
                  </Button>
                </span>
              </Tooltip>
            )}
          </>
        }
      />

      {/* 2. Space Switcher Bento Pill Bar */}
      {spaces.length > 1 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { height: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
              borderRadius: 2,
            },
          }}
        >
          <Button
            size="small"
            onClick={() => setSelectedSpaceId("all")}
            startIcon={<StoreIcon sx={{ fontSize: 14 }} />}
            sx={{
              px: 1.5,
              py: 0.4,
              borderRadius: 1,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "none",
              border: "1px solid",
              borderColor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return selectedSpaceId === "all"
                  ? isDark ? tokens.dark.borderStrong : tokens.light.borderStrong
                  : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
              },
              bgcolor: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return selectedSpaceId === "all"
                  ? isDark ? tokens.dark.active : tokens.light.active
                  : "transparent";
              },
              color: (theme) => {
                const isDark = theme.palette.mode === "dark";
                return selectedSpaceId === "all"
                  ? isDark ? tokens.dark.textPrimary : tokens.light.textPrimary
                  : isDark ? tokens.dark.textSecondary : tokens.light.textSecondary;
              },
              "&:hover": {
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
              },
            }}
          >
            All Spaces ({allAppliances.length})
          </Button>

          {spaces.map((space) => {
            const count = allAppliances.filter((a) => a.list_id === space.id).length;
            const isSelected = selectedSpaceId === space.id;
            return (
              <Button
                key={space.id}
                size="small"
                onClick={() => setSelectedSpaceId(space.id)}
                startIcon={
                  space.tariff_type === "commercial" ? (
                    <StoreIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <HomeIcon sx={{ fontSize: 14 }} />
                  )
                }
                sx={{
                  px: 1.5,
                  py: 0.4,
                  borderRadius: 1,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                  border: "1px solid",
                  borderColor: (theme) => {
                    const isDark = theme.palette.mode === "dark";
                    return isSelected
                      ? isDark ? tokens.dark.borderStrong : tokens.light.borderStrong
                      : isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                  },
                  bgcolor: (theme) => {
                    const isDark = theme.palette.mode === "dark";
                    return isSelected
                      ? isDark ? tokens.dark.active : tokens.light.active
                      : "transparent";
                  },
                  color: (theme) => {
                    const isDark = theme.palette.mode === "dark";
                    return isSelected
                      ? isDark ? tokens.dark.textPrimary : tokens.light.textPrimary
                      : isDark ? tokens.dark.textSecondary : tokens.light.textSecondary;
                  },
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                {space.name} ({count})
              </Button>
            );
          })}
        </Box>
      )}

      {/* 3. Top KPI Cards */}
      {calendarTab === "actual" ? (
        <Grid container spacing={{ xs: 1.5, sm: 2 }} data-tour="calendar-kpi-summary">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="ACTUAL SPEND TO DATE"
              value={`₱${actualPeriodSummary.actualCost.toFixed(2)}`}
              subtitle="Verified measured sessions"
              icon={<TimelineIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="MEASURED ENERGY"
              value={`${actualPeriodSummary.actualKwh} kWh`}
              subtitle={`Across ${actualPeriodSummary.loggedDaysCount} logged day(s)`}
              icon={<BoltIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="CIRCUITS STATUS"
              value={actualPeriodSummary.runningCircuitsCount > 0 ? `${actualPeriodSummary.runningCircuitsCount} Active` : "All Idle"}
              subtitle="Real-time active load"
              liveDot={actualPeriodSummary.runningCircuitsCount > 0}
              icon={<TimerIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="TIMEFRAME DAYS"
              value={`${actualPeriodSummary.loggedDaysCount} / ${actualPeriodSummary.totalDays}`}
              subtitle="Days with verified records"
              icon={<DateRangeIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={{ xs: 1.5, sm: 2 }} data-tour="calendar-kpi-summary">
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="BASELINE QUOTA"
              value={`~₱${simPeriodSummary.baselinePeriodCost.toFixed(2)}`}
              subtitle={`Routine defaults (${simPeriodSummary.baselinePeriodKwh} kWh)`}
              icon={<SavingsIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="SIMULATED PERIOD BILL"
              value={`₱${simPeriodSummary.simulatedPeriodCost.toFixed(2)}`}
              subtitle={`With tailored schedules (${simPeriodSummary.simulatedPeriodKwh} kWh)`}
              icon={<ScienceIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="SIMULATED SAVINGS"
              value={
                simPeriodSummary.periodSavings >= 0
                  ? `Saves ₱${simPeriodSummary.periodSavings.toFixed(2)}`
                  : `+₱${Math.abs(simPeriodSummary.periodSavings).toFixed(2)}`
              }
              subtitle={`${simPeriodSummary.periodSavingsPct}% delta vs baseline`}
              icon={<FlameIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title="CUSTOM PLAN COVERAGE"
              value={`${simPeriodSummary.simulatedDaysCount} / ${simPeriodSummary.totalDays}`}
              subtitle="Days with tailored plans"
              icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            />
          </Grid>
        </Grid>
      )}

      {/* 4. Calendar Controls Navigator & Month Grid */}
      <SectionCard
        dataTour="calendar-grid"
        title={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <IconButton
                onClick={handlePrevPeriod}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  borderRadius: 1,
                  p: 0.5,
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={handleNextPeriod}
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  borderRadius: 1,
                  p: 0.5,
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  letterSpacing: "-0.01em",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                }}
              >
                {billingWindow.label}
              </Typography>
              {billingWindow.subLabel && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontSize: "0.6875rem",
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                  }}
                >
                  {billingWindow.subLabel}
                </Typography>
              )}
            </Box>
          </Box>
        }
        headerActions={
          <Box data-tour="calendar-legend" sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 2 }}>
            {calendarTab === "actual" ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                  }}
                >
                  Logged Sessions
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.zinc[500] : tokens.zinc[400],
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.75rem" }}>
                    Routine Quota
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.75rem" }}>
                    Custom Plan
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        }
      >
        {/* Mobile Compact Legend */}
        <Box sx={{ display: { xs: "flex", sm: "none" }, alignItems: "center", justifyContent: "center", gap: 2, mb: 1.25 }}>
          {calendarTab === "actual" ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", fontWeight: 500 }}>
                Logged Sessions
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.zinc[500] : tokens.zinc[400],
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", fontWeight: 500 }}>
                  Routine
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", fontWeight: 500 }}>
                  Custom Plan
                </Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Days of week header */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }} sx={{ mb: 1 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Grid size={1} key={day} sx={{ textAlign: "center", py: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                  textTransform: "uppercase",
                  fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                  letterSpacing: "0.03em",
                }}
              >
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  {day.charAt(0)}
                </Box>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  {day}
                </Box>
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Days grid */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }}>
          {/* Empty spacer cells */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <Grid size={1} key={`empty-${idx}`}>
              <Box sx={{ minHeight: { xs: 44, sm: 94 }, opacity: 0.15 }} />
            </Grid>
          ))}

          {/* Actual day cells */}
          {billingWindow.days.map((dayDate, idx) => {
            const dayNum = dayDate.getDate();
            const dateKey = formatDateToKey(dayDate);
            const isCurrentToday = dateKey === realTodayKey;
            const isFuture = dateKey > realTodayKey;
            const isSelectedOnMobile = dateKey === selectedMobileDateKey;

            // In Actual Tracker tab
            if (calendarTab === "actual") {
              const actualMetrics = computeActualDayMetrics(
                dateKey,
                dailyUsageMap[dateKey] || [],
                appliances,
                calendarEffectiveRate
              );

              return (
                <Grid size={1} key={`actual-${dateKey}-${idx}`}>
                  <Paper
                    variant="outlined"
                    data-tour={idx === 0 ? "calendar-day-click" : undefined}
                    onClick={() => {
                      setSelectedMobileDate(dayDate);
                      if (typeof window !== "undefined" && window.innerWidth >= 600) {
                        if (!isFuture) {
                          setSelectedDateForActualModal(dayDate);
                        }
                      }
                    }}
                    sx={{
                      minHeight: { xs: 44, sm: 94 },
                      p: { xs: 0.5, sm: 1 },
                      borderRadius: 1,
                      cursor: isFuture ? "not-allowed" : "pointer",
                      opacity: isFuture ? 0.4 : 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: { xs: "center", sm: "space-between" },
                      alignItems: { xs: "center", sm: "stretch" },
                      position: "relative",
                      bgcolor: (theme) => {
                        const isDark = theme.palette.mode === "dark";
                        if (isSelectedOnMobile) {
                          return isDark ? "rgba(0, 229, 201, 0.12)" : "rgba(0, 229, 201, 0.08)";
                        }
                        if (isCurrentToday) {
                          return isDark ? tokens.dark.liveBg : tokens.light.liveBg;
                        }
                        if (actualMetrics.isLogged) {
                          return isDark ? tokens.dark.surface : tokens.light.surface;
                        }
                        return "transparent";
                      },
                      borderStyle: "solid",
                      borderColor: (theme) => {
                        const isDark = theme.palette.mode === "dark";
                        if (isSelectedOnMobile) {
                          return isDark ? tokens.dark.primary : tokens.light.primary;
                        }
                        if (isCurrentToday) {
                          return isDark ? tokens.dark.liveBorder : tokens.light.liveBorder;
                        }
                        if (actualMetrics.isLogged) {
                          return isDark ? tokens.dark.borderStrong : tokens.light.borderStrong;
                        }
                        return isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                      },
                      borderWidth: isSelectedOnMobile ? { xs: "1.5px", sm: "1px" } : "1px",
                      transition: "background-color 0.15s ease, border-color 0.15s ease",
                      "&:hover": {
                        borderColor: (theme) => {
                          const isDark = theme.palette.mode === "dark";
                          if (isFuture) {
                            return isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                          }
                          if (isCurrentToday) {
                            return isDark ? tokens.dark.live : tokens.light.live;
                          }
                          return isDark ? tokens.dark.borderStrong : tokens.light.borderStrong;
                        },
                        bgcolor: (theme) => {
                          const isDark = theme.palette.mode === "dark";
                          if (isFuture) {
                            return "transparent";
                          }
                          if (isCurrentToday) {
                            return isDark ? "rgba(52, 211, 153, 0.16)" : "rgba(5, 150, 105, 0.16)";
                          }
                          return isDark ? tokens.dark.hover : tokens.light.hover;
                        },
                      },
                    }}
                  >
                    {/* MOBILE DISPLAY (xs): Clean Date Number + Micro Indicator Dot */}
                    <Box
                      sx={{
                        display: { xs: "flex", sm: "none" },
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrentToday || isSelectedOnMobile ? 700 : 500,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: "0.8125rem",
                          lineHeight: 1.1,
                          color: isSelectedOnMobile
                            ? "primary.main"
                            : isCurrentToday
                            ? (theme) =>
                                theme.palette.mode === "dark"
                                  ? tokens.dark.textPrimary
                                  : tokens.light.textPrimary
                            : (theme) =>
                                theme.palette.mode === "dark"
                                  ? tokens.dark.textSecondary
                                  : tokens.light.textSecondary,
                        }}
                      >
                        {dayNum}
                      </Typography>
                      {/* Micro indicator dot */}
                      <Box sx={{ height: 4, mt: 0.35, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {actualMetrics.hasActiveLiveCircuits ? (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                              boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                  ? `0 0 4px ${tokens.dark.live}`
                                  : `0 0 3px ${tokens.light.live}`,
                            }}
                          />
                        ) : actualMetrics.isLogged ? (
                          <Box
                            sx={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                            }}
                          />
                        ) : null}
                      </Box>
                    </Box>

                    {/* DESKTOP DISPLAY (sm+): Full Card Header & Cost/kWh Content */}
                    <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isCurrentToday ? 700 : 500,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.8125rem",
                            color: (theme) =>
                              isCurrentToday
                                ? theme.palette.mode === "dark"
                                  ? tokens.dark.textPrimary
                                  : tokens.light.textPrimary
                                : theme.palette.mode === "dark"
                                ? tokens.dark.textSecondary
                                : tokens.light.textSecondary,
                          }}
                        >
                          {dayNum}
                        </Typography>
                        {isCurrentToday && (
                          <Chip
                            label="TODAY"
                            size="small"
                            sx={{
                              height: 15,
                              fontSize: "0.5625rem",
                              fontWeight: 700,
                              px: 0.25,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                              color: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                            }}
                          />
                        )}
                      </Box>
                      {actualMetrics.hasActiveLiveCircuits && (
                        <Tooltip title="Stopwatch Running Live">
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                              boxShadow: (theme) =>
                                theme.palette.mode === "dark"
                                  ? `0 0 6px ${tokens.dark.live}`
                                  : `0 0 4px ${tokens.light.live}`,
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>

                    <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", mt: 0.5 }}>
                      {isFuture ? (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontSize: "0.625rem",
                            opacity: 0.7,
                          }}
                        >
                          Future
                        </Typography>
                      ) : actualMetrics.isLogged ? (
                        <>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                              fontSize: "0.75rem",
                              color: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                            }}
                          >
                            ₱{actualMetrics.cost.toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.625rem",
                              fontVariantNumeric: "tabular-nums",
                              display: "block",
                            }}
                          >
                            {actualMetrics.kwh.toFixed(1)} kWh
                          </Typography>
                        </>
                      ) : (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "text.secondary",
                            fontSize: "0.625rem",
                            opacity: 0.6,
                          }}
                        >
                          No logs
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            }

            // In Simulation Plan tab
            const simMetrics = computeSimulatedDayMetrics(
              dateKey,
              dayDate,
              simulatedUsageMap[dateKey] || [],
              appliances,
              calendarEffectiveRate
            );

            return (
              <Grid size={1} key={`sim-${dateKey}-${idx}`}>
                <Paper
                  variant="outlined"
                  data-tour={idx === 0 ? "calendar-day-click" : undefined}
                  onClick={() => {
                    setSelectedMobileDate(dayDate);
                    if (typeof window !== "undefined" && window.innerWidth >= 600) {
                      setSelectedDateForSimModal(dayDate);
                    }
                  }}
                  sx={{
                    minHeight: { xs: 44, sm: 94 },
                    p: { xs: 0.5, sm: 1 },
                    borderRadius: 1,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: { xs: "center", sm: "space-between" },
                    alignItems: { xs: "center", sm: "stretch" },
                    position: "relative",
                    bgcolor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      if (isSelectedOnMobile) {
                        return isDark ? "rgba(0, 229, 201, 0.12)" : "rgba(0, 229, 201, 0.08)";
                      }
                      if (isCurrentToday) {
                        return isDark ? tokens.dark.liveBg : tokens.light.liveBg;
                      }
                      if (simMetrics.isCustomSimulated) {
                        return isDark ? tokens.dark.surface : tokens.light.surface;
                      }
                      return "transparent";
                    },
                    borderStyle: "solid",
                    borderColor: (theme) => {
                      const isDark = theme.palette.mode === "dark";
                      if (isSelectedOnMobile) {
                        return isDark ? tokens.dark.primary : tokens.light.primary;
                      }
                      if (isCurrentToday) {
                        return isDark ? tokens.dark.liveBorder : tokens.light.liveBorder;
                      }
                      if (simMetrics.isCustomSimulated) {
                        return isDark ? tokens.dark.borderStrong : tokens.light.borderStrong;
                      }
                      return isDark ? tokens.dark.borderSubtle : tokens.light.borderSubtle;
                    },
                    borderWidth: isSelectedOnMobile ? { xs: "1.5px", sm: "1px" } : "1px",
                    transition: "background-color 0.15s ease, border-color 0.15s ease",
                    "&:hover": {
                      borderColor: (theme) => {
                        const isDark = theme.palette.mode === "dark";
                        if (isCurrentToday) {
                          return isDark ? tokens.dark.live : tokens.light.live;
                        }
                        return isDark ? tokens.dark.borderStrong : tokens.light.borderStrong;
                      },
                      bgcolor: (theme) => {
                        const isDark = theme.palette.mode === "dark";
                        if (isCurrentToday) {
                          return isDark ? "rgba(52, 211, 153, 0.16)" : "rgba(5, 150, 105, 0.16)";
                        }
                        return isDark ? tokens.dark.hover : tokens.light.hover;
                      },
                    },
                  }}
                >
                  {/* MOBILE DISPLAY (xs): Clean Date Number + Micro Indicator Dot */}
                  <Box
                    sx={{
                      display: { xs: "flex", sm: "none" },
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isCurrentToday || isSelectedOnMobile ? 700 : 500,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.8125rem",
                        lineHeight: 1.1,
                        color: isSelectedOnMobile
                          ? "primary.main"
                          : isCurrentToday
                          ? (theme) =>
                              theme.palette.mode === "dark"
                                ? tokens.dark.textPrimary
                                : tokens.light.textPrimary
                          : (theme) =>
                              theme.palette.mode === "dark"
                                ? tokens.dark.textSecondary
                                : tokens.light.textSecondary,
                      }}
                    >
                      {dayNum}
                    </Typography>
                    {/* Micro indicator dot */}
                    <Box sx={{ height: 4, mt: 0.35, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {simMetrics.isCustomSimulated ? (
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                          }}
                        />
                      ) : null}
                    </Box>
                  </Box>

                  {/* DESKTOP DISPLAY (sm+): Full Card Header & Cost/kWh Content */}
                  <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrentToday ? 700 : 500,
                          fontVariantNumeric: "tabular-nums",
                          fontSize: "0.8125rem",
                          color: (theme) =>
                            isCurrentToday
                              ? theme.palette.mode === "dark"
                                ? tokens.dark.textPrimary
                                : tokens.light.textPrimary
                              : theme.palette.mode === "dark"
                              ? tokens.dark.textSecondary
                              : tokens.light.textSecondary,
                        }}
                      >
                        {dayNum}
                      </Typography>
                      {isCurrentToday && (
                        <Chip
                          label="TODAY"
                          size="small"
                          sx={{
                            height: 15,
                            fontSize: "0.5625rem",
                            fontWeight: 700,
                            px: 0.25,
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                            color: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                          }}
                        />
                      )}
                    </Box>
                    {simMetrics.isCustomSimulated && (
                      <Tooltip title="Custom Simulation Plan Active">
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>

                  <Box sx={{ display: { xs: "none", sm: "block" }, textAlign: "right", mt: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.75rem",
                        color: (theme) =>
                          simMetrics.isCustomSimulated
                            ? theme.palette.mode === "dark"
                              ? tokens.dark.live
                              : tokens.light.live
                            : theme.palette.mode === "dark"
                            ? tokens.dark.textPrimary
                            : tokens.light.textPrimary,
                      }}
                    >
                      ₱{simMetrics.cost.toFixed(2)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.625rem",
                        fontVariantNumeric: "tabular-nums",
                        display: "block",
                      }}
                    >
                      {simMetrics.kwh.toFixed(1)} kWh
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Mobile View: Interactive Selected Date Details Card (Reveals details when date is clicked) */}
        {selectedMobileDate && (
          <Box
            sx={{
              display: { xs: "block", sm: "none" },
              mt: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          >
            <Box
              sx={{
                p: 1.75,
                borderRadius: 1.25,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
              }}
            >
              {/* Header: Date + Badges */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.25 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                    {selectedMobileDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </Typography>
                  {selectedMobileDateKey === realTodayKey && (
                    <Chip
                      label="TODAY"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    />
                  )}
                  {selectedMobileDateKey > realTodayKey && (
                    <Chip
                      label="FUTURE"
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        color: "text.secondary",
                      }}
                    />
                  )}
                </Box>

                {calendarTab === "actual" && mobileSelectedActualMetrics.hasActiveLiveCircuits && (
                  <Chip
                    size="small"
                    icon={<TimerIcon sx={{ fontSize: "12px !important", color: "inherit" }} />}
                    label="Stopwatch Live"
                    sx={{
                      height: 20,
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(0, 229, 201, 0.1)",
                      color: "primary.main",
                    }}
                  />
                )}
                {calendarTab === "simulation" && mobileSelectedSimMetrics.isCustomSimulated && (
                  <Chip
                    size="small"
                    label="Custom Plan"
                    sx={{
                      height: 20,
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(0, 229, 201, 0.1)",
                      color: "primary.main",
                    }}
                  />
                )}
              </Box>

              {/* Key Stats Row */}
              <Grid container spacing={1} sx={{ mb: 1.5 }}>
                <Grid size={6}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                      {calendarTab === "actual" ? "Recorded Cost" : "Simulated Cost"}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: (theme) =>
                          calendarTab === "actual"
                            ? mobileSelectedActualMetrics.isLogged
                              ? theme.palette.mode === "dark"
                                ? tokens.dark.live
                                : tokens.light.live
                              : "text.secondary"
                            : theme.palette.mode === "dark"
                            ? tokens.dark.live
                            : tokens.light.live,
                        fontSize: "1.1rem",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ₱
                      {calendarTab === "actual"
                        ? mobileSelectedActualMetrics.cost.toFixed(2)
                        : mobileSelectedSimMetrics.cost.toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                      Energy Usage
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 700,
                        color: "text.primary",
                        fontSize: "1.1rem",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {calendarTab === "actual"
                        ? mobileSelectedActualMetrics.kwh.toFixed(2)
                        : mobileSelectedSimMetrics.kwh.toFixed(2)}{" "}
                      <Typography component="span" sx={{ fontSize: "0.75rem", color: "text.secondary", fontWeight: 500 }}>
                        kWh
                      </Typography>
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Action Button to inspect day */}
              <Button
                fullWidth
                variant="contained"
                size="small"
                disabled={calendarTab === "actual" && selectedMobileDateKey > realTodayKey}
                onClick={() => {
                  if (calendarTab === "actual") {
                    if (selectedMobileDateKey <= realTodayKey) {
                      setSelectedDateForActualModal(selectedMobileDate);
                    }
                  } else {
                    setSelectedDateForSimModal(selectedMobileDate);
                  }
                }}
                sx={{
                  borderRadius: 1,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  textTransform: "none",
                  py: 0.75,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg,
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.zinc[200] : tokens.zinc[800],
                  },
                }}
              >
                {calendarTab === "actual"
                  ? selectedMobileDateKey > realTodayKey
                    ? "Future Date (No logs)"
                    : "Inspect Day Sessions & 24H Timeline"
                  : "Edit & Inspect Simulation Day Plan"}
              </Button>
            </Box>
          </Box>
        )}
      </SectionCard>

      {/* MODAL 1: Actual Tab Day Inspector with 24H Timeline & Stopwatch Switches */}
      {selectedDateForActualModal && (
        <DateAnalyticsModal
          isOpen={Boolean(selectedDateForActualModal)}
          onClose={() => setSelectedDateForActualModal(null)}
          selectedDate={selectedDateForActualModal}
          appliances={appliances}
          initialUsageRecords={dailyUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          logs={usageLogs}
          onUsageSaved={() => {
            if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
            if (logsRes?.refetch) logsRes.refetch();
            if (appliancesRes?.refetch) appliancesRes.refetch();
          }}
        />
      )}

      {/* MODAL 2: Simulation Tab Day Plan Inspector */}
      {selectedDateForSimModal && (
        <SimulatedDayModal
          isOpen={Boolean(selectedDateForSimModal)}
          onClose={() => setSelectedDateForSimModal(null)}
          selectedDate={selectedDateForSimModal}
          appliances={appliances}
          initialSimulatedRecords={simulatedUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onSimulationSaved={() => {
            if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
          }}
        />
      )}

      {/* MODAL 3: Simulate Appliance Modal */}
      <SimulateApplianceModal
        isOpen={isSimulateApplianceOpen}
        onClose={() => setIsSimulateApplianceOpen(false)}
        appliances={appliances}
        selectedDate={currentDate}
        onSimulationSaved={() => {
          if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
        }}
      />

      {/* MODAL 4: Billing Period & Cutoff Settings */}
      <BillingPeriodModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        currentSelectedDate={currentDate}
        currentConfig={billingConfig}
        onSaveConfig={handleSaveBillingConfig}
      />
    </Box>
  );
};

export default SmartCalendar;
