import { UserAppliance, UserCalendarEvent } from '../types';

export interface ActiveDeviceLoad {
  name: string;
  category: string;
  watts: number;
  startHourText: string;
  reason: string;
}

export interface HourlyLoadPoint {
  timeLabel: string;
  hour: string;
  detailedHour: string;
  rawHour: number; // e.g. 17.5 for 5:30 PM
  rawMinute: number; // 0 to 1440
  watts: number;
  actualWatts: number | null; // Real recorded data up to current time
  projectedWatts: number | null; // Unrecorded / future hours
  liveOffPeakWatts: number | null; // Real recorded OFF-PEAK load (Blue)
  livePeakWatts: number | null; // Real recorded PEAK load (Red)
  futureWatts: number | null; // Future unrecorded load (Dashed line)
  costPerHour: number;
  costPerMinute: number;
  accumulatedCost: number; // Total pesos accumulated from start up to this minute
  effectiveRate: number;
  rateLabel: string;
  isPeak: boolean;
  isFuture: boolean;
  statusText: string;
  activeDevices: ActiveDeviceLoad[];
}

export function formatHour12(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12} ${period}`;
}

export function formatHourMinute12(h: number, m: number = 0): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minuteStr = String(Math.floor(m)).padStart(2, '0');
  return `${hour12}:${minuteStr} ${period}`;
}

export function formatHourDetailed(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

export function isPeakHour(h: number): boolean {
  return (h >= 11 && h < 16) || (h >= 18 && h < 21);
}

export function getDefaultStartHour(category: string): number {
  const cat = (category || '').toLowerCase();
  if (cat.includes('refrigerat') || cat.includes('freezer')) return 0; // 24/7 continuous
  if (cat.includes('air') || cat.includes('ac')) return 13; // 1:00 PM afternoon peak
  if (cat.includes('fan')) return 9; // 9:00 AM morning/daytime
  if (cat.includes('tv') || cat.includes('television')) return 18; // 6:00 PM evening
  if (cat.includes('light')) return 18; // 6:00 PM evening
  if (cat.includes('wash')) return 9; // 9:00 AM morning laundry
  if (cat.includes('cook') || cat.includes('kitchen')) return 7; // 7:00 AM breakfast/cooking
  return 8; // 8:00 AM standard
}

export interface ComputeLoadCurveOptions {
  appliances: UserAppliance[];
  events?: UserCalendarEvent[];
  mode?: 'full_24h' | 'compact_12h' | 'high_res_30m' | 'ultra_res_15m' | 'custom_zoom';
  resolutionMinutes?: number; // 1, 5, 15, 30, or 60
  startHour?: number; // e.g. 0 to 24
  endHour?: number; // e.g. 0 to 24
  dayOfWeekKey?: string; // 'sun', 'mon', etc.
  currentMinuteLimit?: number; // Minutes from midnight of current time (default: current system minute)
}

export function computeHourlyLoadCurve(options: ComputeLoadCurveOptions): HourlyLoadPoint[] {
  const {
    appliances,
    events = [],
    mode = 'full_24h',
    resolutionMinutes,
    startHour = 0,
    endHour = 24,
    dayOfWeekKey,
    currentMinuteLimit,
  } = options;

  // Real-time current minute cutoff
  const now = new Date();
  const currentLiveMinute = currentMinuteLimit !== undefined
    ? currentMinuteLimit
    : now.getHours() * 60 + now.getMinutes();

  let stepMins = 5; // Default to 5-minute continuous sampling for ultra-smooth minute scrubbing
  if (resolutionMinutes) {
    stepMins = resolutionMinutes;
  } else if (mode === 'ultra_res_15m') {
    stepMins = 15;
  } else if (mode === 'high_res_30m') {
    stepMins = 30;
  } else if (mode === 'compact_12h') {
    stepMins = 60;
  }

  const startMin = Math.max(0, startHour * 60);
  const endMin = Math.min(24 * 60, endHour * 60);

  const timePointsSet = new Set<number>();
  for (let m = startMin; m < endMin; m += stepMins) {
    timePointsSet.add(m);
  }

  // Insert current live minute boundary
  if (currentLiveMinute >= startMin && currentLiveMinute < endMin) {
    timePointsSet.add(currentLiveMinute);
    if (currentLiveMinute > startMin) timePointsSet.add(currentLiveMinute - 1);
  }

  // Also insert exact appliance turn-on minutes so transition points are perfectly captured
  appliances.forEach((app) => {
    if (app.last_turned_on_at) {
      const d = new Date(app.last_turned_on_at);
      const appMin = d.getHours() * 60 + d.getMinutes();
      if (appMin >= startMin && appMin < endMin) {
        timePointsSet.add(appMin);
        if (appMin > startMin) timePointsSet.add(appMin - 1);
      }
    }
  });

  timePointsSet.add(endMin - 1);
  const timePoints = Array.from(timePointsSet).sort((a, b) => a - b);

  // Filter events matching the active day if provided
  const activeEvents = dayOfWeekKey
    ? events.filter((e) => e.day === dayOfWeekKey)
    : events;

  return timePoints.map((totalMinutes) => {
    const rawHourFloat = totalMinutes / 60;
    const h = Math.floor(rawHourFloat);
    const m = totalMinutes % 60;
    const isFuture = totalMinutes > currentLiveMinute;

    let totalPointWatts = 0;
    let accumulatedPesosAtPoint = 0;
    const activeDevices: ActiveDeviceLoad[] = [];

    appliances.forEach((app) => {
      if (app.is_active === false) return;

      const deviceRatedWatts = (Number(app.watts) || 0) * (app.quantity || 1);
      const isRef = app.category.toLowerCase().includes('refrigerat') || app.category.toLowerCase().includes('freezer');

      // 1. Refrigerator & Freezers: 24/7 continuous with ~35% compressor duty cycle
      if (isRef) {
        const refWatts = Math.round(deviceRatedWatts * 0.35);
        totalPointWatts += refWatts;
        activeDevices.push({
          name: app.name,
          category: app.category,
          watts: refWatts,
          startHourText: '24/7 Base',
          reason: 'Inverter compressor cycling',
        });

        const elapsedRefMins = Math.min(totalMinutes, currentLiveMinute);
        const refKwh = (refWatts / 1000) * (elapsedRefMins / 60);
        accumulatedPesosAtPoint += refKwh * 14.8261;
        return;
      }

      // 2. Currently Turned ON Appliances: Start strictly at last_turned_on_at down to the exact minute!
      if (app.is_currently_on && app.last_turned_on_at) {
        const turnOnDate = new Date(app.last_turned_on_at);
        const turnOnMinute = turnOnDate.getHours() * 60 + turnOnDate.getMinutes();
        const startMinuteText = formatHourMinute12(turnOnDate.getHours(), turnOnDate.getMinutes());

        // If the current minute is at or after turn-on time
        if (totalMinutes >= turnOnMinute) {
          totalPointWatts += deviceRatedWatts;
          activeDevices.push({
            name: app.name,
            category: app.category,
            watts: deviceRatedWatts,
            startHourText: startMinuteText,
            reason: isFuture ? `Projected (Switched ON at ${startMinuteText})` : `Live Active (Switched ON at ${startMinuteText})`,
          });

          // Compute accumulated cost strictly up to current recorded minute
          const elapsedMins = Math.max(0, Math.min(totalMinutes, currentLiveMinute) - turnOnMinute);
          const accumulatedKwh = (deviceRatedWatts / 1000) * (elapsedMins / 60);
          accumulatedPesosAtPoint += accumulatedKwh * 14.8261;
        }
        return;
      }

      // 3. Check for specific scheduled calendar tasks for this appliance
      const matchingEvents = activeEvents.filter((e) => e.appliance_id === app.id);
      let scheduledInThisPoint = false;

      for (const evt of matchingEvents) {
        const evtStartMinute = evt.hour * 60;
        const evtEndMinute = evtStartMinute + Math.round((evt.duration_hours || 1) * 60);

        if (totalMinutes >= evtStartMinute && totalMinutes < evtEndMinute) {
          totalPointWatts += deviceRatedWatts;
          const evtStartText = formatHourMinute12(evt.hour, 0);
          activeDevices.push({
            name: app.name,
            category: app.category,
            watts: deviceRatedWatts,
            startHourText: evtStartText,
            reason: `Scheduled (${evt.title})`,
          });
          scheduledInThisPoint = true;
          break;
        }
      }

      if (scheduledInThisPoint) return;

      // 4. Default configured appliance profile: starts strictly at configured start_hour (or default)
      const startH = app.start_hour !== undefined ? app.start_hour : getDefaultStartHour(app.category);
      const startAppMinute = startH * 60;
      const runDurationHours = Math.max(1, Number(app.hours_per_day) || 8);
      const endAppMinute = startAppMinute + Math.round(runDurationHours * 60);

      // If running within window
      if (totalMinutes >= startAppMinute && totalMinutes < endAppMinute) {
        totalPointWatts += deviceRatedWatts;
        const confStartText = formatHourMinute12(startH, 0);
        activeDevices.push({
          name: app.name,
          category: app.category,
          watts: deviceRatedWatts,
          startHourText: confStartText,
          reason: `Configured Start at ${confStartText} (${runDurationHours}h run)`,
        });
      }
    });

    const effectiveRate = 14.8261;
    const costPerHour = (totalPointWatts / 1000) * effectiveRate;
    const costPerMinute = costPerHour / 60;
    const rateLabel = "₱14.83/kWh Standard";

    const timeLabel = stepMins < 60 ? formatHourMinute12(h, m) : formatHour12(h);
    const detailedHour = formatHourMinute12(h, m);

    // Clean, data-driven separation
    const roundedWatts = Math.round(totalPointWatts);
    const actualWatts = isFuture ? null : roundedWatts;
    const projectedWatts = roundedWatts;

    const isNowTransition = totalMinutes === currentLiveMinute;
    const futureWatts = (isFuture || isNowTransition) ? roundedWatts : null;

    return {
      timeLabel,
      hour: timeLabel,
      detailedHour,
      rawHour: Math.round(rawHourFloat * 100) / 100,
      rawMinute: totalMinutes,
      watts: roundedWatts,
      actualWatts,
      projectedWatts,
      liveOffPeakWatts: actualWatts,
      livePeakWatts: null,
      futureWatts,
      costPerHour: Math.round(costPerHour * 100) / 100,
      costPerMinute: Math.round(costPerMinute * 1000) / 1000,
      accumulatedCost: Math.round(accumulatedPesosAtPoint * 10000) / 10000,
      effectiveRate,
      rateLabel,
      isPeak: false,
      isFuture,
      statusText: isFuture ? "Future / Unrecorded" : "Live Recorded Data",
      activeDevices,
    };
  });
}
