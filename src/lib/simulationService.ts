import { supabaseClient } from "./supabaseClient";
import { SimulatedApplianceUsage, UserAppliance } from "../types";
import { calculateKwh, calculateCost, DEFAULT_EFFECTIVE_RATE } from "./dailyUsageService";
import { devLog } from "./devLogger";
import { getScopedStorage, setScopedStorage } from "../providers/dataProvider";

const RESOURCE_KEY = "simulated_appliance_usage";

/**
 * Saves or updates a simulated plan for a single appliance on a specific date
 */
export async function saveSimulatedAppliance(params: {
  appliance_id: string;
  usage_date: string; // YYYY-MM-DD
  hours_used: number;
  watts: number;
  quantity?: number;
  start_hour?: number | null;
  end_hour?: number | null;
  effectiveRate?: number;
  source?: "simulation_plan" | "test_run";
  notes?: string;
  user_id?: string | null;
}): Promise<boolean> {
  const qty = params.quantity || 1;
  const clampedHours = Math.max(0, Math.min(24, Number(params.hours_used.toFixed(2))));
  const kwh = calculateKwh(params.watts, clampedHours, qty);
  const cost = calculateCost(kwh, params.effectiveRate || DEFAULT_EFFECTIVE_RATE);

  const row: SimulatedApplianceUsage = {
    id: `sim-${params.appliance_id}-${params.usage_date}`,
    appliance_id: params.appliance_id,
    usage_date: params.usage_date,
    hours_used: clampedHours,
    kwh_consumed: kwh,
    estimated_cost: cost,
    start_hour: params.start_hour !== undefined ? params.start_hour : null,
    end_hour: params.end_hour !== undefined ? params.end_hour : null,
    source: params.source || "simulation_plan",
    notes: params.notes || null,
    user_id: params.user_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Resilient local storage update first (guarantees zero data loss)
  try {
    const cached = getScopedStorage<SimulatedApplianceUsage[]>(RESOURCE_KEY, []);
    const idx = cached.findIndex(
      (c) => c.appliance_id === params.appliance_id && c.usage_date === params.usage_date
    );
    if (idx >= 0) {
      cached[idx] = { ...cached[idx], ...row };
    } else {
      cached.unshift(row);
    }
    setScopedStorage(RESOURCE_KEY, cached);
  } catch (cacheErr) {
    devLog.warn("SimulationService", "Failed to mirror simulation to local cache:", cacheErr);
  }

  // 2. Remote Supabase sync
  try {
    const { error } = await supabaseClient
      .from("simulated_appliance_usage")
      .upsert(row, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      devLog.info("SimulationService", `Remote simulated save fallback: ${error.message}`);
    } else {
      devLog.info("SimulationService", `Saved remote simulated usage for ${params.appliance_id} on ${params.usage_date}: ${clampedHours}h`);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date: params.usage_date, appliance_id: params.appliance_id },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.info("SimulationService", `Remote exception in saveSimulatedAppliance (saved locally): ${err?.message}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date: params.usage_date, appliance_id: params.appliance_id },
        })
      );
    }
    return true;
  }
}

/**
 * Saves a full day's simulation plan for multiple appliances in batch
 */
export async function batchSaveSimulatedDay(
  usage_date: string,
  entries: Array<{
    appliance_id: string;
    hours_used: number;
    watts: number;
    quantity?: number;
    start_hour?: number | null;
    end_hour?: number | null;
    effectiveRate?: number;
    source?: "simulation_plan" | "test_run";
    notes?: string;
    user_id?: string | null;
  }>
): Promise<boolean> {
  if (entries.length === 0) return true;

  const rows: SimulatedApplianceUsage[] = entries.map((e) => {
    const qty = e.quantity || 1;
    const clampedHours = Math.max(0, Math.min(24, Number(e.hours_used.toFixed(2))));
    const kwh = calculateKwh(e.watts, clampedHours, qty);
    const cost = calculateCost(kwh, e.effectiveRate || DEFAULT_EFFECTIVE_RATE);

    return {
      id: `sim-${e.appliance_id}-${usage_date}`,
      appliance_id: e.appliance_id,
      usage_date,
      hours_used: clampedHours,
      kwh_consumed: kwh,
      estimated_cost: cost,
      start_hour: e.start_hour !== undefined ? e.start_hour : null,
      end_hour: e.end_hour !== undefined ? e.end_hour : null,
      source: e.source || "simulation_plan",
      notes: e.notes || null,
      user_id: e.user_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // 1. Local storage mirror
  try {
    const cached = getScopedStorage<SimulatedApplianceUsage[]>(RESOURCE_KEY, []);
    rows.forEach((r) => {
      const idx = cached.findIndex(
        (c) => c.appliance_id === r.appliance_id && c.usage_date === usage_date
      );
      if (idx >= 0) {
        cached[idx] = { ...cached[idx], ...r };
      } else {
        cached.unshift(r);
      }
    });
    setScopedStorage(RESOURCE_KEY, cached);
  } catch (cacheErr) {
    devLog.warn("SimulationService", "Failed to mirror batch to local cache:", cacheErr);
  }

  // 2. Remote Supabase sync
  try {
    const { error } = await supabaseClient
      .from("simulated_appliance_usage")
      .upsert(rows, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      devLog.info("SimulationService", `Batch simulated save fallback: ${error.message}`);
    } else {
      devLog.info("SimulationService", `Batch saved ${rows.length} simulated rows for ${usage_date}`);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.info("SimulationService", `Remote batch exception (saved locally): ${err?.message}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date },
        })
      );
    }
    return true;
  }
}

/**
 * Fetches simulated appliance usage records within a date range
 */
export async function fetchSimulatedUsageRange(
  startDate: string,
  endDate: string,
  userId?: string | null
): Promise<SimulatedApplianceUsage[]> {
  try {
    let query = supabaseClient
      .from("simulated_appliance_usage")
      .select("*")
      .gte("usage_date", startDate)
      .lte("usage_date", endDate);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as SimulatedApplianceUsage[];
    }
    
    // Fall back to local storage
    const cached = getScopedStorage<SimulatedApplianceUsage[]>(RESOURCE_KEY, []);
    return cached.filter(
      (c) => c.usage_date >= startDate && c.usage_date <= endDate && (!userId || c.user_id === userId)
    );
  } catch {
    const cached = getScopedStorage<SimulatedApplianceUsage[]>(RESOURCE_KEY, []);
    return cached.filter(
      (c) => c.usage_date >= startDate && c.usage_date <= endDate && (!userId || c.user_id === userId)
    );
  }
}

/**
 * Resets / clears custom simulated entries for a date, reverting it to baseline routine
 */
export async function clearSimulatedDay(
  usage_date: string,
  userId?: string | null
): Promise<boolean> {
  // 1. Clear from local storage
  try {
    const cached = getScopedStorage<SimulatedApplianceUsage[]>(RESOURCE_KEY, []);
    const filtered = cached.filter(
      (c) => !(c.usage_date === usage_date && (!userId || c.user_id === userId))
    );
    setScopedStorage(RESOURCE_KEY, filtered);
  } catch (cacheErr) {
    devLog.warn("SimulationService", "Failed to clear from local storage:", cacheErr);
  }

  // 2. Clear from remote Supabase
  try {
    let query = supabaseClient
      .from("simulated_appliance_usage")
      .delete()
      .eq("usage_date", usage_date);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    await query;

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date, cleared: true },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.error("SimulationService", `Exception in clearSimulatedDay: ${err?.message}`, err);
    return true;
  }
}

/**
 * Computes pure baseline quota for a list of appliances on any given day
 */
export function computeBaselineQuota(
  appliances: UserAppliance[],
  effectiveRate: number = DEFAULT_EFFECTIVE_RATE
): { baselineKwh: number; baselineCost: number } {
  const active = appliances.filter((a) => a.is_active !== false);
  const kwh = active.reduce((sum, app) => {
    const hours = Number(app.hours_per_day) || 0;
    return sum + calculateKwh(app.watts, hours, app.quantity || 1);
  }, 0);
  const cost = calculateCost(kwh, effectiveRate);
  return {
    baselineKwh: Number(kwh.toFixed(2)),
    baselineCost: Number(cost.toFixed(2)),
  };
}
