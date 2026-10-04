import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  Bolt as BoltIcon,
  Calculate as CalculatorIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Storage as DatabaseIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  AccessTime as ClockIcon,
  Add as PlusIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  AccountBalanceWallet as WalletIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { MetricCard } from "../components/common/MetricCard";
import { LivePowerBoard } from "../components/dashboard/LivePowerBoard";
import { ConsumptionDonut } from "../components/dashboard/ConsumptionDonut";
import { TodayActivityTimeline } from "../components/dashboard/TodayActivityTimeline";
import { ApplianceModal } from "../components/appliances/ApplianceModal";
import { PelpCatalogModal } from "../components/appliances/PelpCatalogModal";
import { SpaceManagementModal } from "../components/appliances/SpaceManagementModal";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";
import { useList } from "@refinedev/core";
import { UserAppliance, ApplianceList, DailyApplianceUsage } from "../types";
import { calculateMeralcoBill } from "../lib/meralcoCalculator";
import { useNotifications } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../components/common/ToastProvider";
import { formatDateToKey, DEFAULT_EFFECTIVE_RATE, getApplianceEffectiveRunningWatts, sumLiveDeltaForRange } from "../lib/dailyUsageService";
import { getMeralcoTariff, MeralcoTariffData, DEFAULT_MERALCO_TARIFF } from "../lib/meralcoRateService";
import { getEffectiveApplianceRate } from "../lib/sessionService";
import { useRoom } from "../context/RoomContext";
import { tokens } from "../theme/tokens";

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { isViewer, canEdit } = useRoom();
  const { showSuccess } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [pendingAddApplianceAfterSpace, setPendingAddApplianceAfterSpace] = useState(false);
  const [selectedSpaceIdForAdd, setSelectedSpaceIdForAdd] = useState<string | null>(null);

  const listResponse = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesResponse = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const todayKey = formatDateToKey(new Date());

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    filters: [{ field: "usage_date", operator: "eq", value: todayKey }],
  }) as any;

  const todayUsageRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];

  // Meralco Tariff Telemetry
  const [tariff, setTariff] = useState<MeralcoTariffData>(DEFAULT_MERALCO_TARIFF);
  useEffect(() => {
    getMeralcoTariff(false).then((data) => setTariff(data));
  }, []);

  const effectiveRate = tariff.totalEffectiveRate || DEFAULT_EFFECTIVE_RATE;

  const appliances: UserAppliance[] = listResponse?.data?.data || listResponse?.result?.data || [];
  const spaces: ApplianceList[] = spacesResponse?.data?.data || spacesResponse?.result?.data || [];

  // Live 1-second ticker for active running stopwatches
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const hasRunning = appliances.some((a) => a.is_currently_on);
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [appliances]);

  // Synchronize circuit toggles and session sync across views
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (listResponse?.refetch) listResponse.refetch();
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    window.addEventListener("powerforecast_session_sync", handleCircuitToggled);
    window.addEventListener("powerforecast_stopwatch_rollover", handleCircuitToggled);
    return () => {
      window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
      window.removeEventListener("powerforecast_session_sync", handleCircuitToggled);
      window.removeEventListener("powerforecast_stopwatch_rollover", handleCircuitToggled);
    };
  }, [listResponse, dailyUsageRes]);

  const handleOpenAddModal = () => {
    if (spaces.length === 0) {
      setPendingAddApplianceAfterSpace(true);
      setIsSpaceModalOpen(true);
    } else {
      setSelectedSpaceIdForAdd(spaces[0]?.id || null);
      setIsAddModalOpen(true);
    }
  };

  const activeAppliances = appliances.filter((a: UserAppliance) => a.is_active !== false);
  const runningAppliances = activeAppliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce((acc: number, curr: UserAppliance) => {
    if (!curr.last_turned_on_at) return acc + curr.watts * (curr.quantity || 1);
    const start = new Date(curr.last_turned_on_at).getTime();
    const diffMinutes = Math.max(0, (now - start) / 60000);
    const telemetry = getApplianceEffectiveRunningWatts(curr, diffMinutes);
    return acc + telemetry.effectiveWatts;
  }, 0);

  // Today's Measured Spend = saved daily_appliance_usage records today + live running stopwatches
  const todayKeyStr = formatDateToKey(new Date(now));
  const liveSummary = sumLiveDeltaForRange(
    runningAppliances,
    now,
    todayUsageRecords,
    (d) => d === todayKeyStr
  );
  const liveSessionCost = liveSummary.deltaCost;
  const liveSessionKwh = liveSummary.deltaKwh;

  const loggedTodayCost = todayUsageRecords.reduce((acc, curr) => acc + (Number(curr.estimated_cost) || 0), 0);
  const loggedTodayKwh = todayUsageRecords.reduce((acc, curr) => acc + (Number(curr.kwh_consumed) || 0), 0);

  const todayTotalCost = loggedTodayCost + liveSessionCost;
  const todayTotalKwh = loggedTodayKwh + liveSessionKwh;

  const totalMonthlyKwh = activeAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000)),
    0
  );

  // Calculate space-by-space bills and cost split (strictly active appliances)
  const spaceAnalytics = useMemo(() => {
    let resTotalKwh = 0;
    let resTotalBill = 0;
    let comTotalKwh = 0;
    let comTotalBill = 0;

    const breakdownBySpace = spaces.map((space) => {
      const spaceApps = activeAppliances.filter((a) => a.list_id === space.id || (!a.list_id && space.is_default));
      const kwh = spaceApps.reduce((acc, curr) => {
        return acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000));
      }, 0);

      const bill = calculateMeralcoBill(kwh, undefined, 0, false, space.tariff_type);

      if (space.tariff_type === "commercial") {
        comTotalKwh += kwh;
        comTotalBill += bill.totalBill;
      } else {
        resTotalKwh += kwh;
        resTotalBill += bill.totalBill;
      }

      return {
        space,
        kwh: Math.round(kwh * 10) / 10,
        bill: bill.totalBill,
        devicesCount: spaceApps.length,
      };
    });

    const consolidatedTotalBill = breakdownBySpace.reduce((acc, curr) => acc + curr.bill, 0);

    return {
      breakdownBySpace,
      consolidatedTotalBill,
      resTotalBill,
      comTotalBill,
      resTotalKwh,
      comTotalKwh,
      resPercent: consolidatedTotalBill > 0 ? (resTotalBill / consolidatedTotalBill) * 100 : 100,
      comPercent: consolidatedTotalBill > 0 ? (comTotalBill / consolidatedTotalBill) * 100 : 0,
    };
  }, [appliances, spaces]);

  // Activate smart energy notification monitors
  useNotifications({
    appliances: activeAppliances,
    projectedBill: spaceAnalytics.consolidatedTotalBill,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* Tier 0: Standardized Clean Page Header */}
      <PageHeader
        title={t("dash.title", "Dashboard")}
        subtitle={t(
          "dash.subtitle",
          "Real-time grid telemetry, Meralco unbundled tariff projections, and sub-metering cost allocation."
        )}
        badge={
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.4,
              borderRadius: 10,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.emerald[400] : tokens.emerald[600],
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? `0 0 6px ${tokens.emerald[500]}`
                    : `0 0 4px ${tokens.emerald[500]}`,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                letterSpacing: "0.02em",
              }}
            >
              {t("dash.gridTelemetry", "Active Grid Telemetry")}
            </Typography>
          </Box>
        }
        actions={
          spaces.length === 0 ? (
            <Button
              component={Link}
              to="/appliances"
              variant="contained"
              size="small"
              startIcon={<PlusIcon />}
            >
              Create Your First Space
            </Button>
          ) : (
            <>
              <Tooltip title={isViewer ? "View-Only Mode: Adding appliances is restricted to Admins" : ""}>
                <span>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={isViewer}
                    onClick={() => setIsAddModalOpen(true)}
                    startIcon={<PlusIcon />}
                  >
                    {t("dash.addAppliance", "Add Appliance")}
                  </Button>
                </span>
              </Tooltip>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsPelpModalOpen(true)}
                startIcon={<DatabaseIcon sx={{ fontSize: 16 }} />}
              >
                {t("dash.pelpCatalog", "PELP Catalog")}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsAiScannerOpen(true)}
                startIcon={<SparklesIcon sx={{ fontSize: 16 }} />}
              >
                {t("dash.aiScanner", "AI Scanner")}
              </Button>
            </>
          )
        }
      />

      {/* Tier 1: Main KPI Stat Cards (Inverted Pyramid Apex) */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} data-tour="dashboard-kpi-cards">
        {/* Card 1: Live Power Draw (Hero Telemetry) */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            dataTour="dashboard-hero"
            title={t("dash.currentDraw", "CURRENT DRAW LOAD")}
            value={`${activeWattage} W`}
            liveDot={runningAppliances.length > 0}
            subtitle={`₱${((activeWattage / 1000) * effectiveRate).toFixed(2)}/hr running rate`}
            badge={
              <Chip
                label={`${runningAppliances.length} of ${appliances.length} ON`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  bgcolor: (theme) =>
                    runningAppliances.length > 0
                      ? theme.palette.mode === "dark"
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(5, 150, 105, 0.12)"
                      : theme.palette.mode === "dark"
                      ? tokens.dark.surfaceSubtle
                      : tokens.light.surfaceSubtle,
                  color: (theme) =>
                    runningAppliances.length > 0
                      ? theme.palette.mode === "dark"
                        ? tokens.emerald[400]
                        : tokens.emerald[700]
                      : theme.palette.mode === "dark"
                      ? tokens.dark.textMuted
                      : tokens.light.textMuted,
                  border: "1px solid",
                  borderColor: (theme) =>
                    runningAppliances.length > 0
                      ? theme.palette.mode === "dark"
                        ? "rgba(52, 211, 153, 0.3)"
                        : "rgba(5, 150, 105, 0.25)"
                      : theme.palette.mode === "dark"
                      ? tokens.dark.borderSubtle
                      : tokens.light.borderSubtle,
                }}
              />
            }
            icon={<SpeedIcon sx={{ fontSize: 16 }} />}
            highlight={runningAppliances.length > 0}
          />
        </Grid>

        {/* Card 2: Today's Measured Spend */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.todaySpend", "TODAY'S MEASURED SPEND")}
            value={`₱${todayTotalCost.toFixed(2)}`}
            subtitle={`${todayTotalKwh.toFixed(2)} kWh recorded today`}
            trend={{
              value: runningAppliances.length > 0 ? `${runningAppliances.length} Active` : `${todayUsageRecords.length} Logged`,
              direction: runningAppliances.length > 0 ? "up" : "neutral",
            }}
            icon={<ClockIcon sx={{ fontSize: 16 }} />}
          />
        </Grid>

        {/* Card 3: Projected Monthly Bill */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.consolidatedBill", "PROJECTED MONTHLY BILL")}
            value={`₱${spaceAnalytics.consolidatedTotalBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={spaces.length > 1 ? `${t("dash.combinedAcross", "Combined across")} ${spaces.length} ${t("dash.spaces", "spaces")}` : "Household projected bill"}
            trend={{ value: `${spaces.length} ${spaces.length === 1 ? "Space" : "Spaces"}`, direction: "neutral" }}
            icon={<BoltIcon sx={{ fontSize: 16 }} />}
          />
        </Grid>

        {/* Card 4: Monthly Energy Volume */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.monthlyVolume", "MONTHLY ENERGY VOLUME")}
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle={t("dash.totalRegistered", "Total registered load")}
            trend={{ value: totalMonthlyKwh <= 100 ? "Lifeline" : "Standard", direction: "neutral" }}
            icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
          />
        </Grid>
      </Grid>

      {/* Tier 2: Primary Telemetry & Split Rail (Live Board + Energy Distribution + Shortcuts) */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }} sx={{ alignItems: "stretch" }}>
        {/* Left Column: Live Circuit Power Board */}
        <Grid size={{ xs: 12, lg: 8 }} data-tour="dashboard-live-board" sx={{ display: "flex" }}>
          <Box sx={{ width: "100%" }}>
            <LivePowerBoard onOpenAddModal={handleOpenAddModal} />
          </Box>
        </Grid>

        {/* Right Rail: Energy Distribution Donut & Quick Shortcuts Panel */}
        <Grid size={{ xs: 12, lg: 4 }} sx={{ display: "flex" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, width: "100%" }}>
            {/* Donut Chart */}
            <Box data-tour="dashboard-donut" sx={{ flexShrink: 0 }}>
              <ConsumptionDonut appliances={appliances} />
            </Box>

            {/* Quick Shortcuts List Card */}
            <Card
              data-tour="dashboard-quick-actions"
              sx={{
                p: 2,
                borderRadius: 1,
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
                backgroundImage: "none",
                boxShadow: "none",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textMuted : tokens.light.textMuted,
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    display: "block",
                    mb: 1.5,
                  }}
                >
                  Quick Modules
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    {
                      title: "Bill Calculator",
                      desc: "Unbundled tariff formulas & forecasting",
                      icon: <CalculatorIcon sx={{ fontSize: 16 }} />,
                      link: "/calculator",
                    },
                    {
                      title: "Appliance Hub",
                      desc: "Multi-space inventory & PELP match",
                      icon: <BoltIcon sx={{ fontSize: 16 }} />,
                      link: "/appliances",
                    },
                    {
                      title: "Smart Scheduler",
                      desc: "Circuit runtime planner & queue",
                      icon: <CalendarIcon sx={{ fontSize: 16 }} />,
                      link: "/calendar",
                    },
                  ].map((item) => (
                    <Box
                      key={item.link}
                      component={Link}
                      to={item.link}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.25,
                        borderRadius: 1,
                        textDecoration: "none",
                        color: "inherit",
                        border: "1px solid",
                        borderColor: "transparent",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? tokens.dark.surfaceSubtle
                            : tokens.light.surfaceSubtle,
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? tokens.dark.borderStrong
                              : tokens.light.borderStrong,
                          transform: "translateX(2px)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: 0.75,
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? tokens.zinc[800]
                                : tokens.zinc[200],
                            color: (theme) =>
                              theme.palette.mode === "dark"
                                ? tokens.dark.textPrimary
                                : tokens.light.textPrimary,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                              color: (theme) =>
                                theme.palette.mode === "dark"
                                  ? tokens.dark.textPrimary
                                  : tokens.light.textPrimary,
                              lineHeight: 1.2,
                            }}
                          >
                            {item.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: (theme) =>
                                theme.palette.mode === "dark"
                                  ? tokens.dark.textMuted
                                  : tokens.light.textMuted,
                              fontSize: "0.6875rem",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {item.desc}
                          </Typography>
                        </Box>
                      </Box>
                      <ChevronRightIcon
                        sx={{
                          fontSize: 18,
                          color: (theme) =>
                            theme.palette.mode === "dark"
                              ? tokens.dark.textMuted
                              : tokens.light.textMuted,
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Tier 3: 24-Hour Activity & Load Timeline */}
      <TodayActivityTimeline appliances={appliances} />

      {/* Tier 4: Sub-Metering & Space Cost Allocation (When Multiple Spaces Exist) */}
      {spaces.length > 1 && (
        <Card
          data-tour="dashboard-space-split"
          sx={{
            p: { xs: 2.25, sm: 2.5 },
            borderRadius: 1,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
            backgroundImage: "none",
            boxShadow: "none",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <WalletIcon sx={{ fontSize: 18 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
                  Space Sub-Billing & Expense Split
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Cost allocation between residential living and commercial / business operations
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                icon={<HomeIcon sx={{ fontSize: 14 }} />}
                label={`Residential: ₱${spaceAnalytics.resTotalBill.toFixed(2)} (${spaceAnalytics.resPercent.toFixed(0)}%)`}
                size="small"
                sx={{
                  fontWeight: 600,
                  fontSize: "0.6875rem",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                  color: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                }}
              />
              {spaceAnalytics.comTotalBill > 0 && (
                <Chip
                  icon={<StoreIcon sx={{ fontSize: 14 }} />}
                  label={`Commercial: ₱${spaceAnalytics.comTotalBill.toFixed(2)} (${spaceAnalytics.comPercent.toFixed(0)}%)`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.6875rem",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    color: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                  }}
                />
              )}
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={spaceAnalytics.resPercent}
            sx={{
              height: 6,
              borderRadius: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.zinc[800] : tokens.zinc[200],
              "& .MuiLinearProgress-bar": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.zinc[400] : tokens.zinc[800],
              },
              mb: 2,
            }}
          />

          <Grid container spacing={2}>
            {spaceAnalytics.breakdownBySpace.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.space.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: (theme) =>
                        theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong,
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.space.tariff_type === "commercial" ? (
                        <StoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      ) : (
                        <HomeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {item.space.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.25, display: "block" }}>
                      {item.devicesCount} devices • {item.kwh} kWh
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontFamily: "monospace",
                        fontVariantNumeric: "tabular-nums",
                        color: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                      }}
                    >
                      ₱{item.bill.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                      {item.space.tariff_type === "commercial" ? "General Power" : "230V Stepped"}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* Global Add Appliance Modal */}
      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSpaceIdForAdd(null);
        }}
        defaultListId={selectedSpaceIdForAdd || spaces[0]?.id || null}
      />

      {/* PELP Catalog Modal */}
      <PelpCatalogModal
        isOpen={isPelpModalOpen}
        onClose={() => setIsPelpModalOpen(false)}
        defaultListId={spaces[0]?.id || null}
      />

      {/* AI Vision Scanner Modal */}
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        defaultListId={spaces[0]?.id || null}
      />

      {/* Dashboard Space Setup Modal (Opens when no spaces exist or user adds a space) */}
      <SpaceManagementModal
        isOpen={isSpaceModalOpen}
        onClose={() => {
          setIsSpaceModalOpen(false);
          setPendingAddApplianceAfterSpace(false);
        }}
        onCreated={(newSpace) => {
          if (newSpace?.id) {
            showSuccess(`Space "${newSpace.name}" created successfully! Now let's add your first appliance.`);
            if (pendingAddApplianceAfterSpace) {
              setSelectedSpaceIdForAdd(newSpace.id);
              setIsAddModalOpen(true);
              setPendingAddApplianceAfterSpace(false);
            }
          }
        }}
      />
    </Box>
  );
};

export default DashboardPage;
