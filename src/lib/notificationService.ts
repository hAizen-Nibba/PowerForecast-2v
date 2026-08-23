import { devLog } from "./devLogger";

export interface NotificationPreferences {
  enabled: boolean;
  stopwatchAlert: boolean;
  stopwatchThresholdHours: number; // default: 4 hours
  budgetAlert: boolean;
  budgetThresholdPercent: number; // default: 80%
  scheduleAlert: boolean;
  peakHourAlert: boolean;
}

const PREF_STORAGE_KEY = "powerforecast_notification_preferences";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  stopwatchAlert: true,
  stopwatchThresholdHours: 4,
  budgetAlert: true,
  budgetThresholdPercent: 80,
  scheduleAlert: true,
  peakHourAlert: true,
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
 * Sends a native browser notification if permission is granted and feature is enabled
 */
export function sendNotification(options: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  onClick?: () => void;
}): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return null;

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

    devLog.info("Notifications", `Triggered browser notification: "${options.title}"`, options);
    return notif;
  } catch (err: any) {
    devLog.warn("Notifications", `Failed to display notification: ${err?.message}`);
    return null;
  }
}
