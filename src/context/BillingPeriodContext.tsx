import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { BillingPeriodConfig, BillingPeriodWindow, BillingPeriodMode, CycleEndOffset } from "../types";
import {
  DEFAULT_BILLING_PERIOD_CONFIG,
  getStoredBillingPeriodConfig,
  setStoredBillingPeriodConfig,
  resolveBillingPeriodWindow,
  generateBillingPeriodCycles,
  formatDateToKey,
} from "../lib/dailyUsageService";
import {
  MeralcoTariffData,
  getTariffForBillingPeriod,
  MERALCO_SEPTEMBER_2026_TARIFF,
} from "../lib/meralcoRateService";

export const BILLING_CUTOFF_CONFIGURED_KEY = "powerforecast_billing_cutoff_configured_v1";

export type AnalyticsSortOption = "date_desc" | "date_asc" | "highest_spend" | "highest_kwh";
export type ForecastingHorizon = "now" | "next_cycle" | "three_months";

interface BillingPeriodContextType {
  config: BillingPeriodConfig;
  updateConfig: (newConfig: BillingPeriodConfig) => void;
  resetConfig: () => void;
  hasConfiguredCutoff: boolean;
  setHasConfiguredCutoff: (configured: boolean) => void;

  // Discrete cycle windows
  activeCycle: BillingPeriodWindow;
  allCycles: BillingPeriodWindow[];
  historicalCycles: BillingPeriodWindow[];
  futureCycles: BillingPeriodWindow[];

  // Analytics cycle selection & sorting
  selectedAnalyticsCycle: BillingPeriodWindow;
  setSelectedAnalyticsCycle: (cycle: BillingPeriodWindow) => void;
  analyticsSortBy: AnalyticsSortOption;
  setAnalyticsSortBy: (sort: AnalyticsSortOption) => void;

  // Forecasting horizon selection
  forecastingHorizon: ForecastingHorizon;
  setForecastingHorizon: (horizon: ForecastingHorizon) => void;

  // Modals
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (open: boolean) => void;
  isConfigModalOpen: boolean;
  setIsConfigModalOpen: (open: boolean) => void;

  // Cycle tariff resolver
  getCycleTariff: (cycle: BillingPeriodWindow) => MeralcoTariffData;
}

const BillingPeriodContext = createContext<BillingPeriodContextType | undefined>(undefined);

export const BillingPeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial config & onboarding status
  const [config, setConfig] = useState<BillingPeriodConfig>(() => {
    return getStoredBillingPeriodConfig();
  });

  const [hasConfiguredCutoff, setHasConfiguredCutoffState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(BILLING_CUTOFF_CONFIGURED_KEY) === "true";
  });

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const isConfigured = localStorage.getItem(BILLING_CUTOFF_CONFIGURED_KEY) === "true";
    return !isConfigured;
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  const setHasConfiguredCutoff = useCallback((configured: boolean) => {
    setHasConfiguredCutoffState(configured);
    if (typeof window !== "undefined") {
      localStorage.setItem(BILLING_CUTOFF_CONFIGURED_KEY, configured ? "true" : "false");
    }
  }, []);

  const updateConfig = useCallback((newConfig: BillingPeriodConfig) => {
    setConfig(newConfig);
    setStoredBillingPeriodConfig(newConfig);
    setHasConfiguredCutoff(true);
    // Broadcast for external listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("powerforecast_billing_config_updated", { detail: newConfig }));
    }
  }, [setHasConfiguredCutoff]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_BILLING_PERIOD_CONFIG);
    setStoredBillingPeriodConfig(DEFAULT_BILLING_PERIOD_CONFIG);
  }, []);

  // 2. Active cycle & discrete cycles generation
  const today = useMemo(() => new Date(), []);

  const activeCycle = useMemo(() => {
    const cycle = resolveBillingPeriodWindow(today, config);
    return {
      ...cycle,
      id: `cycle-${formatDateToKey(cycle.startDate)}_${formatDateToKey(cycle.endDate)}`,
      status: "present" as const,
    };
  }, [today, config]);

  const allCycles = useMemo(() => {
    return generateBillingPeriodCycles(today, config, 4, 3);
  }, [today, config]);

  // Historical cycles: past cycles + present cycle
  const historicalCycles = useMemo(() => {
    return allCycles.filter((c) => c.status === "past" || c.status === "present");
  }, [allCycles]);

  // Future cycles: present cycle + future cycles
  const futureCycles = useMemo(() => {
    return allCycles.filter((c) => c.status === "present" || c.status === "future");
  }, [allCycles]);

  // 3. Analytics selection state
  const [selectedAnalyticsCycle, setSelectedAnalyticsCycle] = useState<BillingPeriodWindow>(activeCycle);
  const [analyticsSortBy, setAnalyticsSortBy] = useState<AnalyticsSortOption>("date_desc");

  // Keep selectedAnalyticsCycle in sync when activeCycle changes or config updates
  useEffect(() => {
    setSelectedAnalyticsCycle(activeCycle);
  }, [activeCycle]);

  // 4. Forecasting horizon state
  const [forecastingHorizon, setForecastingHorizon] = useState<ForecastingHorizon>("now");

  // 5. Dynamic Tariff Resolver per Cycle
  const getCycleTariff = useCallback((cycle: BillingPeriodWindow): MeralcoTariffData => {
    return getTariffForBillingPeriod(cycle.startDate, cycle.endDate);
  }, []);

  const value = useMemo(
    () => ({
      config,
      updateConfig,
      resetConfig,
      hasConfiguredCutoff,
      setHasConfiguredCutoff,
      activeCycle,
      allCycles,
      historicalCycles,
      futureCycles,
      selectedAnalyticsCycle,
      setSelectedAnalyticsCycle,
      analyticsSortBy,
      setAnalyticsSortBy,
      forecastingHorizon,
      setForecastingHorizon,
      isOnboardingModalOpen,
      setIsOnboardingModalOpen,
      isConfigModalOpen,
      setIsConfigModalOpen,
      getCycleTariff,
    }),
    [
      config,
      updateConfig,
      resetConfig,
      hasConfiguredCutoff,
      setHasConfiguredCutoff,
      activeCycle,
      allCycles,
      historicalCycles,
      futureCycles,
      selectedAnalyticsCycle,
      analyticsSortBy,
      forecastingHorizon,
      isOnboardingModalOpen,
      isConfigModalOpen,
      getCycleTariff,
    ]
  );

  return <BillingPeriodContext.Provider value={value}>{children}</BillingPeriodContext.Provider>;
};

export const useBillingPeriod = (): BillingPeriodContextType => {
  const context = useContext(BillingPeriodContext);
  if (!context) {
    throw new Error("useBillingPeriod must be used within a BillingPeriodProvider");
  }
  return context;
};
