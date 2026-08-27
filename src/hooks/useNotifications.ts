import { useState, useEffect, useCallback, useRef } from "react";
import { UserAppliance, UserCalendarEvent } from "../types";
import {
  NotificationPreferences,
  getNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  sendNotification,
  isNotificationSupported,
} from "../lib/notificationService";
import { devLog } from "../lib/devLogger";

interface UseNotificationsProps {
  appliances?: UserAppliance[];
  events?: UserCalendarEvent[];
  monthlyBudget?: number;
  projectedBill?: number;
}

export function useNotifications({
  appliances = [],
  events = [],
  monthlyBudget,
  projectedBill,
}: UseNotificationsProps = {}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    getNotificationPermission()
  );
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const sentAlertsRef = useRef<Set<string>>(new Set());

  // Refresh permission state on focus
  useEffect(() => {
    const handleFocus = () => {
      setPermission(getNotificationPermission());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const handleUpdatePrefs = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      saveNotificationPreferences(updated);
      return updated;
    });
  }, []);

  const handleTestNotification = useCallback(() => {
    sendNotification({
      title: "PowerForecast Notification Test",
      body: "Smart Energy Notifications are active and working smoothly!",
      tag: `test-${Date.now()}`,
    });
  }, []);

  // 1. Stopwatch Over-run Monitor (Every 60s)
  useEffect(() => {
    if (!prefs.enabled || !prefs.stopwatchAlert || permission !== "granted") return;

    const checkStopwatches = () => {
      const running = appliances.filter((a) => a.is_currently_on && a.last_turned_on_at);
      const now = Date.now();
      const thresholdMs = (prefs.stopwatchThresholdHours || 4) * 3600 * 1000;

      running.forEach((app) => {
        const startTime = new Date(app.last_turned_on_at!).getTime();
        const elapsedMs = now - startTime;

        if (elapsedMs >= thresholdMs) {
          const alertKey = `stopwatch-${app.id}-${Math.floor(elapsedMs / (3600 * 1000))}`;
          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);

            const hours = (elapsedMs / (3600 * 1000)).toFixed(1);
            const kwh = ((app.watts * (app.quantity || 1) * (elapsedMs / (3600 * 1000))) / 1000).toFixed(2);
            const cost = (parseFloat(kwh) * 14.8261).toFixed(2);

            sendNotification({
              title: `Stopwatch Alert: ${app.name}`,
              body: `Running for ${hours} hrs (${kwh} kWh / ~₱${cost}). Did you leave it on?`,
              tag: `stopwatch-${app.id}`,
            });
          }
        }
      });
    };

    checkStopwatches();
    const interval = setInterval(checkStopwatches, 60000);
    return () => clearInterval(interval);
  }, [appliances, prefs.enabled, prefs.stopwatchAlert, prefs.stopwatchThresholdHours, permission]);

  // 2. Schedule Queue Reminders (Every 60s)
  useEffect(() => {
    if (!prefs.enabled || !prefs.scheduleAlert || permission !== "granted" || events.length === 0) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      events.forEach((ev) => {
        if (ev.day === currentDay || ev.is_recurring) {
          // Alert if scheduled task starts in 5 minutes
          if (ev.hour === currentHour + 1 && currentMin >= 55) {
            const alertKey = `sched-${ev.id}-${now.toDateString()}-${ev.hour}`;
            if (!sentAlertsRef.current.has(alertKey)) {
              sentAlertsRef.current.add(alertKey);

              sendNotification({
                title: `Scheduled Task Reminder: ${ev.title}`,
                body: `Starts in 5 minutes (${ev.hour}:00). Duration: ${ev.duration_hours}h.`,
                tag: `sched-${ev.id}`,
              });
            }
          }
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [events, prefs.enabled, prefs.scheduleAlert, permission]);

  // 3. Budget Threshold Alert (Every 30m)
  useEffect(() => {
    if (!prefs.enabled || !prefs.budgetAlert || permission !== "granted" || !monthlyBudget || !projectedBill) return;

    const percentage = (projectedBill / monthlyBudget) * 100;
    if (percentage >= (prefs.budgetThresholdPercent || 80)) {
      const monthKey = `budget-${new Date().getFullYear()}-${new Date().getMonth()}-${Math.floor(percentage / 10)}`;
      if (!sentAlertsRef.current.has(monthKey)) {
        sentAlertsRef.current.add(monthKey);

        sendNotification({
          title: `Meralco Budget Warning (${percentage.toFixed(0)}%)`,
          body: `Projected bill ₱${projectedBill.toFixed(2)} reached ${percentage.toFixed(0)}% of your ₱${monthlyBudget} budget!`,
          tag: "budget-alert",
        });
      }
    }
  }, [monthlyBudget, projectedBill, prefs.enabled, prefs.budgetAlert, prefs.budgetThresholdPercent, permission]);

  // 4. Peak Hour Warning (Every 15m)
  useEffect(() => {
    if (!prefs.enabled || !prefs.peakHourAlert || permission !== "granted") return;

    const checkPeakHour = () => {
      const now = new Date();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const hour = now.getHours();

      // Meralco Afternoon Peak (13:00 - 16:00) & Evening Peak (18:00 - 21:00)
      const isPeakStart = isWeekday && (hour === 13 || hour === 18) && now.getMinutes() < 15;
      if (isPeakStart) {
        const peakKey = `peak-${now.toDateString()}-${hour}`;
        if (!sentAlertsRef.current.has(peakKey)) {
          sentAlertsRef.current.add(peakKey);

          sendNotification({
            title: "Meralco Peak Demand Period Started",
            body: `Grid demand is currently elevated (${hour}:00 - ${hour + 3}:00). Consider pausing high-wattage appliances to optimize your bill.`,
            tag: `peak-${hour}`,
          });
        }
      }
    };

    checkPeakHour();
    const interval = setInterval(checkPeakHour, 15 * 60000);
    return () => clearInterval(interval);
  }, [prefs.enabled, prefs.peakHourAlert, permission]);

  return {
    permission,
    isSupported: isNotificationSupported(),
    prefs,
    requestPermission: handleRequestPermission,
    updatePrefs: handleUpdatePrefs,
    testNotification: handleTestNotification,
  };
}
