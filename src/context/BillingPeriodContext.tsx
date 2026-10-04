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

import { supabaseClient } from "../lib/supabaseClient";
import { devLog } from "../lib/devLogger";

export const BILLING_CUTOFF_CONFIGURED_KEY = "powerforecast_billing_cutoff_configured_v1";

export const getUserCutoffConfiguredKey = (userId?: string | null): string => {
  return userId ? `powerforecast_billing_cutoff_user_${userId}_configured` : BILLING_CUTOFF_CONFIGURED_KEY;
};

export const getUserBillingConfigKey = (userId?: string | null): string => {
  return userId ? `powerforecast_billing_config_user_${userId}` : "powerforecast_billing_period_config_v1";
};

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
  // 0. Active User ID resolution
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("powerforecast_active_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.id || null;
      }
    } catch {}
    return null;
  });

  // 1. Initial config & onboarding status
  const [config, setConfig] = useState<BillingPeriodConfig>(() => {
    return getStoredBillingPeriodConfig();
  });

  const [hasConfiguredCutoff, setHasConfiguredCutoffState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const isNewAccount =
      sessionStorage.getItem("powerforecast_just_registered") === "true" ||
      sessionStorage.getItem("powerforecast_new_account_created") === "true";
    if (isNewAccount) return false;

    if (currentUserId) {
      return localStorage.getItem(getUserCutoffConfiguredKey(currentUserId)) === "true";
    }
    return localStorage.getItem(BILLING_CUTOFF_CONFIGURED_KEY) === "true";
  });

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Don't auto-open if on public / authentication screens
    const isPublicAuthRoute =
      window.location.hash.startsWith("#/login") ||
      window.location.hash.startsWith("#/signup") ||
      window.location.hash.startsWith("#/forgot-password") ||
      window.location.hash.startsWith("#/verify-email") ||
      window.location.hash.startsWith("#/verified") ||
      window.location.pathname === "/login" ||
      window.location.pathname === "/signup";

    const isNewAccount =
      sessionStorage.getItem("powerforecast_just_registered") === "true" ||
      sessionStorage.getItem("powerforecast_new_account_created") === "true";

    if (isNewAccount) return !isPublicAuthRoute;

    if (currentUserId) {
      const userConfigured = localStorage.getItem(getUserCutoffConfiguredKey(currentUserId)) === "true";
      return !userConfigured && !isPublicAuthRoute;
    }
    return !isPublicAuthRoute && localStorage.getItem(BILLING_CUTOFF_CONFIGURED_KEY) !== "true";
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Synchronize auth state and ensure newly created accounts trigger the popup
  useEffect(() => {
    const handleCheckUserCutoff = (userId?: string | null, metadata?: any) => {
      if (!userId) return;
      setCurrentUserId(userId);

      const isNewAccount =
        sessionStorage.getItem("powerforecast_just_registered") === "true" ||
        sessionStorage.getItem("powerforecast_new_account_created") === "true";

      const userConfigured =
        !isNewAccount &&
        (localStorage.getItem(getUserCutoffConfiguredKey(userId)) === "true" ||
          metadata?.billing_cutoff_configured === true);

      if (userConfigured) {
        setHasConfiguredCutoffState(true);
        // Load user-specific config if available
        const userSavedConfig = localStorage.getItem(getUserBillingConfigKey(userId));
        if (userSavedConfig) {
          try {
            setConfig(JSON.parse(userSavedConfig));
          } catch {}
        }
      } else {
        setHasConfiguredCutoffState(false);
        const isPublicAuthRoute =
          window.location.hash.startsWith("#/login") ||
          window.location.hash.startsWith("#/signup") ||
          window.location.hash.startsWith("#/forgot-password") ||
          window.location.hash.startsWith("#/verify-email");
        if (!isPublicAuthRoute) {
          devLog.info("Billing", "Triggering cutoff onboarding modal for account:", userId);
          setIsOnboardingModalOpen(true);
        }
      }
    };

    // Check current active session
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        handleCheckUserCutoff(data.session.user.id, data.session.user.user_metadata);
      }
    });

    // Listen for auth state events
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        handleCheckUserCutoff(session.user.id, session.user.user_metadata);
      } else if (event === "SIGNED_OUT") {
        setCurrentUserId(null);
      }
    });

    // Custom listener for new account registration
    const handleNewAccountEvent = () => {
      devLog.info("Billing", "Received powerforecast_new_account_created event. Opening cutoff modal.");
      setHasConfiguredCutoffState(false);
      setIsOnboardingModalOpen(true);
    };

    window.addEventListener("powerforecast_new_account_created", handleNewAccountEvent);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("powerforecast_new_account_created", handleNewAccountEvent);
    };
  }, []);

  const setHasConfiguredCutoff = useCallback((configured: boolean) => {
    setHasConfiguredCutoffState(configured);
    if (typeof window !== "undefined") {
      localStorage.setItem(BILLING_CUTOFF_CONFIGURED_KEY, configured ? "true" : "false");
      if (currentUserId) {
        localStorage.setItem(getUserCutoffConfiguredKey(currentUserId), configured ? "true" : "false");
      }
    }
  }, [currentUserId]);

  const updateConfig = useCallback((newConfig: BillingPeriodConfig) => {
    setConfig(newConfig);
    setStoredBillingPeriodConfig(newConfig);
    setHasConfiguredCutoff(true);

    if (typeof window !== "undefined") {
      // Clear registration flags
      sessionStorage.removeItem("powerforecast_just_registered");
      sessionStorage.removeItem("powerforecast_new_account_created");

      // Save user scoped configuration
      if (currentUserId) {
        localStorage.setItem(getUserBillingConfigKey(currentUserId), JSON.stringify(newConfig));
        localStorage.setItem(getUserCutoffConfiguredKey(currentUserId), "true");
      }
      localStorage.setItem(BILLING_CUTOFF_CONFIGURED_KEY, "true");

      // Broadcast for external listeners
      window.dispatchEvent(new CustomEvent("powerforecast_billing_config_updated", { detail: newConfig }));
    }

    // Sync to Supabase auth user metadata if authenticated
    try {
      supabaseClient.auth.updateUser({
        data: {
          billing_cutoff_day: newConfig.cycleStartDay,
          billing_cutoff_offset: newConfig.cycleEndOffset,
          billing_period_mode: newConfig.mode,
          billing_cutoff_configured: true,
        },
      }).catch((err) => {
        devLog.warn("Billing", "Could not sync cutoff to user metadata:", err);
      });
    } catch {}
  }, [currentUserId, setHasConfiguredCutoff]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_BILLING_PERIOD_CONFIG);
    setStoredBillingPeriodConfig(DEFAULT_BILLING_PERIOD_CONFIG);
    if (currentUserId && typeof window !== "undefined") {
      localStorage.removeItem(getUserBillingConfigKey(currentUserId));
    }
  }, [currentUserId]);

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
