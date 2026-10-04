import { supabaseClient } from "./supabaseClient";
import { UserAppliance } from "../types";
import { devLog } from "./devLogger";
import {
  calculateApplianceKwh,
  calculateCost,
  accumulateLiveSessionDailyUsage,
  deductSessionDailyUsage,
  savePastSessionWithAllocation,
  DEFAULT_EFFECTIVE_RATE,
  resolveApplianceRate,
  computeLiveSessionMetrics,
} from "./dailyUsageService";
import { getScopedStorage, setScopedStorage } from "../providers/dataProvider";
import { PcWorkloadProfile } from "./pcHardwareService";

// In-flight locking mechanism to prevent race conditions & double-clicks
const activeSessionLocks = new Set<string>();

/**
 * Resolves the effective rate per kWh based on space/appliance tariff type
 */
export function getEffectiveApplianceRate(app: UserAppliance): number {
  return resolveApplianceRate(app);
}

/**
 * Energizes / turns ON an appliance circuit and starts the stopwatch
 */
/**
 * Energizes / turns ON an appliance circuit and starts the stopwatch
 */
export async function switchOnCircuit(
  app: UserAppliance,
  options?: {
    workloadMode?: PcWorkloadProfile | string;
    sessionWatts?: number;
  }
): Promise<{ success: boolean; last_turned_on_at: string | null }> {
  if (activeSessionLocks.has(app.id)) {
    devLog.warn("SessionService", `Circuit lock active for ${app.id}, ignoring duplicate switch ON`);
    return { success: false, last_turned_on_at: null };
  }

  activeSessionLocks.add(app.id);
  const nowIso = new Date().toISOString();

  const updatedAiMeta = {
    ...(app.ai_metadata || {}),
    ...(options?.workloadMode ? { active_workload_mode: options.workloadMode } : {}),
    ...(options?.sessionWatts ? { active_session_watts: options.sessionWatts } : {}),
  };

  try {
    // 1. Resilient local storage update first so UI reflects energized state immediately
    try {
      const appliances = getScopedStorage<UserAppliance[]>("user_appliances", []);
      const idx = appliances.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        appliances[idx] = {
          ...appliances[idx],
          is_currently_on: true,
          last_turned_on_at: nowIso,
          active_workload_mode: options?.workloadMode || null,
          active_session_watts: options?.sessionWatts || null,
          ai_metadata: updatedAiMeta,
          updated_at: nowIso,
        };
        setScopedStorage("user_appliances", appliances);
      }
    } catch (cacheErr) {
      devLog.warn("SessionService", "Failed to update user_appliances local cache:", cacheErr);
    }

    // 2. Remote Supabase synchronization
    try {
      const { error } = await supabaseClient
        .from("user_appliances")
        .update({
          is_currently_on: true,
          last_turned_on_at: nowIso,
          ai_metadata: updatedAiMeta,
          updated_at: nowIso,
        })
        .eq("id", app.id);

      if (error) {
        devLog.info("SessionService", `Remote energize sync notice: ${error.message}`);
      }
    } catch (remoteErr: any) {
      devLog.info("SessionService", `Remote exception in switchOnCircuit: ${remoteErr?.message}`);
    }

    devLog.telemetry("Telemetry", `Circuit ENERGIZED [ACTIVE]: "${app.name}" (${options?.sessionWatts || app.watts}W @ 230V, mode: ${options?.workloadMode || 'default'})`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      active_session_watts: options?.sessionWatts,
      active_workload_mode: options?.workloadMode,
      is_currently_on: true,
      last_turned_on_at: nowIso,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_circuit_toggled", {
          detail: {
            applianceId: app.id,
            state: true,
            workloadMode: options?.workloadMode,
            timestamp: nowIso,
          },
        })
      );
    }

    return { success: true, last_turned_on_at: nowIso };
  } finally {
    activeSessionLocks.delete(app.id);
  }
}

/**
 * Changes the active workload mode (e.g. Gaming <-> Office <-> Idle) of a currently running computer circuit on the fly.
 */
export async function switchApplianceWorkloadMode(
  app: UserAppliance,
  newMode: PcWorkloadProfile,
  newWatts?: number
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const updatedAiMeta = {
    ...(app.ai_metadata || {}),
    active_workload_mode: newMode,
    ...(newWatts ? { active_session_watts: newWatts } : {}),
  };

  try {
    const appliances = getScopedStorage<UserAppliance[]>("user_appliances", []);
    const idx = appliances.findIndex((a) => a.id === app.id);
    if (idx >= 0) {
      appliances[idx] = {
        ...appliances[idx],
        active_workload_mode: newMode,
        active_session_watts: newWatts || null,
        ai_metadata: updatedAiMeta,
        updated_at: nowIso,
      };
      setScopedStorage("user_appliances", appliances);
    }
  } catch (err) {
    devLog.warn("SessionService", "Failed to switch workload mode in local cache:", err);
  }

  try {
    await supabaseClient
      .from("user_appliances")
      .update({
        ai_metadata: updatedAiMeta,
        updated_at: nowIso,
      })
      .eq("id", app.id);
  } catch (remoteErr: any) {
    devLog.info("SessionService", `Remote exception in switchApplianceWorkloadMode: ${remoteErr?.message}`);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("powerforecast_circuit_toggled", {
        detail: {
          applianceId: app.id,
          state: true,
          workloadMode: newMode,
          sessionWatts: newWatts,
          timestamp: nowIso,
        },
      })
    );
  }

  return true;
}

/**
 * De-energizes / turns OFF an appliance circuit, stops the stopwatch,
 * and automatically logs session duration + kWh + cost into appliance_usage_logs & daily_appliance_usage
 */
export async function switchOffCircuit(
  app: UserAppliance,
  effectiveRate?: number
): Promise<{
  success: boolean;
  durationMinutes: number;
  kwh: number;
  cost: number;
}> {
  if (activeSessionLocks.has(app.id)) {
    devLog.warn("SessionService", `Circuit lock active for ${app.id}, ignoring duplicate switch OFF`);
    return { success: false, durationMinutes: 0, kwh: 0, cost: 0 };
  }

  activeSessionLocks.add(app.id);
  const end = new Date();
  const rate = resolveApplianceRate(app, effectiveRate);

  try {
    let durationMinutes = 0;
    let appKwh = 0;
    let appCost = 0;

    if (app.last_turned_on_at) {
      const start = new Date(app.last_turned_on_at);

      if (!isNaN(start.getTime())) {
        const liveMetrics = computeLiveSessionMetrics(app, end.getTime(), { overrideRate: rate });
        const diffMs = Math.max(1000, end.getTime() - start.getTime());
        durationMinutes = Math.max(1, Math.round(diffMs / 60000));
        appKwh = liveMetrics.sessionKwh;
        appCost = liveMetrics.sessionCost;

        const activeWorkload = app.active_workload_mode || app.ai_metadata?.active_workload_mode || null;
        const activeWatts = app.active_session_watts || app.ai_metadata?.active_session_watts || null;

        // 1. Mirror detailed session log to local scoped storage
        try {
          const logs = getScopedStorage<any[]>("appliance_usage_logs", []);
          const newLog = {
            id: `log-${app.id}-${Date.now()}`,
            appliance_id: app.id,
            user_id: app.user_id || null,
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: appKwh,
            estimated_cost: appCost,
            source: "calendar_timeline_stopwatch",
            metadata: {
              workload_mode: activeWorkload,
              effective_watts: activeWatts,
              is_inverter: Boolean(app.is_inverter),
            },
            created_at: new Date().toISOString(),
          };
          logs.unshift(newLog);
          setScopedStorage("appliance_usage_logs", logs);
        } catch (cacheLogErr) {
          devLog.warn("SessionService", "Failed to cache session log locally:", cacheLogErr);
        }

        // 2. Insert detailed session log to Supabase
        try {
          const { error: logErr } = await supabaseClient.from("appliance_usage_logs").insert({
            appliance_id: app.id,
            user_id: app.user_id || null,
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: appKwh,
            estimated_cost: appCost,
            source: "calendar_timeline_stopwatch",
          });

          if (logErr) {
            devLog.info("SessionService", `Supabase log insert notice: ${logErr.message}`);
          }
        } catch (remoteLogErr: any) {
          devLog.info("SessionService", `Remote log insert exception: ${remoteLogErr?.message}`);
        }

        // 3. Accumulate in daily_appliance_usage across midnight boundaries
        await accumulateLiveSessionDailyUsage({
          appliance_id: app.id,
          durationMinutes,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: rate,
          user_id: app.user_id,
          startTime: start,
          endTime: end,
          appliance: app,
        });

        devLog.info(
          "SessionService",
          `Stopwatch saved: ${app.name} (${durationMinutes} mins / ${appKwh.toFixed(3)} kWh / ₱${appCost.toFixed(2)}${activeWorkload ? ` [Mode: ${activeWorkload}]` : ""})`
        );
      }
    }

    // 4. Update appliance status to OFF in local storage
    const clearedAiMeta = {
      ...(app.ai_metadata || {}),
      active_workload_mode: null,
      active_session_watts: null,
    };

    try {
      const appliances = getScopedStorage<UserAppliance[]>("user_appliances", []);
      const idx = appliances.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        appliances[idx] = {
          ...appliances[idx],
          is_currently_on: false,
          last_turned_on_at: null,
          active_workload_mode: null,
          active_session_watts: null,
          ai_metadata: clearedAiMeta,
          updated_at: new Date().toISOString(),
        };
        setScopedStorage("user_appliances", appliances);
      }
    } catch (cacheOffErr) {
      devLog.warn("SessionService", "Failed to de-energize appliance in local cache:", cacheOffErr);
    }

    // 5. Update appliance status to OFF in remote database
    try {
      const { error: appErr } = await supabaseClient
        .from("user_appliances")
        .update({
          is_currently_on: false,
          last_turned_on_at: null,
          ai_metadata: clearedAiMeta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", app.id);

      if (appErr) {
        devLog.info("SessionService", `Remote de-energize notice: ${appErr.message}`);
      }
    } catch (remoteAppErr: any) {
      devLog.info("SessionService", `Remote de-energize exception: ${remoteAppErr?.message}`);
    }

    // 6. Dispatch global sync events
    if (typeof window !== "undefined") {
      const syncDetail = {
        rolledOverCount: 1,
        applianceId: app.id,
        durationMinutes,
      };
      window.dispatchEvent(new CustomEvent("powerforecast_session_sync", { detail: syncDetail }));
      window.dispatchEvent(
        new CustomEvent("powerforecast_circuit_toggled", {
          detail: { applianceId: app.id, state: false, durationMinutes },
        })
      );
    }

    return { success: true, durationMinutes, kwh: appKwh, cost: appCost };
  } finally {
    activeSessionLocks.delete(app.id);
  }
}

/**
 * Manually logs a completed past session for a day (e.g. if the user forgot to start the stopwatch)
 */
export async function addManualPastSession(params: {
  appliance: UserAppliance;
  startDate: Date;
  endDate: Date;
  effectiveRate?: number;
}): Promise<{ totalMinutes: number; totalKwh: number; totalCost: number }> {
  const rate = params.effectiveRate || getEffectiveApplianceRate(params.appliance);

  const result = await savePastSessionWithAllocation({
    appliance_id: params.appliance.id,
    appliance: params.appliance,
    startDate: params.startDate,
    endDate: params.endDate,
    watts: params.appliance.watts,
    quantity: params.appliance.quantity || 1,
    effectiveRate: rate,
    user_id: params.appliance.user_id,
    allocationMode: "add_additional",
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("powerforecast_session_sync", {
        detail: { applianceId: params.appliance.id, manuallyAdded: true },
      })
    );
  }

  return result;
}

/**
 * Deletes a session log and reverses its hours from daily_appliance_usage
 */
export async function deleteSessionLog(params: {
  logId: string;
  appliance: UserAppliance;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  effectiveRate?: number;
}): Promise<boolean> {
  const rate = params.effectiveRate || getEffectiveApplianceRate(params.appliance);

  try {
    // 1. Delete session from appliance_usage_logs
    const { error: delErr } = await supabaseClient
      .from("appliance_usage_logs")
      .delete()
      .eq("id", params.logId);

    if (delErr) {
      devLog.error("SessionService", `Failed to delete session log: ${delErr.message}`);
      return false;
    }

    // 2. Deduct hours from daily_appliance_usage across midnight slices
    await deductSessionDailyUsage({
      appliance_id: params.appliance.id,
      durationMinutes: params.durationMinutes,
      watts: params.appliance.watts,
      quantity: params.appliance.quantity || 1,
      effectiveRate: rate,
      user_id: params.appliance.user_id,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_session_sync", {
          detail: { logId: params.logId, deleted: true },
        })
      );
    }

    return true;
  } catch (err: any) {
    devLog.error("SessionService", `Exception deleting session: ${err?.message}`, err);
    return false;
  }
}
