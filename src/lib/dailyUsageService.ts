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
 * Batch saves appliance routine baseline defaults across a multi-day date range (e.g. Aug 1 - Aug 23 or Aug 1 - Aug 31)
 */
export async function batchSaveDailyUsageAcrossRange(params: {
  startDate: Date;
  endDate: Date;
  appliances: UserAppliance[];
  effectiveRate?: number;
  source?: "routine_default" | "manual";
  overwriteExisting?: boolean;
  userId?: string | null;
}): Promise<{ success: boolean; totalDays: number; totalRows: number }> {
  const {
    startDate,
    endDate,
    appliances,
    effectiveRate = DEFAULT_EFFECTIVE_RATE,
    source = "routine_default",
    overwriteExisting = true,
    userId = null,
  } = params;

  if (appliances.length === 0 || endDate < startDate) {
    return { success: true, totalDays: 0, totalRows: 0 };
  }

  // Generate list of dates in the range
  const dateKeys: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  while (current <= end) {
    dateKeys.push(formatDateToKey(current));
    current.setDate(current.getDate() + 1);
  }

  if (dateKeys.length === 0) {
    return { success: true, totalDays: 0, totalRows: 0 };
  }

  // If not overwriting existing, find dates that already have logged data
  let existingKeys = new Set<string>();
  if (!overwriteExisting) {
    try {
      const { data } = await supabaseClient
        .from("daily_appliance_usage")
        .select("usage_date, appliance_id")
        .in("usage_date", dateKeys);

      if (data) {
        data.forEach((row: any) => existingKeys.add(`${row.usage_date}_${row.appliance_id}`));
      }
    } catch (e) {
      devLog.warn("DailyUsageService", "Could not check existing records:", e);
    }
  }

  const allRows: any[] = [];

  dateKeys.forEach((dKey) => {
    appliances.forEach((app) => {
      if (!overwriteExisting && existingKeys.has(`${dKey}_${app.id}`)) {
        return; // skip existing
      }

      const hours = Number(app.hours_per_day) || 0;
      const qty = app.quantity || 1;
      const kwh = calculateKwh(app.watts, hours, qty);
      const cost = calculateCost(kwh, effectiveRate);

      allRows.push({
        appliance_id: app.id,
        usage_date: dKey,
        hours_used: hours,
        kwh_consumed: kwh,
        estimated_cost: cost,
        source,
        notes: `Routine default baseline (${hours}h/day)`,
        user_id: app.user_id || userId,
        updated_at: new Date().toISOString(),
      });
    });
  });

  if (allRows.length === 0) {
    return { success: true, totalDays: dateKeys.length, totalRows: 0 };
  }

  try {
    // Chunk inserts in batches of 200 rows for safety
    const chunkSize = 200;
    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);
      const { error } = await supabaseClient
        .from("daily_appliance_usage")
        .upsert(chunk, {
          onConflict: "user_id,appliance_id,usage_date",
        });

      if (error) {
        devLog.error("DailyUsageService", `Error bulk upserting chunk ${i}: ${error.message}`, error);
        return { success: false, totalDays: dateKeys.length, totalRows: i };
      }
    }

    devLog.info("DailyUsageService", `Successfully batch saved ${allRows.length} rows across ${dateKeys.length} days.`);
    return { success: true, totalDays: dateKeys.length, totalRows: allRows.length };
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in batchSaveDailyUsageAcrossRange: ${err?.message}`, err);
    return { success: false, totalDays: dateKeys.length, totalRows: 0 };
  }
}


export interface DaySessionSlice {
  dateKey: string;
  hours: number;
  startHourFrac: number;
  endHourFrac: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Splits any session (single-day, overnight, or multi-day) across 12:00 AM midnight boundaries
 */
export function splitSessionAcrossDays(startTime: Date, endTime: Date): DaySessionSlice[] {
  const slices: DaySessionSlice[] = [];
  if (endTime.getTime() <= startTime.getTime()) return slices;

  let currentStart = new Date(startTime);

  while (currentStart < endTime) {
    const dateKey = formatDateToKey(currentStart);

    // Midnight end of the current day
    const endOfDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() + 1, 0, 0, 0, 0);
    const sliceEnd = endTime < endOfDay ? new Date(endTime) : endOfDay;

    const startHourFrac = currentStart.getHours() + currentStart.getMinutes() / 60 + currentStart.getSeconds() / 3600;
    const isEndOfDay = sliceEnd.getTime() === endOfDay.getTime();
    const endHourFrac = isEndOfDay ? 24 : (sliceEnd.getHours() + sliceEnd.getMinutes() / 60 + sliceEnd.getSeconds() / 3600);

    const hours = Math.max(0.001, (sliceEnd.getTime() - currentStart.getTime()) / 3600000);

    slices.push({
      dateKey,
      hours: Number(hours.toFixed(4)),
      startHourFrac,
      endHourFrac,
      startTime: new Date(currentStart),
      endTime: new Date(sliceEnd),
    });

    currentStart = endOfDay;
  }

  return slices;
}

/**
 * Accumulates live stopwatch runtime into the daily usage table across midnight boundaries
 */
export async function accumulateLiveSessionDailyUsage(params: {
  appliance_id: string;
  durationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime?: Date;
  endTime?: Date;
}): Promise<void> {
  const quantity = params.quantity || 1;
  const rate = params.effectiveRate || DEFAULT_EFFECTIVE_RATE;

  const endTime = params.endTime || new Date();
  const startTime = params.startTime || new Date(endTime.getTime() - params.durationMinutes * 60000);

  const slices = splitSessionAcrossDays(startTime, endTime);

  for (const slice of slices) {
    try {
      let query = supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("appliance_id", params.appliance_id)
        .eq("usage_date", slice.dateKey);

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      const { data: existing } = await query.maybeSingle();

      const currentHours = existing ? Number(existing.hours_used || 0) : 0;
      const totalHours = Number((currentHours + slice.hours).toFixed(2));
      const kwh = calculateKwh(params.watts, totalHours, quantity);
      const cost = calculateCost(kwh, rate);

      await supabaseClient.from("daily_appliance_usage").upsert(
        {
          appliance_id: params.appliance_id,
          user_id: params.user_id || null,
          usage_date: slice.dateKey,
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
        `Accumulated live slice for ${params.appliance_id} on ${slice.dateKey}: +${slice.hours.toFixed(2)}h -> Total: ${totalHours}h`
      );
    } catch (err: any) {
      devLog.warn("DailyUsageService", `Failed to accumulate live session for ${slice.dateKey}: ${err?.message}`);
    }
  }
}

/**
 * Deducts a session's hours from the daily usage table across midnight boundaries (e.g. when a log is deleted)
 */
export async function deductSessionDailyUsage(params: {
  appliance_id: string;
  durationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime?: Date;
  endTime?: Date;
}): Promise<void> {
  const quantity = params.quantity || 1;
  const rate = params.effectiveRate || DEFAULT_EFFECTIVE_RATE;

  const endTime = params.endTime || new Date();
  const startTime = params.startTime || new Date(endTime.getTime() - params.durationMinutes * 60000);

  const slices = splitSessionAcrossDays(startTime, endTime);

  for (const slice of slices) {
    try {
      let query = supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("appliance_id", params.appliance_id)
        .eq("usage_date", slice.dateKey);

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      const { data: existing } = await query.maybeSingle();
      if (!existing) continue;

      const currentHours = Number(existing.hours_used || 0);
      const totalHours = Math.max(0, Number((currentHours - slice.hours).toFixed(2)));
      const kwh = calculateKwh(params.watts, totalHours, quantity);
      const cost = calculateCost(kwh, rate);

      await supabaseClient.from("daily_appliance_usage").upsert(
        {
          appliance_id: params.appliance_id,
          user_id: params.user_id || null,
          usage_date: slice.dateKey,
          hours_used: totalHours,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: existing.source || "live_session",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,appliance_id,usage_date",
        }
      );

      devLog.info(
        "DailyUsageService",
        `Deducted session slice for ${params.appliance_id} on ${slice.dateKey}: -${slice.hours.toFixed(2)}h -> Total: ${totalHours}h`
      );
    } catch (err: any) {
      devLog.warn("DailyUsageService", `Failed to deduct session for ${slice.dateKey}: ${err?.message}`);
    }
  }
}

/**
 * Reconciles an updated session log by removing old duration slices and applying new duration slices
 */
export async function reconcileUpdatedSessionLog(params: {
  appliance_id: string;
  oldDurationMinutes: number;
  newDurationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime: Date;
}): Promise<void> {
  const oldEndTime = new Date(params.startTime.getTime() + params.oldDurationMinutes * 60000);
  const newEndTime = new Date(params.startTime.getTime() + params.newDurationMinutes * 60000);

  // 1. Deduct old slice(s)
  await deductSessionDailyUsage({
    appliance_id: params.appliance_id,
    durationMinutes: params.oldDurationMinutes,
    watts: params.watts,
    quantity: params.quantity,
    effectiveRate: params.effectiveRate,
    user_id: params.user_id,
    startTime: params.startTime,
    endTime: oldEndTime,
  });

  // 2. Accumulate new slice(s)
  await accumulateLiveSessionDailyUsage({
    appliance_id: params.appliance_id,
    durationMinutes: params.newDurationMinutes,
    watts: params.watts,
    quantity: params.quantity,
    effectiveRate: params.effectiveRate,
    user_id: params.user_id,
    startTime: params.startTime,
    endTime: newEndTime,
  });
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
