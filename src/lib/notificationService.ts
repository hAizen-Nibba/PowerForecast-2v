import { devLog } from "./devLogger";

export type NotificationLevel = "relaxed" | "standard" | "proactive" | "strict";
export type AlertUrgency = "info" | "normal" | "high" | "critical";

export interface NotificationPreferences {
  enabled: boolean;
  notificationLevel: NotificationLevel;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  stopwatchAlert: boolean;
  stopwatchThresholdHours: number; // 6 (relaxed), 4 (standard), 2 (proactive), 1 (strict)
  budgetAlert: boolean;
  budgetThresholdPercent: number; // 90 (relaxed), 80 (standard), 70 (proactive), 50 (strict)
  scheduleAlert: boolean;
  peakHourAlert: boolean;
  surgeAlert: boolean; // Alert on high concurrent wattage load
  surgeThresholdWatts: number; // 2500W (proactive), 2000W (strict)
}

const PREF_STORAGE_KEY = "powerforecast_notification_preferences";

export const NOTIFICATION_LEVEL_PRESETS: Record<NotificationLevel, Partial<NotificationPreferences>> = {
  relaxed: {
    notificationLevel: "relaxed",
    soundEnabled: false,
    vibrationEnabled: false,
    stopwatchAlert: true,
    stopwatchThresholdHours: 6,
    budgetAlert: true,
    budgetThresholdPercent: 90,
    scheduleAlert: false,
    peakHourAlert: false,
    surgeAlert: false,
    surgeThresholdWatts: 3000,
  },
  standard: {
    notificationLevel: "standard",
    soundEnabled: true,
    vibrationEnabled: true,
    stopwatchAlert: true,
    stopwatchThresholdHours: 4,
    budgetAlert: true,
    budgetThresholdPercent: 80,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: false,
    surgeThresholdWatts: 2500,
  },
  proactive: {
    notificationLevel: "proactive",
    soundEnabled: true,
    vibrationEnabled: true,
    stopwatchAlert: true,
    stopwatchThresholdHours: 2,
    budgetAlert: true,
    budgetThresholdPercent: 70,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: true,
    surgeThresholdWatts: 2500,
  },
  strict: {
    notificationLevel: "strict",
    soundEnabled: true,
    vibrationEnabled: true,
    stopwatchAlert: true,
    stopwatchThresholdHours: 1,
    budgetAlert: true,
    budgetThresholdPercent: 50,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: true,
    surgeThresholdWatts: 2000,
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  notificationLevel: "standard",
  soundEnabled: true,
  vibrationEnabled: true,
  stopwatchAlert: true,
  stopwatchThresholdHours: 4,
  budgetAlert: true,
  budgetThresholdPercent: 80,
  scheduleAlert: true,
  peakHourAlert: true,
  surgeAlert: false,
  surgeThresholdWatts: 2500,
};

/**
 * Checks if the browser environment supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Gets current browser notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests browser permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) {
    devLog.warn("Notifications", "Web Notifications API is not supported in this browser.");
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    devLog.info("Notifications", `Notification permission response: ${permission}`);
    return permission;
  } catch (err: any) {
    devLog.error("Notifications", `Error requesting notification permission: ${err?.message}`, err);
    return "denied";
  }
}

/**
 * Gets stored notification preferences
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Saves updated notification preferences
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
    devLog.info("Notifications", "Saved notification preferences", prefs);
  } catch (err: any) {
    devLog.warn("Notifications", `Failed to save preferences: ${err?.message}`);
  }
}

/**
 * Web Audio API synthesized alert chimes (requires 0 external assets, works offline)
 */
export function playNotificationSound(type: "chime" | "warning" | "urgent" = "chime"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "urgent") {
      // Urgent two-tone alarm: 880Hz (A5) -> 1174.66Hz (D6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1174.66, now + 0.14);
      osc1.frequency.setValueAtTime(880, now + 0.28);
      osc1.frequency.setValueAtTime(1174.66, now + 0.42);

      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.65);
    } else if (type === "warning") {
      // Two-step warning chime: 659.25Hz (E5) -> 830.6Hz (G#5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(830.6, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Pleasant harmonic chime: 587.33Hz (D5) -> 880Hz (A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    // AudioContext blocked by browser autoplay policy if un-interacted
  }
}

/**
 * Mobile Android haptic vibration patterns
 */
export function triggerNotificationVibration(urgency: AlertUrgency = "normal"): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    switch (urgency) {
      case "critical":
        navigator.vibrate([300, 100, 300, 100, 500]);
        break;
      case "high":
        navigator.vibrate([200, 100, 200]);
        break;
      case "normal":
      default:
        navigator.vibrate(150);
        break;
    }
  } catch {
    // Ignore if vibration is restricted
  }
}

/**
 * Sends a native browser notification if permission is granted and feature is enabled
 */
export function sendNotification(options: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  urgency?: AlertUrgency;
  soundType?: "chime" | "warning" | "urgent";
  onClick?: () => void;
}): Notification | null {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return null;

  const urgency = options.urgency || "normal";
  const soundType = options.soundType || (urgency === "critical" ? "urgent" : urgency === "high" ? "warning" : "chime");

  // Trigger synthesized audio if sound is enabled
  if (prefs.soundEnabled) {
    playNotificationSound(soundType);
  }

  // Trigger mobile haptic vibration if enabled
  if (prefs.vibrationEnabled) {
    triggerNotificationVibration(urgency);
  }

  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notif = new Notification(options.title, {
      body: options.body,
      icon: options.icon || "/Assets/LOGO.png",
      tag: options.tag,
      badge: "/Assets/LOGO.png",
    });

    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }

    devLog.info("Notifications", `Triggered browser notification (${urgency}): "${options.title}"`, options);
    return notif;
  } catch (err: any) {
    devLog.warn("Notifications", `Failed to display notification: ${err?.message}`);
    return null;
  }
}
