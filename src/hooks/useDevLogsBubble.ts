import { useState, useEffect, useCallback } from "react";

export const DEV_BUBBLE_STORAGE_KEY = "powerforecast_show_dev_bubble";
export const DEV_BUBBLE_EVENT_KEY = "powerforecast:dev-bubble-change";

export const getDevBubblePreference = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    const stored = localStorage.getItem(DEV_BUBBLE_STORAGE_KEY);
    // Defaults to true so the bubble is active when restored, unless user specifically toggled off
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
};

export const setDevBubblePreference = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEV_BUBBLE_STORAGE_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent(DEV_BUBBLE_EVENT_KEY, { detail: enabled }));
  } catch (e) {
    console.warn("Failed to persist dev bubble preference:", e);
  }
};

export const useDevLogsBubble = () => {
  const [isBubbleEnabled, setIsBubbleEnabled] = useState<boolean>(getDevBubblePreference);

  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      if (typeof customEvent.detail === "boolean") {
        setIsBubbleEnabled(customEvent.detail);
      } else {
        setIsBubbleEnabled(getDevBubblePreference());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEV_BUBBLE_STORAGE_KEY) {
        setIsBubbleEnabled(e.newValue === "true");
      }
    };

    window.addEventListener(DEV_BUBBLE_EVENT_KEY, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(DEV_BUBBLE_EVENT_KEY, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const toggleBubble = useCallback((enabled: boolean) => {
    setIsBubbleEnabled(enabled);
    setDevBubblePreference(enabled);
  }, []);

  return {
    isBubbleEnabled,
    toggleBubble,
    enableBubble: () => toggleBubble(true),
    disableBubble: () => toggleBubble(false),
  };
};

export default useDevLogsBubble;
