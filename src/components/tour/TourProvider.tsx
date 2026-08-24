import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { TourOverlay } from './TourOverlay';
import { TourWelcomeModal } from './TourWelcomeModal';
import {
  type TourStep,
  type TourLanguage,
  type PageTour,
  getTourForPage,
  ROUTE_TO_TOUR_PAGE,
} from './tourSteps';

// ── Persistence Keys ─────────────────────────────────────────
const STORAGE_PREFIX = 'pf_tour_seen_';
const LANG_STORAGE_KEY = 'pf_tour_language';

function getSeenKey(pageName: string) {
  return `${STORAGE_PREFIX}${pageName}`;
}

function hasSeenTour(pageName: string): boolean {
  try {
    return localStorage.getItem(getSeenKey(pageName)) === 'true';
  } catch {
    return false;
  }
}

function markTourSeen(pageName: string) {
  try {
    localStorage.setItem(getSeenKey(pageName), 'true');
  } catch {
    // localStorage unavailable — silently skip
  }
}

function clearTourSeen(pageName?: string) {
  try {
    if (pageName) {
      localStorage.removeItem(getSeenKey(pageName));
    } else {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    }
  } catch {
    // silently skip
  }
}

function getSavedLanguage(): TourLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'tl' || saved === 'taglish') return saved;
  } catch {
    // fallback
  }
  return 'en';
}

function saveLanguage(lang: TourLanguage) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // silently skip
  }
}

// ── Context Shape ────────────────────────────────────────────
export interface TourContextType {
  // State
  isActive: boolean;
  currentPageName: string | null;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TourStep | null;
  currentTour: PageTour | null;
  language: TourLanguage;

  // Controls
  startTour: (pageName: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  resetTour: (pageName?: string) => void;
  setLanguage: (lang: TourLanguage) => void;

  // Welcome modal
  showWelcome: boolean;
  dismissWelcome: () => void;
  startFromWelcome: () => void;
}

export const TourContext = createContext<TourContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────
interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentPageName, setCurrentPageName] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [language, setLanguageState] = useState<TourLanguage>(getSavedLanguage);
  const [showWelcome, setShowWelcome] = useState(false);

  // Pending page for welcome modal → start flow
  const pendingPageRef = useRef<string | null>(null);

  // Resolve tour for current page
  const currentTour = useMemo(() => {
    if (!currentPageName) return null;
    return getTourForPage(currentPageName);
  }, [currentPageName]);

  const totalSteps = currentTour?.steps.length ?? 0;
  const currentStep = currentTour?.steps[currentStepIndex] ?? null;

  // ── Language Setter (persisted) ────────────────────────────
  const setLanguage = useCallback((lang: TourLanguage) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  // ── Start Tour ─────────────────────────────────────────────
  const startTour = useCallback((pageName: string) => {
    const tour = getTourForPage(pageName);
    if (!tour || tour.steps.length === 0) return;

    // Check if user has ever seen ANY tour — if not, show welcome modal first
    const hasSeenAnyTour = Object.keys(ROUTE_TO_TOUR_PAGE).some((route) => {
      const pn = ROUTE_TO_TOUR_PAGE[route];
      return hasSeenTour(pn);
    });

    if (!hasSeenAnyTour && !hasSeenTour(pageName)) {
      // First-time user: show welcome modal
      pendingPageRef.current = pageName;
      setShowWelcome(true);
    } else {
      // Returning user or replay: jump straight into spotlight
      setCurrentPageName(pageName);
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, []);

  // ── Welcome Modal Actions ──────────────────────────────────
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    const pageName = pendingPageRef.current;
    if (pageName) {
      markTourSeen(pageName);
    }
    pendingPageRef.current = null;
  }, []);

  const startFromWelcome = useCallback(() => {
    setShowWelcome(false);
    const pageName = pendingPageRef.current;
    pendingPageRef.current = null;
    if (pageName) {
      const tour = getTourForPage(pageName);
      if (tour && tour.steps.length > 0) {
        setCurrentPageName(pageName);
        setCurrentStepIndex(0);
        setIsActive(true);
      }
    }
  }, []);

  // ── Step Navigation ────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (!currentTour) return;
    if (currentStepIndex < currentTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour completed
      if (currentPageName) markTourSeen(currentPageName);
      setIsActive(false);
      setCurrentPageName(null);
      setCurrentStepIndex(0);
    }
  }, [currentTour, currentStepIndex, currentPageName]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    if (currentPageName) markTourSeen(currentPageName);
    setIsActive(false);
    setCurrentPageName(null);
    setCurrentStepIndex(0);
  }, [currentPageName]);

  const resetTour = useCallback((pageName?: string) => {
    clearTourSeen(pageName);
  }, []);

  // ── Auto-Start on Route Change ─────────────────────────────
  // When user navigates to a page they haven't toured yet, auto-start after delay
  useEffect(() => {
    if (isActive || showWelcome) return; // don't interrupt active tour or welcome

    const pageName = ROUTE_TO_TOUR_PAGE[location.pathname];
    if (!pageName) return;
    if (hasSeenTour(pageName)) return;

    const timer = setTimeout(() => {
      // Re-check in case state changed during timeout
      if (!hasSeenTour(pageName)) {
        startTour(pageName);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname, isActive, showWelcome, startTour]);

  // ── Dismiss tour when navigating away ──────────────────────
  useEffect(() => {
    if (!isActive || !currentPageName) return;
    const expectedPage = ROUTE_TO_TOUR_PAGE[location.pathname];
    if (expectedPage !== currentPageName) {
      // User navigated to a different page while tour is active — dismiss silently
      setIsActive(false);
      setCurrentPageName(null);
      setCurrentStepIndex(0);
    }
  }, [location.pathname, isActive, currentPageName]);

  // ── Context Value ──────────────────────────────────────────
  const contextValue = useMemo<TourContextType>(
    () => ({
      isActive,
      currentPageName,
      currentStepIndex,
      totalSteps,
      currentStep,
      currentTour,
      language,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      resetTour,
      setLanguage,
      showWelcome,
      dismissWelcome,
      startFromWelcome,
    }),
    [
      isActive,
      currentPageName,
      currentStepIndex,
      totalSteps,
      currentStep,
      currentTour,
      language,
      startTour,
      nextStep,
      prevStep,
      skipTour,
      resetTour,
      setLanguage,
      showWelcome,
      dismissWelcome,
      startFromWelcome,
    ]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}
      {/* Welcome Modal (first-ever tour) */}
      <TourWelcomeModal
        open={showWelcome}
        language={language}
        onChangeLanguage={setLanguage}
        onStart={startFromWelcome}
        onDismiss={dismissWelcome}
      />
      {/* Spotlight Overlay (active tour) */}
      {isActive && currentStep && (
        <TourOverlay
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          language={language}
          onChangeLanguage={setLanguage}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          isFirstStep={currentStepIndex === 0}
          isLastStep={currentStepIndex === totalSteps - 1}
        />
      )}
    </TourContext.Provider>
  );
};
