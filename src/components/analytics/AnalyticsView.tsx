import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LinearProgress from "@mui/material/LinearProgress";
import TooltipMui from "@mui/material/Tooltip";
import ButtonGroup from "@mui/material/ButtonGroup";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useTheme } from "@mui/material/styles";
import {
  BarChart as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  EnergySavingsLeaf as LeafIcon,
  Lightbulb as LightbulbIcon,
  Download as DownloadIcon,
  PieChart as PieChartIcon,
  ReceiptLong as ReceiptIcon,
  PowerSettingsNew as StandbyIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Category as CategoryIcon,
  FormatListBulleted as ListIcon,
  ElectricMeter as MeterIcon,
  FileDownload as FileDownloadIcon,
  AutoAwesome as SparklesIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckIcon,
  InfoOutlined as InfoIcon,
  Science as ScienceIcon,
  Refresh as RefreshIcon,
  SmartToy as RobotIcon,
} from "@mui/icons-material";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { UserAppliance, ApplianceList, DailyApplianceUsage, SimulatedApplianceUsage } from "../../types";
import { useList, useGetIdentity } from "@refinedev/core";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { calculateApplianceKwh, sumLiveDeltaForRange } from "../../lib/dailyUsageService";
import { useLiveTicker } from "../../hooks/useLiveTicker";
import { MetricCard } from "../common/MetricCard";
import { PageHeader } from "../common/PageHeader";
import { SectionCard } from "../common/SectionCard";
import { tokens } from "../../theme/tokens";
import {
  generateAiEnergyTips,
  AiEnergyTip,
  getPersistedAiTips,
  getDailyAiQuota,
  computeInventoryFingerprint,
  MAX_DAILY_AI_GENERATIONS,
} from "../../lib/energyAiService";
import { devLog } from "../../lib/devLogger";

export const AnalyticsView: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { data: identity } = useGetIdentity<any>();
  const userId = identity?.id;

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [breakdownView, setBreakdownView] = useState<"category" | "appliances">("category");
  const [dataSourceMode, setDataSourceMode] = useState<"actual" | "simulated">("actual");

  // On-demand Gemini AI Energy Tips states
  const [aiTips, setAiTips] = useState<AiEnergyTip[]>([]);
  const [isGeneratingAiTips, setIsGeneratingAiTips] = useState<boolean>(false);
  const [aiTipsGeneratedAt, setAiTipsGeneratedAt] = useState<string | null>(null);
  const [aiTipsIsFallback, setAiTipsIsFallback] = useState<boolean>(false);
  const [hasGeneratedAiTips, setHasGeneratedAiTips] = useState<boolean>(false);
  const [savedInventoryHash, setSavedInventoryHash] = useState<string>("");
  const [dailyQuota, setDailyQuota] = useState(() => getDailyAiQuota(userId));

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

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const dailyUsageRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const simulatedUsageRecords: SimulatedApplianceUsage[] = simulatedUsageRes?.data?.data || simulatedUsageRes?.result?.data || [];

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

  // Filter target appliances based on active space selection (excluding blacklisted appliances)
  const targetAppliances = useMemo(() => {
    const list =
      selectedSpaceId === "all"
        ? appliances
        : appliances.filter(
            (a) => a.list_id === selectedSpaceId || (!a.list_id && spaces.find((s) => s.id === selectedSpaceId)?.is_default)
          );
    return list.filter((a) => a.is_active !== false);
  }, [appliances, spaces, selectedSpaceId]);

  // Live ticker for active stopwatch circuits
  const hasRunningCircuits = appliances.some((a) => a.is_currently_on);
  const liveNow = useLiveTicker(hasRunningCircuits);

  // Active Billing Cycle Timeline Key
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthStr = String(currentMonthIdx + 1).padStart(2, "0");
  const activeMonthKey = `${currentYear}-${currentMonthStr}`;
  const daysInActiveMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

  // Aggregated Actual Measured Data for target appliances (Filtered to active billing month)
  const actualAggregates = useMemo(() => {
    const targetIds = new Set(targetAppliances.map((a) => a.id));
    let totalKwh = 0;
    let totalCost = 0;
    const catMap: Record<string, number> = {};
    const appMap: Record<string, number> = {};

    dailyUsageRecords.forEach((r) => {
      // Filter by target space appliances and active billing cycle month
      if (targetIds.has(r.appliance_id) && (!r.usage_date || r.usage_date.startsWith(activeMonthKey))) {
        const kwh = Number(r.kwh_consumed) || 0;
        const cost = Number(r.estimated_cost) || 0;
        totalKwh += kwh;
        totalCost += cost;
        const app = targetAppliances.find((a) => a.id === r.appliance_id);
        const cat = app?.category || "General";
        catMap[cat] = (catMap[cat] || 0) + kwh;
        appMap[r.appliance_id] = (appMap[r.appliance_id] || 0) + kwh;
      }
    });

    // Factor in live running stopwatches for the active billing cycle
    const runningTargetApps = targetAppliances.filter((a) => a.is_currently_on && a.last_turned_on_at);
    if (runningTargetApps.length > 0) {
      const liveSummary = sumLiveDeltaForRange(
        runningTargetApps,
        liveNow,
        dailyUsageRecords,
        (dateKey) => dateKey.startsWith(activeMonthKey)
      );
      if (liveSummary.deltaKwh > 0 || liveSummary.deltaCost > 0) {
        totalKwh += liveSummary.deltaKwh;
        totalCost += liveSummary.deltaCost;
        runningTargetApps.forEach((app) => {
          const cat = app.category || "General";
          catMap[cat] = (catMap[cat] || 0) + liveSummary.deltaKwh;
          appMap[app.id] = (appMap[app.id] || 0) + liveSummary.deltaKwh;
        });
      }
    }

    return {
      totalKwh: Number(totalKwh.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      catMap,
      appMap,
      hasRecords: totalKwh > 0,
    };
  }, [dailyUsageRecords, targetAppliances, activeMonthKey, liveNow]);

  const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
  const isCommercialSelected = selectedSpaceId !== "all" && activeSpace?.tariff_type === "commercial";
  const tariffType: "residential" | "commercial" = isCommercialSelected ? "commercial" : "residential";

  // Aggregated Simulated Plan Data for target appliances (Filtered to active billing month)
  // Combines customized simulated days (with baseline fallback for untouched devices) and untouched routine days
  const simulatedAggregates = useMemo(() => {
    const targetIds = new Set(targetAppliances.map((a) => a.id));
    
    // Group custom simulated records by date
    const simByDate = new Map<string, Map<string, { kwh: number; cost: number }>>();
    let hasCustomRecords = false;

    simulatedUsageRecords.forEach((r) => {
      if (targetIds.has(r.appliance_id) && (!r.usage_date || r.usage_date.startsWith(activeMonthKey))) {
        hasCustomRecords = true;
        if (!simByDate.has(r.usage_date)) {
          simByDate.set(r.usage_date, new Map());
        }
        simByDate.get(r.usage_date)!.set(r.appliance_id, {
          kwh: Number(r.kwh_consumed) || 0,
          cost: Number(r.estimated_cost) || 0,
        });
      }
    });

    const catMap: Record<string, number> = {};
    const appMap: Record<string, number> = {};
    let totalKwh = 0;

    for (let d = 1; d <= daysInActiveMonth; d++) {
      const dateStr = `${activeMonthKey}-${String(d).padStart(2, "0")}`;
      const dayCustomMap = simByDate.get(dateStr);

      targetAppliances.forEach((app) => {
        const cat = app.category || "General";
        if (dayCustomMap && dayCustomMap.has(app.id)) {
          const rec = dayCustomMap.get(app.id)!;
          totalKwh += rec.kwh;
          catMap[cat] = (catMap[cat] || 0) + rec.kwh;
          appMap[app.id] = (appMap[app.id] || 0) + rec.kwh;
        } else {
          // Untouched appliance or unedited day: routine baseline
          const dailyKwh = calculateApplianceKwh(app, Number(app.hours_per_day) || 0);
          totalKwh += dailyKwh;
          catMap[cat] = (catMap[cat] || 0) + dailyKwh;
          appMap[app.id] = (appMap[app.id] || 0) + dailyKwh;
        }
      });
    }

    const billResult = calculateMeralcoBill(totalKwh, undefined, 0, false, tariffType);

    return {
      totalKwh: Number(totalKwh.toFixed(2)),
      totalCost: billResult.totalBill,
      catMap,
      appMap,
      hasRecords: hasCustomRecords,
    };
  }, [simulatedUsageRecords, targetAppliances, activeMonthKey, daysInActiveMonth, tariffType]);

  // Appliance monthly kWh helper - Inverter-aware parity with Forecasting
  const getApplianceMonthlyKwh = (a: UserAppliance): number => {
    const hours = Number(a.hours_per_day) || 0;
    const dailyKwh = calculateApplianceKwh(a, hours);
    return Number((dailyKwh * daysInActiveMonth).toFixed(3));
  };

  // 1. Calculate space-by-space and consolidated monthly energy (strictly active appliances)
  const spaceAnalytics = useMemo(() => {
    let resTotalKwh = 0;
    let resTotalBill = 0;
    let comTotalKwh = 0;
    let comTotalBill = 0;

    const breakdownBySpace = spaces.map((space) => {
      const spaceApps = appliances.filter(
        (a) => (a.list_id === space.id || (!a.list_id && space.is_default)) && a.is_active !== false
      );
      const kwh = spaceApps.reduce((acc, curr) => acc + getApplianceMonthlyKwh(curr), 0);
      const billResult = calculateMeralcoBill(kwh, undefined, 0, false, space.tariff_type);

      if (space.tariff_type === "commercial") {
        comTotalKwh += kwh;
        comTotalBill += billResult.totalBill;
      } else {
        resTotalKwh += kwh;
        resTotalBill += billResult.totalBill;
      }

      return {
        space,
        kwh: Math.round(kwh * 10) / 10,
        bill: billResult.totalBill,
        devicesCount: spaceApps.length,
      };
    });

    const consolidatedTotalBill = breakdownBySpace.reduce((acc, curr) => acc + curr.bill, 0);
    const consolidatedTotalKwh = resTotalKwh + comTotalKwh;

    return {
      breakdownBySpace,
      consolidatedTotalBill,
      consolidatedTotalKwh,
      resTotalBill,
      comTotalBill,
      resTotalKwh,
      comTotalKwh,
    };
  }, [appliances, spaces, daysInActiveMonth]);

  // Target monthly kWh baseline
  const totalMonthlyKwh = useMemo(() => {
    if (selectedSpaceId === "all") {
      return spaceAnalytics.consolidatedTotalKwh;
    }
    return targetAppliances.reduce((acc, curr) => acc + getApplianceMonthlyKwh(curr), 0);
  }, [selectedSpaceId, spaceAnalytics, targetAppliances]);

  // Active energy volume based on verified actuals / simulated mode / routine baseline
  const activeEnergyVolume = useMemo(() => {
    if (dataSourceMode === "actual") {
      // Strictly show actual measured telemetry (0 if no sessions logged)
      return actualAggregates.totalKwh;
    }
    if (dataSourceMode === "simulated") {
      return simulatedAggregates.totalKwh;
    }
    return totalMonthlyKwh;
  }, [dataSourceMode, actualAggregates, simulatedAggregates, totalMonthlyKwh]);

  const bill = useMemo(() => {
    if (dataSourceMode === "actual" && !actualAggregates.hasRecords) {
      return calculateMeralcoBill(0, undefined, 0, false, tariffType);
    }
    const tariff = selectedSpaceId === "all" ? "residential" : tariffType;
    return calculateMeralcoBill(activeEnergyVolume, undefined, 0, false, tariff);
  }, [selectedSpaceId, activeEnergyVolume, tariffType, dataSourceMode, actualAggregates.hasRecords]);

  // Actual spend displays true measured audit spend; baseline and simulated display unbundled Meralco bill
  const totalCost = useMemo(() => {
    if (dataSourceMode === "actual") {
      return actualAggregates.hasRecords ? actualAggregates.totalCost : 0;
    }
    if (dataSourceMode === "simulated") {
      return simulatedAggregates.totalCost;
    }
    if (selectedSpaceId === "all") {
      return spaceAnalytics.consolidatedTotalBill;
    }
    return bill.totalBill;
  }, [dataSourceMode, actualAggregates, simulatedAggregates, selectedSpaceId, spaceAnalytics.consolidatedTotalBill, bill.totalBill]);

  const effectiveRate = activeEnergyVolume > 0 ? totalCost / activeEnergyVolume : bill.effectiveRatePerKwh || 0;

  // Running appliances count
  const runningAppliances = targetAppliances.filter((a) => a.is_currently_on);

  // Distribution Tier detection based on active volume
  const distributionTierInfo = useMemo(() => {
    if (tariffType === "commercial") {
      return { tier: "Commercial GP", label: "Flat ₱1.652/kWh", color: "info.main" };
    }
    if (activeEnergyVolume <= 0) {
      return {
        tier: dataSourceMode === "actual" ? "Zero MTD Actuals" : "No Active Load",
        label: dataSourceMode === "actual" ? "No stopwatch runtime" : "0 kWh configured",
        color: "text.secondary",
      };
    }
    if (activeEnergyVolume <= 100) {
      return { tier: "Lifeline Tier", label: "≤100 kWh (Subsidized)", color: "success.main" };
    }
    if (activeEnergyVolume <= 200) {
      return { tier: "Tier 1 (0-200)", label: "Base ₱0.9803/kWh", color: "primary.main" };
    }
    if (activeEnergyVolume <= 300) {
      return { tier: "Tier 2 (201-300)", label: "Dist. ₱1.2908/kWh", color: "info.main" };
    }
    if (activeEnergyVolume <= 400) {
      return { tier: "Tier 3 (301-400)", label: "Dist. ₱1.5837/kWh", color: "warning.main" };
    }
    return { tier: "Tier 4 (401+)", label: "Peak Dist. ₱2.0941/kWh", color: "error.main" };
  }, [activeEnergyVolume, tariffType]);

  // DOE PELP & Energy Efficiency Ratio
  const efficiencyMetrics = useMemo(() => {
    if (targetAppliances.length === 0) {
      return { efficiencyPct: 100, inverterCount: 0, totalCount: 0, grade: "A+" };
    }
    const inverterOrPelpCount = targetAppliances.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const cat = (a.category || "").toLowerCase();
      const rating = (a.energy_rating || "").toLowerCase();
      const source = a.source || "";
      return (
        name.includes("inverter") ||
        cat.includes("inverter") ||
        rating.includes("star") ||
        rating.includes("5") ||
        rating.includes("4") ||
        source === "pelp_db"
      );
    }).length;

    const efficiencyPct = Math.round((inverterOrPelpCount / targetAppliances.length) * 100);
    let grade = "B";
    if (efficiencyPct >= 80) grade = "A+";
    else if (efficiencyPct >= 60) grade = "A";
    else if (efficiencyPct >= 40) grade = "B";
    else grade = "C";

    return {
      efficiencyPct,
      inverterCount: inverterOrPelpCount,
      totalCount: targetAppliances.length,
      grade,
    };
  }, [targetAppliances]);

  // Standby & Vampire Load calculation
  const vampireLoadMetrics = useMemo(() => {
    let standbyWattsTotal = 0;
    let vampireDevicesCount = 0;

    targetAppliances.forEach((a) => {
      const cat = (a.category || "").toLowerCase();
      const name = (a.name || "").toLowerCase();
      const qty = a.quantity || 1;

      let standbyPerUnit = 0;
      if (cat.includes("tv") || cat.includes("television") || cat.includes("audio") || name.includes("tv")) {
        standbyPerUnit = 5;
      } else if (cat.includes("kitchen") || name.includes("microwave") || name.includes("coffee")) {
        standbyPerUnit = 3;
      } else if (cat.includes("computer") || name.includes("pc") || name.includes("laptop")) {
        standbyPerUnit = 8;
      } else if (name.includes("charger") || name.includes("adapter") || cat.includes("electronic")) {
        standbyPerUnit = 2;
      }

      if (standbyPerUnit > 0) {
        const idleHours = Math.max(0, 24 - (Number(a.hours_per_day) || 4));
        standbyWattsTotal += (standbyPerUnit * qty * idleHours) / 24;
        vampireDevicesCount += qty;
      }
    });

    const standbyMonthlyKwh = (standbyWattsTotal * 24 * 30) / 1000;
    const standbyMonthlyCost = standbyMonthlyKwh * effectiveRate;

    return {
      standbyWattsTotal: Math.round(standbyWattsTotal),
      standbyMonthlyKwh: Math.round(standbyMonthlyKwh * 10) / 10,
      standbyMonthlyCost: Math.round(standbyMonthlyCost * 100) / 100,
      vampireDevicesCount,
    };
  }, [targetAppliances, effectiveRate]);

  // Fingerprint of current inventory for change detection
  const currentInventoryFingerprint = useMemo(
    () => computeInventoryFingerprint(targetAppliances, totalMonthlyKwh),
    [targetAppliances, totalMonthlyKwh]
  );

  // Detect if appliances or consumption data changed since last AI audit
  const hasInventoryChanged = useMemo(() => {
    if (!hasGeneratedAiTips || !savedInventoryHash) return false;
    return savedInventoryHash !== currentInventoryFingerprint;
  }, [hasGeneratedAiTips, savedInventoryHash, currentInventoryFingerprint]);

  // Comprehensive Live Actual Tracker Telemetry
  const liveTrackerMetrics = useMemo(() => {
    const runningApps = targetAppliances.filter((a) => a.is_currently_on);
    const liveWatts = runningApps.reduce(
      (acc, a) => acc + (Number(a.watts) || 0) * (Number(a.quantity) || 1),
      0
    );
    const runningNames = runningApps.map((a) => a.name);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayRecords = dailyUsageRecords.filter((r) => r.usage_date === todayStr);
    const todayKwh = todayRecords.reduce((acc, r) => acc + (Number(r.kwh_consumed) || 0), 0);
    const todayCost = todayRecords.reduce((acc, r) => acc + (Number(r.estimated_cost) || 0), 0);

    return {
      runningCount: runningApps.length,
      liveWattsNow: Math.round(liveWatts),
      runningApplianceNames: runningNames,
      todayMeasuredKwh: Number(todayKwh.toFixed(2)),
      todayMeasuredCost: Number(todayCost.toFixed(2)),
      hasActualHistory: actualAggregates.hasRecords,
      totalMeasuredKwh: actualAggregates.totalKwh,
      totalMeasuredCost: actualAggregates.totalCost,
    };
  }, [targetAppliances, dailyUsageRecords, actualAggregates]);

  // Load persisted AI tips (retained across logout, refresh, and system exit)
  useEffect(() => {
    const persisted = getPersistedAiTips(userId, selectedSpaceId);
    if (persisted && persisted.tips && persisted.tips.length > 0) {
      setAiTips(persisted.tips);
      setAiTipsGeneratedAt(persisted.generatedAt);
      setAiTipsIsFallback(persisted.isFallback);
      setSavedInventoryHash(persisted.inventoryHash || "");
      setHasGeneratedAiTips(true);
    } else {
      setAiTips([]);
      setAiTipsGeneratedAt(null);
      setAiTipsIsFallback(false);
      setSavedInventoryHash("");
      setHasGeneratedAiTips(false);
    }
    setDailyQuota(getDailyAiQuota(userId));
  }, [selectedSpaceId, userId]);

  // Trigger on-demand data-driven Gemini AI energy audit
  const handleGenerateAiTips = async (force = false) => {
    if (isGeneratingAiTips) return;
    const currentQuota = getDailyAiQuota(userId);
    if (currentQuota.remaining <= 0) {
      setDailyQuota(currentQuota);
      return;
    }

    setIsGeneratingAiTips(true);
    try {
      const res = await generateAiEnergyTips(
        {
          appliances: targetAppliances,
          totalMonthlyKwh,
          totalCost,
          effectiveRate,
          tariffType,
          distributionTier: distributionTierInfo,
          efficiencyMetrics,
          vampireMetrics: vampireLoadMetrics,
          liveTrackerMetrics,
          spaceId: selectedSpaceId,
          userId,
        },
        force
      );
      setAiTips(res.tips);
      setAiTipsGeneratedAt(res.generatedAt);
      setAiTipsIsFallback(res.isFallback);
      setSavedInventoryHash(res.inventoryHash || currentInventoryFingerprint);
      setHasGeneratedAiTips(true);
      setDailyQuota(getDailyAiQuota(userId));
    } catch (err: any) {
      devLog.error("Analytics", "Failed to generate AI energy tips", { error: err });
    } finally {
      setIsGeneratingAiTips(false);
    }
  };

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { kwh: number; count: number }> = {};

    if (dataSourceMode === "actual") {
      if (!actualAggregates.hasRecords) {
        return [];
      }
      targetAppliances.forEach((a) => {
        const cat = a.category || "General";
        const kwh = actualAggregates.catMap[cat] || 0;
        if (!catMap[cat]) catMap[cat] = { kwh: 0, count: 0 };
        catMap[cat].kwh = kwh;
        catMap[cat].count += a.quantity || 1;
      });
    } else if (dataSourceMode === "simulated") {
      targetAppliances.forEach((a) => {
        const cat = a.category || "General";
        const kwh = simulatedAggregates.catMap[cat] || 0;
        if (!catMap[cat]) catMap[cat] = { kwh: 0, count: 0 };
        catMap[cat].kwh = kwh;
        catMap[cat].count += a.quantity || 1;
      });
    } else {
      targetAppliances.forEach((a) => {
        const cat = a.category || "General";
        const kwh = getApplianceMonthlyKwh(a);
        if (!catMap[cat]) catMap[cat] = { kwh: 0, count: 0 };
        catMap[cat].kwh += kwh;
        catMap[cat].count += a.quantity || 1;
      });
    }

    const totalKwh = Object.values(catMap).reduce((acc, curr) => acc + curr.kwh, 0) || 1;
    return Object.entries(catMap)
      .map(([category, data]) => ({
        name: category,
        kwh: data.kwh,
        cost: totalKwh > 0 ? (data.kwh / totalKwh) * totalCost : 0,
        percentage: Math.round((data.kwh / totalKwh) * 100),
        count: data.count,
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [targetAppliances, totalCost, dataSourceMode, actualAggregates, simulatedAggregates]);

  // Individual Top Appliances Breakdown (Pareto)
  const topAppliancesBreakdown = useMemo(() => {
    if (dataSourceMode === "actual" && !actualAggregates.hasRecords) {
      return [];
    }

    const effectiveTotalKwh =
      dataSourceMode === "actual" && actualAggregates.hasRecords
        ? actualAggregates.totalKwh
        : dataSourceMode === "simulated"
        ? simulatedAggregates.totalKwh
        : totalMonthlyKwh || 1;

    return [...targetAppliances]
      .map((a) => {
        const kwh =
          dataSourceMode === "actual" && actualAggregates.hasRecords
            ? actualAggregates.appMap[a.id] || 0
            : dataSourceMode === "simulated"
            ? simulatedAggregates.appMap[a.id] || 0
            : getApplianceMonthlyKwh(a);

        return {
          id: a.id,
          name: a.name,
          category: a.category,
          watts: a.watts,
          quantity: a.quantity || 1,
          hours: a.hours_per_day,
          kwh: kwh,
          cost: effectiveTotalKwh > 0 ? (kwh / effectiveTotalKwh) * totalCost : 0,
          percentage: Math.round((kwh / effectiveTotalKwh) * 100),
          isCurrentlyOn: a.is_currently_on,
        };
      })
      .sort((a, b) => b.kwh - a.kwh);
  }, [targetAppliances, totalMonthlyKwh, totalCost, dataSourceMode, actualAggregates, simulatedAggregates]);

  // Unbundled Rate Components breakdown
  const rateComponents = useMemo(() => {
    const c = isDark ? tokens.dark.chart : tokens.light.chart;
    return [
      { name: "Generation Charge", amount: bill.generationTotal, color: c[0], desc: "Cost of producing electricity by generation power plants" },
      { name: "Transmission Charge", amount: bill.transmissionTotal, color: c[1], desc: "High-voltage transmission grid wheeling fee (NGCP)" },
      { name: "System Loss Charge", amount: bill.systemLossTotal, color: c[2], desc: "Technical & non-technical line losses allowed by ERC" },
      { name: "Distribution Network", amount: bill.distributionTotal, color: c[3], desc: "Meralco poles, wires, meters, customer billing & supply" },
      { name: "Government Taxes & VAT", amount: bill.totalVat + bill.localFranchiseTax, color: c[4], desc: "12% National Value Added Tax & Local Franchise Tax" },
      { name: "Universal & FIT-All Charges", amount: bill.universalCharges.total + bill.fitAll + bill.lifelineSubsidy, color: isDark ? tokens.dark.textSecondary : tokens.light.textSecondary, desc: "Missionary electrification, stranded debts, and RE Feed-in Tariff" },
    ];
  }, [bill, isDark]);



  // Pure Appliance Baseline Multi-Month Trend & Predictions (No fake past months, No weather multipliers)
  const MONTHLY_TREND_DATA = useMemo(() => {
    const points = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentDay = now.getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Group records by YYYY-MM based on selected data source
    const usageByMonthKey: Record<string, { kwh: number; cost: number; daysCount: number }> = {};
    const sourceRecords = dataSourceMode === "actual" ? dailyUsageRecords : (simulatedUsageRecords as any);
    sourceRecords.forEach((r: any) => {
      if (!r.usage_date) return;
      const monthKey = r.usage_date.substring(0, 7);
      if (!usageByMonthKey[monthKey]) {
        usageByMonthKey[monthKey] = { kwh: 0, cost: 0, daysCount: 0 };
      }
      usageByMonthKey[monthKey].kwh += Number(r.kwh_consumed) || 0;
      usageByMonthKey[monthKey].cost += Number(r.estimated_cost) || 0;
      usageByMonthKey[monthKey].daysCount += 1;
    });

    // 2. Prior Months (Past 6 Months)
    for (let offset = 6; offset >= 1; offset--) {
      const targetDate = new Date(currentYear, currentMonthIdx - offset, 1);
      const tYear = targetDate.getFullYear();
      const tMonthIdx = targetDate.getMonth();
      const monthKey = `${tYear}-${String(tMonthIdx + 1).padStart(2, "0")}`;
      const monthStr = monthNames[tMonthIdx];

      const recorded = usageByMonthKey[monthKey];
      if (recorded && recorded.kwh > 0) {
        points.push({
          month: monthStr,
          kwh: Math.round(recorded.kwh),
          cost: Math.round(recorded.cost),
          status: dataSourceMode === "actual" ? "Recorded Actuals" : "Simulated Plan History",
          type: dataSourceMode === "actual" ? "recorded" : "simulated",
          fillColor: dataSourceMode === "actual"
            ? (isDark ? tokens.dark.live : tokens.light.live)
            : (isDark ? tokens.dark.chart[1] : tokens.light.chart[1]),
        });
      }
    }

    // 3. Current Active Month (e.g., Aug)
    const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;
    const currentRecorded = usageByMonthKey[currentMonthKey];
    const mtdKwh = currentRecorded && currentRecorded.kwh > 0
      ? currentRecorded.kwh
      : totalMonthlyKwh * (currentDay / daysInCurrentMonth);
    const remainingKwh = totalMonthlyKwh * ((daysInCurrentMonth - currentDay) / daysInCurrentMonth);
    const totalActiveKwh = mtdKwh + remainingKwh;
    const totalActiveCost = totalActiveKwh * effectiveRate;

    points.push({
      month: `${monthNames[currentMonthIdx]} (${dataSourceMode === "actual" ? "Active" : "Simulated"})`,
      kwh: Math.round(totalActiveKwh),
      cost: Math.round(totalActiveCost),
      status: `${dataSourceMode === "actual" ? "Active Cycle" : "Simulated Cycle"} • Day ${currentDay} of ${daysInCurrentMonth} (MTD + Projected)`,
      type: "active",
      fillColor: isDark ? tokens.dark.live : tokens.light.live,
    });

    // 4. Future Months (Next 5 Months): Pure Baseline Prediction from registered appliance routines
    for (let offset = 1; offset <= 5; offset++) {
      const targetDate = new Date(currentYear, currentMonthIdx + offset, 1);
      const tMonthIdx = targetDate.getMonth();
      const monthStr = monthNames[tMonthIdx];

      points.push({
        month: `${monthStr} (Predicted)`,
        kwh: Math.round(totalMonthlyKwh),
        cost: Math.round(totalCost),
        status: "Predicted Cycle • Based on active appliance baseline routine",
        type: "predicted",
        fillColor: isDark ? tokens.dark.borderStrong : tokens.light.borderStrong,
      });
    }

    return points;
  }, [dailyUsageRecords, simulatedUsageRecords, dataSourceMode, totalMonthlyKwh, totalCost, effectiveRate, isDark]);



  // Export CSV handler
  const handleExportCsv = () => {
    let csv = `PowerForecast Energy Analytics Report\n`;
    csv += `Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    csv += `Scope: ${selectedSpaceId === "all" ? "All Spaces (Consolidated)" : activeSpace?.name || "Selected Space"}\n`;
    csv += `Tariff Type: ${tariffType.toUpperCase()}\n`;
    csv += `Total Monthly kWh: ${totalMonthlyKwh.toFixed(2)} kWh\n`;
    csv += `Forecasted Bill: PHP ${totalCost.toFixed(2)}\n`;
    csv += `Effective Rate: PHP ${effectiveRate.toFixed(4)} / kWh\n\n`;

    csv += `--- APPLIANCE INVENTORY BREAKDOWN ---\n`;
    csv += `Appliance Name,Category,Rated Watts,Qty,Hours/Day,Monthly kWh,Monthly Cost (PHP)\n`;
    topAppliancesBreakdown.forEach((a) => {
      csv += `"${a.name}","${a.category}",${a.watts},${a.quantity},${a.hours},${a.kwh.toFixed(2)},${a.cost.toFixed(2)}\n`;
    });

    csv += `\n--- CATEGORY BREAKDOWN ---\n`;
    csv += `Category,Devices Count,Monthly kWh,Cost (PHP),Percentage Share\n`;
    categoryBreakdown.forEach((c) => {
      csv += `"${c.name}",${c.count},${c.kwh.toFixed(2)},${c.cost.toFixed(2)},${c.percentage}%\n`;
    });

    csv += `\n--- ERC UNBUNDLED TARIFF CHARGES ---\n`;
    csv += `Charge Component,Amount (PHP),Share of Bill\n`;
    rateComponents.forEach((r) => {
      const pct = totalCost > 0 ? ((r.amount / totalCost) * 100).toFixed(1) : "0.0";
      csv += `"${r.name}",${r.amount.toFixed(2)},${pct}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PowerForecast_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Header Banner & Action Buttons */}
      <PageHeader
        title="Energy Analytics & Cost Distribution"
        subtitle="Telemetry breakdown, DOE PELP inventory efficiency, ERC unbundled cost allocation, and diurnal load profiles."
        actions={
          <>
            {/* Top Level Mode Switcher: Actuals vs Simulated */}
            <Box
              sx={{
                display: "inline-flex",
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
                onClick={() => setDataSourceMode("actual")}
                startIcon={<AnalyticsIcon sx={{ fontSize: 15 }} />}
                sx={{
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.5,
                  py: 0.5,
                  textTransform: "none",
                  bgcolor:
                    dataSourceMode === "actual"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    dataSourceMode === "actual"
                      ? (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary
                      : "text.secondary",
                  boxShadow: dataSourceMode === "actual" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                Verified Actuals
              </Button>
              <Button
                size="small"
                onClick={() => setDataSourceMode("simulated")}
                startIcon={<ScienceIcon sx={{ fontSize: 15 }} />}
                sx={{
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.5,
                  py: 0.5,
                  textTransform: "none",
                  bgcolor:
                    dataSourceMode === "simulated"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    dataSourceMode === "simulated"
                      ? (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary
                      : "text.secondary",
                  boxShadow: dataSourceMode === "simulated" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  "&:hover": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.hover : tokens.light.hover),
                  },
                }}
              >
                Simulated Plan
              </Button>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={handleExportCsv}
              startIcon={<FileDownloadIcon sx={{ fontSize: 15 }} />}
              sx={{
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
              Export CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.print()}
              startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
              sx={{
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
              Print Report
            </Button>
          </>
        }
      />

      {/* 2. Space Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          p: 0.5,
          borderRadius: 1,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
          display: "flex",
          alignItems: "center",
          overflowX: "auto",
        }}
      >
        <Tabs
          value={selectedSpaceId}
          onChange={(_, val) => setSelectedSpaceId(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            "& .MuiTab-root": {
              minHeight: 36,
              fontWeight: 600,
              fontSize: "0.8125rem",
              textTransform: "none",
              borderRadius: 0.75,
              px: 1.5,
              py: 0.5,
              color: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
              "&.Mui-selected": {
                color: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary,
                fontWeight: 600,
              },
            },
            "& .MuiTabs-indicator": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary,
              height: 2,
              borderRadius: 1,
            },
          }}
        >
          <Tab
            value="all"
            icon={<AnalyticsIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`All Spaces (${appliances.length} devices)`}
          />
          {spaces.map((space) => {
            const count = appliances.filter((a) => a.list_id === space.id || (!a.list_id && space.is_default)).length;
            const isCommercial = space.tariff_type === "commercial";
            return (
              <Tab
                key={space.id}
                value={space.id}
                icon={isCommercial ? <StoreIcon sx={{ fontSize: 16 }} /> : <HomeIcon sx={{ fontSize: 16 }} />}
                iconPosition="start"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <span>{space.name}</span>
                    <Chip
                      label={isCommercial ? "Commercial" : "Residential"}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        color: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary,
                        border: "1px solid",
                        borderColor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.75rem",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ({count})
                    </Typography>
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* 3. KPI Metrics Cards */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} data-tour="analytics-kpi-row">
        {/* Monthly Volume */}
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <MetricCard
            title={dataSourceMode === "actual" ? "Actual Energy Volume (MTD)" : "Monthly Energy Volume"}
            value={`${activeEnergyVolume.toFixed(1)} kWh`}
            subtitle={
              dataSourceMode === "actual"
                ? actualAggregates.hasRecords
                  ? `${targetAppliances.length} devices • Verified Measured Truth`
                  : "No sessions recorded yet this cycle"
                : `${targetAppliances.length} appliances • ${runningAppliances.length} live ON`
            }
            icon={<BoltIcon sx={{ fontSize: 16 }} />}
            infoTooltip="Cumulative kilowatt-hours (kWh) consumed in the active billing cycle. In Verified Actuals mode, this comes directly from your recorded appliance stopwatch logs and daily telemetry."
            trend={{
              value:
                dataSourceMode === "actual"
                  ? "Recorded Actuals"
                  : dataSourceMode === "simulated"
                  ? "Simulation Plan"
                  : distributionTierInfo.tier,
              direction: distributionTierInfo.tier.includes("Lifeline") ? "up" : "neutral",
              label: distributionTierInfo.label,
            }}
          />
        </Grid>

        {/* Spend / Bill */}
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <MetricCard
            title={dataSourceMode === "actual" ? "Actual Measured Spend (MTD)" : "Forecasted Monthly Bill"}
            value={`₱${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`Effective: ₱${effectiveRate.toFixed(2)}/kWh`}
            icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
            infoTooltip="Real-time month-to-date electricity bill in Philippine Pesos (₱) calculated using the official ERC unbundled Meralco tariff formula, accounting for active distribution tiers and pass-through charges."
            trend={{
              value:
                dataSourceMode === "actual"
                  ? "Verified Audit"
                  : dataSourceMode === "simulated"
                  ? "Target Budget"
                  : `₱${(totalCost / 30).toFixed(0)}/day`,
              direction: "neutral",
              label: isCommercialSelected ? "Commercial GP" : "Meralco Unbundled",
            }}
          />
        </Grid>

        {/* DOE PELP Efficiency */}
        <Grid size={{ xs: 12, sm: 4, md: 4 }}>
          <MetricCard
            title="DOE PELP & Inverter Rating"
            value={`${efficiencyMetrics.efficiencyPct}%`}
            subtitle={`${efficiencyMetrics.inverterCount} of ${efficiencyMetrics.totalCount} certified efficient`}
            icon={<LeafIcon sx={{ fontSize: 16 }} />}
            infoTooltip="Evaluates your appliance inventory against the Department of Energy (DOE) Philippine Energy Labeling Program (PELP). Shows the percentage of your appliances utilizing certified energy-saving inverter technology."
            trend={{
              value: `Grade ${efficiencyMetrics.grade}`,
              direction: efficiencyMetrics.grade.includes("A") ? "up" : "neutral",
              label: "Inverter ratio",
            }}
          />
        </Grid>
      </Grid>

      {/* 4. Grouped Category / Pareto Ranking & Unbundled Cost Distribution */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }}>
        {/* Left: Appliance Category Share & Top Consumers (Pareto) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionCard
            dataTour="analytics-category-bars"
            title={breakdownView === "category" ? "Energy Usage by Category" : "Top Consuming Appliances (Pareto)"}
            subtitle="Breakdown of energy consumption and monetary share across categories or top appliances"
            infoTooltip="Breaks down your total consumption into functional categories or individual top appliances. Shows each item's proportional share of both total kWh and peso cost."
            headerActions={
              <Box
                sx={{
                  display: "inline-flex",
                  p: "2px",
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
                  onClick={() => setBreakdownView("category")}
                  startIcon={<CategoryIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 0.75,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    px: 1.25,
                    py: 0.35,
                    textTransform: "none",
                    bgcolor:
                      breakdownView === "category"
                        ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                        : "transparent",
                    color:
                      breakdownView === "category"
                        ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary)
                        : "text.secondary",
                  }}
                >
                  Categories
                </Button>
                <Button
                  size="small"
                  onClick={() => setBreakdownView("appliances")}
                  startIcon={<ListIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderRadius: 0.75,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    px: 1.25,
                    py: 0.35,
                    textTransform: "none",
                    bgcolor:
                      breakdownView === "appliances"
                        ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                        : "transparent",
                    color:
                      breakdownView === "appliances"
                        ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary)
                        : "text.secondary",
                  }}
                >
                  Top Devices
                </Button>
              </Box>
            }
            sx={{ height: "100%" }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, justifyContent: "center" }}>
              {targetAppliances.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  No appliances registered in this space. Add appliances to inspect category shares.
                </Typography>
              ) : dataSourceMode === "actual" && !actualAggregates.hasRecords ? (
                <Box sx={{ py: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <ClockIcon sx={{ fontSize: 32, color: "text.secondary", opacity: 0.6 }} />
                  <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                    No Verified Actuals Logged Yet
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 360 }}>
                    Start an appliance stopwatch or log daily telemetry to see real measured category consumption and spend.
                  </Typography>
                </Box>
              ) : breakdownView === "category" ? (
                categoryBreakdown.map((item) => (
                  <Box key={item.name} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {item.name} ({item.count} unit{item.count > 1 ? "s" : ""})
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {item.kwh.toFixed(1)} kWh ({item.percentage}%) •{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "text.primary",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          ₱{item.cost.toFixed(2)}
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 1,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.textSecondary,
                        },
                      }}
                    />
                  </Box>
                ))
              ) : (
                topAppliancesBreakdown.slice(0, 6).map((app) => (
                  <Box key={app.id} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                          {app.name}
                        </Typography>
                        {app.isCurrentlyOn && (
                          <Chip
                            label="LIVE ON"
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg,
                              color: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live,
                              border: "1px solid",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder,
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {app.kwh.toFixed(1)} kWh ({app.percentage}%) •{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: "text.primary",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          ₱{app.cost.toFixed(2)}
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={app.percentage}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 1,
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.textSecondary,
                        },
                      }}
                    />
                  </Box>
                ))
              )}
            </Box>
          </SectionCard>
        </Grid>

        {/* Right: Unbundled Rate Component Distribution */}
        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard
            title="Unbundled Tariff Split"
            subtitle="ERC regulated breakdown of your projected monthly bill"
            infoTooltip="Decomposes your electricity cost into regulated ERC components: Generation (power plants & WESM), Transmission (NGCP grid), Distribution (Meralco wires & meters), System Loss, Taxes (VAT & LFT), and Universal Charges."
            sx={{ height: "100%" }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, my: 0.5 }}>
                {rateComponents.map((c) => (
                  <Box key={c.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: c.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {c.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      ₱{c.amount.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Box>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Total Projected Bill
                  </Typography>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "text.primary",
                    }}
                  >
                    ₱{totalCost.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </SectionCard>
        </Grid>
      </Grid>

      {/* 5. Multi-Month Trend & Predictive Baseline Forecast */}
      <SectionCard
        dataTour="analytics-historical-trend"
        title="Multi-Month Consumption Trend & Predictive Forecast"
        subtitle="Active billing cycle telemetry alongside forward-looking baseline predictions based on your registered appliance routines"
        infoTooltip="Visualizes your historical monthly power usage alongside the active billing cycle and forward-looking baseline projections based on your registered appliance routines."
        headerActions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box
              sx={{
                display: "inline-flex",
                p: "2px",
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
                onClick={() => setDataSourceMode("actual")}
                startIcon={<AnalyticsIcon sx={{ fontSize: 14 }} />}
                sx={{
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.25,
                  py: 0.35,
                  textTransform: "none",
                  bgcolor:
                    dataSourceMode === "actual"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    dataSourceMode === "actual"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary)
                      : "text.secondary",
                }}
              >
                Verified Actuals
              </Button>
              <Button
                size="small"
                onClick={() => setDataSourceMode("simulated")}
                startIcon={<ScienceIcon sx={{ fontSize: 14 }} />}
                sx={{
                  borderRadius: 0.75,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1.25,
                  py: 0.35,
                  textTransform: "none",
                  bgcolor:
                    dataSourceMode === "simulated"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.active : tokens.light.active)
                      : "transparent",
                  color:
                    dataSourceMode === "simulated"
                      ? (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary)
                      : "text.secondary",
                }}
              >
                Simulated History
              </Button>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              {MONTHLY_TREND_DATA.some((d) => d.type === "recorded" || d.type === "simulated") && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live),
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    {dataSourceMode === "actual" ? "Recorded Actuals" : "Simulated Plan"}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live),
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Active Cycle</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>Predicted Baseline</Typography>
              </Box>
            </Box>
          </Box>
        }
      >
        <Box sx={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? tokens.zinc[400] : tokens.zinc[600] }} stroke={isDark ? tokens.zinc[800] : tokens.zinc[300]} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? tokens.zinc[400] : tokens.zinc[600] }} stroke={isDark ? tokens.zinc[800] : tokens.zinc[300]} unit=" kWh" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surface),
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                          color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textPrimary : tokens.light.textPrimary),
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                            {d.month}
                          </Typography>
                          {d.type === "predicted" && (
                            <Chip
                              label="PREDICTED"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surfaceSubtle),
                                border: "1px solid",
                                borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                                color: "text.secondary",
                              }}
                            />
                          )}
                          {d.type === "active" && (
                            <Chip
                              label="ACTIVE"
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
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "text.primary",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.95rem",
                          }}
                        >
                          {d.kwh} kWh (~₱{d.cost.toLocaleString()})
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, fontSize: "0.72rem" }}>
                          {d.status}
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                {MONTHLY_TREND_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </SectionCard>

      {/* 6. AI Smart Energy Audit & Actionable Insights */}
      <SectionCard
        dataTour="analytics-insights"
        title="AI Smart Energy Audit & Actionable Insights"
        subtitle="Practical recommendations based on your appliance load profile and Meralco tariff structure"
        infoTooltip="Provides AI-generated optimization tips tailored to your specific load profile and Meralco rate structure, identifying peak-hour shifts and potential monthly peso savings."
        headerActions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <TooltipMui title={`Each user receives ${MAX_DAILY_AI_GENERATIONS} AI energy audits per day to preserve API tokens. Quota resets at 12:00 AM.`}>
              <Chip
                label={`${dailyQuota.remaining}/${dailyQuota.max} Audits Left Today`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                  color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.textSecondary : tokens.light.textSecondary),
                }}
              />
            </TooltipMui>

            {hasGeneratedAiTips && (
              <>
                <Chip
                  icon={<SparklesIcon sx={{ fontSize: "13px !important" }} />}
                  label={aiTipsIsFallback ? "Rule Engine Baseline" : "Google Gemini AI"}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
                    border: "1px solid",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                  }}
                />
                {aiTipsGeneratedAt && (
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                    Updated {aiTipsGeneratedAt}
                  </Typography>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isGeneratingAiTips ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 14 }} />}
                  onClick={() => handleGenerateAiTips(true)}
                  disabled={isGeneratingAiTips || dailyQuota.remaining <= 0}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                  }}
                >
                  {isGeneratingAiTips ? "Auditing..." : dailyQuota.remaining <= 0 ? "Limit Reached" : "Regenerate Tips"}
                </Button>
              </>
            )}
          </Box>
        }
      >
        {/* Change Alert: Notification banner when user adds/modifies appliances */}
        {hasInventoryChanged && hasGeneratedAiTips && (
          <Alert
            severity="warning"
            icon={<BoltIcon sx={{ fontSize: 18 }} />}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => handleGenerateAiTips(true)}
                disabled={isGeneratingAiTips || dailyQuota.remaining <= 0}
                sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.75rem" }}
              >
                Update Audit Now
              </Button>
            }
            sx={{
              mb: 2.5,
              borderRadius: 1,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBg : tokens.light.warnBg),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.warnBorder : tokens.light.warnBorder),
              fontSize: "0.8rem",
            }}
          >
            Telemetry Changed: Your appliance inventory or consumption data has been updated since your last AI audit. Regenerate tips to incorporate the latest telemetry!
          </Alert>
        )}

        {/* 1. Empty / Un-triggered State: Call To Action to preserve tokens */}
        {!hasGeneratedAiTips && !isGeneratingAiTips && (
          <Box
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 1,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SparklesIcon sx={{ color: "text.primary", fontSize: 22 }} />
            </Box>

            <Box sx={{ maxWidth: 520 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Personalized Energy Optimization with Gemini AI
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, fontSize: "0.85rem" }}>
                Generate actionable strategies tailored to your {targetAppliances.length} active appliance(s),
                identifying peak hour load shifts, inverter retrofits, and standby vampire power mitigation.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<SparklesIcon sx={{ fontSize: 16 }} />}
              onClick={() => handleGenerateAiTips(false)}
              disabled={targetAppliances.length === 0 || dailyQuota.remaining <= 0}
              sx={{
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primary : tokens.light.primary),
                color: (theme) => (theme.palette.mode === "dark" ? tokens.dark.primaryFg : tokens.light.primaryFg),
                fontWeight: 600,
                textTransform: "none",
                px: 2.5,
                py: 0.75,
                borderRadius: 1,
                fontSize: "0.82rem",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.zinc[200] : tokens.zinc[800]),
                  boxShadow: "none",
                },
              }}
            >
              {dailyQuota.remaining <= 0 ? "Daily Quota Reached (0/5)" : "Generate Tips from AI"}
            </Button>

            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
              Quota-Protected: {dailyQuota.remaining} of {dailyQuota.max} AI audits available today. Persisted permanently until you regenerate.
            </Typography>
          </Box>
        )}

        {/* 2. Loading State: Shimmering Skeletons */}
        {isGeneratingAiTips && (
          <Box sx={{ py: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: 2.5 }}>
              <CircularProgress size={18} color="inherit" />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                Auditing appliance loads & Meralco tariff tiers with Gemini AI...
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {[1, 2].map((k) => (
                <Grid key={k} size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 1,
                      bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
                      border: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                      <Skeleton variant="text" width="60%" height={24} />
                      <Skeleton variant="rounded" width={80} height={20} />
                    </Box>
                    <Skeleton variant="text" width="100%" height={18} />
                    <Skeleton variant="text" width="90%" height={18} />
                    <Skeleton variant="text" width="40%" height={18} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* 3. Generated State: Dynamic AI Recommendations */}
        {hasGeneratedAiTips && !isGeneratingAiTips && (
          <>
            {aiTipsIsFallback && (
              <Alert
                severity="info"
                sx={{
                  mb: 2,
                  borderRadius: 1,
                  fontSize: "0.78rem",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
                }}
              >
                Notice: Gemini API is in local offline mode. Showing verified rule-based energy audit recommendations.
              </Alert>
            )}

            <Grid container spacing={2}>
              {aiTips.length === 0 ? (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 2 }}>
                    Register appliances to generate customized energy-saving recommendations.
                  </Typography>
                </Grid>
              ) : (
                aiTips.map((rec) => (
                  <Grid key={rec.id} size={{ xs: 12, md: 6 }}>
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
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                            {rec.title}
                          </Typography>
                          <Chip
                            label={rec.saving}
                            size="small"
                            sx={{
                              height: 20,
                              fontWeight: 700,
                              fontSize: "0.7rem",
                              flexShrink: 0,
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surface : tokens.light.surface),
                              border: "1px solid",
                              borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderStrong : tokens.light.borderStrong),
                              color: "text.primary",
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5, display: "block" }}>
                          {rec.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}
      </SectionCard>
    </Box>
  );
};

export default AnalyticsView;
