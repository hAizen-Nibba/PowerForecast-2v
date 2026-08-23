import { supabaseClient } from "./supabaseClient";
import { DailyApplianceUsage, UserAppliance, UserCalendarEvent } from "../types";
import { devLog } from "./devLogger";

export const DEFAULT_EFFECTIVE_RATE = 14.8261;

/**
 * Formats a Date object into a YYYY-MM-DD string according to local timezone.
 */
export function formatDateToKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a Date object at local midnight
 */
export function parseKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Computes energy in kWh given watts and hours
 */
export function calculateKwh(watts: number, hours: number, quantity: number = 1): number {
  return Number(((watts * quantity * hours) / 1000).toFixed(4));
}

/**
 * Computes estimated peso cost given kWh and effective rate
 */
export function calculateCost(kwh: number, effectiveRate: number = DEFAULT_EFFECTIVE_RATE): number {
  return Number((kwh * effectiveRate).toFixed(2));
}

/**
 * Converts total seconds into { hours, minutes, seconds } components
 */
export function secondsToHms(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return { hours: h, minutes: m, seconds: s };
}

/**
 * Converts HH:MM:SS components into decimal hours (e.g. 8h 30m 15s → 8.5042)
 */
export function hmsToDecimalHours(h: number, m: number, s: number): number {
  return Number((h + m / 60 + s / 3600).toFixed(6));
}

/**
 * Converts decimal hours into HH:MM:SS components (e.g. 8.5042 → { hours: 8, minutes: 30, seconds: 15 })
 */
export function decimalHoursToHms(decimal: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.round(decimal * 3600);
  return secondsToHms(totalSeconds);
}

/**
 * Formats HH:MM:SS components into a padded display string (e.g. "08:00:32")
 */
export function formatHmsString(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Upserts a single daily appliance usage record in Supabase
 */
export async function upsertDailyUsageRecord(params: {
  appliance_id: string;
  usage_date: string;
  hours_used: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  source?: "manual" | "live_session" | "schedule_autofill" | "routine_default";
  notes?: string;
  user_id?: string | null;
}): Promise<DailyApplianceUsage | null> {
  const quantity = params.quantity || 1;
  const kwh = calculateKwh(params.watts, params.hours_used, quantity);
  const cost = calculateCost(kwh, params.effectiveRate || DEFAULT_EFFECTIVE_RATE);

  const payload: Partial<DailyApplianceUsage> = {
    appliance_id: params.appliance_id,
    usage_date: params.usage_date,
    hours_used: Number(params.hours_used.toFixed(2)),
    kwh_consumed: kwh,
    estimated_cost: cost,
    source: params.source || "manual",
    notes: params.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (params.user_id) {
    payload.user_id = params.user_id;
  }

  try {
    const { data, error } = await supabaseClient
      .from("daily_appliance_usage")
      .upsert(payload, {
        onConflict: "user_id,appliance_id,usage_date",
      })
      .select()
      .single();

    if (error) {
      devLog.warn("DailyUsageService", `Failed to upsert usage record: ${error.message}`, payload);
      return null;
    }

    devLog.info("DailyUsageService", `Saved daily usage: ${params.hours_used}h (${kwh} kWh / ₱${cost})`, data);
    return data as DailyApplianceUsage;
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in upsertDailyUsageRecord: ${err?.message}`, err);
    return null;
  }
}

/**
 * Batch saves multiple appliance usage rows for a specific date
 */
export async function batchSaveDailyUsage(
  usage_date: string,
  entries: Array<{
    appliance_id: string;
    hours_used: number;
    watts: number;
    quantity?: number;
    effectiveRate?: number;
    source?: "manual" | "live_session" | "schedule_autofill" | "routine_default";
    notes?: string;
    user_id?: string | null;
  }>
): Promise<boolean> {
  if (entries.length === 0) return true;

  const rows = entries.map((e) => {
    const qty = e.quantity || 1;
    const kwh = calculateKwh(e.watts, e.hours_used, qty);
    const cost = calculateCost(kwh, e.effectiveRate || DEFAULT_EFFECTIVE_RATE);

    return {
      appliance_id: e.appliance_id,
      usage_date,
      hours_used: Number(e.hours_used.toFixed(2)),
      kwh_consumed: kwh,
      estimated_cost: cost,
      source: e.source || "manual",
      notes: e.notes || null,
      user_id: e.user_id || null,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabaseClient
      .from("daily_appliance_usage")
      .upsert(rows, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      devLog.warn("DailyUsageService", `Batch save error: ${error.message}`, rows);
      return false;
    }

    devLog.info("DailyUsageService", `Batch saved ${rows.length} appliance usage rows for ${usage_date}`);
    return true;
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in batchSaveDailyUsage: ${err?.message}`, err);
    return false;
  }
}

/**
 * Accumulates live stopwatch runtime into the daily usage table for today
 */
export async function accumulateLiveSessionDailyUsage(params: {
  appliance_id: string;
  durationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
}): Promise<void> {
  const todayKey = formatDateToKey(new Date());
  const addedHours = params.durationMinutes / 60;
  const quantity = params.quantity || 1;

  try {
    // Check if an existing row exists for today
    let query = supabaseClient
      .from("daily_appliance_usage")
      .select("*")
      .eq("appliance_id", params.appliance_id)
      .eq("usage_date", todayKey);

    if (params.user_id) {
      query = query.eq("user_id", params.user_id);
    }

    const { data: existing } = await query.maybeSingle();

    const currentHours = existing ? Number(existing.hours_used || 0) : 0;
    const totalHours = Number((currentHours + addedHours).toFixed(2));
    const kwh = calculateKwh(params.watts, totalHours, quantity);
    const cost = calculateCost(kwh, params.effectiveRate || DEFAULT_EFFECTIVE_RATE);

    await supabaseClient.from("daily_appliance_usage").upsert(
      {
        appliance_id: params.appliance_id,
        user_id: params.user_id || null,
        usage_date: todayKey,
        hours_used: totalHours,
        kwh_consumed: kwh,
        estimated_cost: cost,
        source: "live_session",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,appliance_id,usage_date",
      }
    );

    devLog.info(
      "DailyUsageService",
      `Accumulated live session for ${params.appliance_id}: +${params.durationMinutes}m -> Total: ${totalHours}h`
    );
  } catch (err: any) {
    devLog.warn("DailyUsageService", `Failed to accumulate live session: ${err?.message}`);
  }
}

export interface DayMetricSummary {
  kwh: number;
  cost: number;
  isLogged: boolean;
  isPeak: boolean;
  applianceCount: number;
  source: "actual_logged" | "projected_routine" | "projected_schedule";
}

/**
 * Calculates day metrics for a calendar cell.
 * If actual logged rows exist for this day -> returns Actual Logged sum.
 * Else -> returns Projected baseline from routine inventory defaults + scheduled tasks.
 */
export function computeDayMetrics(
  dateKey: string,
  date: Date,
  loggedUsageForDay: DailyApplianceUsage[],
  appliances: UserAppliance[],
  events: UserCalendarEvent[],
  effectiveRate: number = DEFAULT_EFFECTIVE_RATE
): DayMetricSummary {
  // 1. If we have logged usage records for this day
  if (loggedUsageForDay && loggedUsageForDay.length > 0) {
    const totalKwh = loggedUsageForDay.reduce((acc, curr) => acc + (Number(curr.kwh_consumed) || 0), 0);
    const totalCost = loggedUsageForDay.reduce((acc, curr) => acc + (Number(curr.estimated_cost) || 0), 0);
    const activeCount = loggedUsageForDay.filter((u) => Number(u.hours_used) > 0).length;

    return {
      kwh: Number(totalKwh.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      isLogged: true,
      isPeak: totalKwh > 18 || totalCost > 270,
      applianceCount: activeCount,
      source: "actual_logged",
    };
  }

  // 2. Otherwise calculate Projected Potential from routine defaults + scheduled events
  const dayOfWeekMap: Record<number, "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  const dayStr = dayOfWeekMap[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // Baseline routine consumption
  let projectedKwh = appliances.reduce((acc, app) => {
    const qty = app.quantity || 1;
    const defaultHours = Number(app.hours_per_day) || 0;
    // Slight weekend variation if applicable
    const hours = isWeekend ? Math.min(24, defaultHours * 1.15) : defaultHours;
    return acc + (app.watts * qty * hours) / 1000;
  }, 0);

  // Add scheduled event additions for this day
  const dayEvents = events.filter((e) => e.day === dayStr || e.is_recurring);
  dayEvents.forEach((ev) => {
    const app = appliances.find((a) => a.id === ev.appliance_id);
    const watts = app ? app.watts * (app.quantity || 1) : 500;
    const addedKwh = (watts * (ev.duration_hours || 1)) / 1000;
    projectedKwh += addedKwh;
  });

  const projectedCost = projectedKwh * effectiveRate;

  return {
    kwh: Number(projectedKwh.toFixed(2)),
    cost: Number(projectedCost.toFixed(2)),
    isLogged: false,
    isPeak: projectedKwh > 18 || projectedCost > 270,
    applianceCount: appliances.length,
    source: dayEvents.length > 0 ? "projected_schedule" : "projected_routine",
  };
}
