import { useState, useEffect } from "react";
import { devLog } from "./devLogger";

/**
 * Registers the PowerForecast Service Worker for PWA capabilities & offline caching
 */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          devLog.info("PWA", "Service Worker registered successfully with scope:", registration.scope);
        })
        .catch((err) => {
          devLog.warn("PWA", "Service Worker registration failed:", err);
        });
    });
  }
}

/**
 * React hook to listen for Android beforeinstallprompt events
 */
export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      devLog.info("PWA", "App install prompt ready for Android user.");
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      devLog.info("PWA", "PowerForecast PWA was successfully installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    devLog.info("PWA", `User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === "accepted";
  };

  return { isInstallable, triggerInstall };
}
