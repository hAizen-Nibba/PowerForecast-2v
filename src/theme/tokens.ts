/**
 * Design Tokens for PowerForecast
 * Adheres to Google Stitch guidelines and Stack Template (shadcn zinc theme):
 * - Neutral zinc base palette
 * - Single restrained accent (emerald) exclusively for live energy draw / ON circuits
 * - 1px borders, zero gradients, zero excessive glows
 * - Inter with tabular numerals for high-precision telemetry
 */

export const zinc = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
} as const;

export const emerald = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669',
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
} as const;

export const tokens = {
  zinc,
  emerald,
  dark: {
    bg: '#09090b',
    surface: '#09090b',
    surfaceSubtle: '#121215',
    card: '#09090b',
    cardElevated: '#121215',
    sidebar: '#09090b',
    border: '#27272a',
    borderSubtle: '#1e1e22',
    borderStrong: '#3f3f46',
    fg: '#fafafa',
    textPrimary: '#fafafa',
    fgMuted: '#a1a1aa',
    textSecondary: '#a1a1aa',
    fgSubtle: '#71717a',
    textMuted: '#71717a',
    hover: 'rgba(255, 255, 255, 0.05)',
    active: '#27272a',
    // Live / Energy state accent (only used for live telemetry & circuits ON)
    live: '#34d399',
    liveGlow: 'rgba(52, 211, 153, 0.2)',
    liveBg: 'rgba(52, 211, 153, 0.1)',
    liveBorder: 'rgba(52, 211, 153, 0.3)',
    // Primary action (solid button / active nav)
    primary: '#fafafa',
    primaryFg: '#18181b',
    // Status
    warn: '#f59e0b',
    warnBg: 'rgba(245, 158, 11, 0.1)',
    warnBorder: 'rgba(245, 158, 11, 0.3)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    errorBorder: 'rgba(239, 68, 68, 0.3)',
    // Charts (Shadcn Zinc chart tokens)
    chart: ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f43f5e'],
  },
  light: {
    bg: '#ffffff',
    surface: '#ffffff',
    surfaceSubtle: '#f4f4f5',
    card: '#ffffff',
    cardElevated: '#fcfcfc',
    sidebar: '#ffffff',
    border: '#e4e4e7',
    borderSubtle: '#f4f4f5',
    borderStrong: '#d4d4d8',
    fg: '#09090b',
    textPrimary: '#09090b',
    fgMuted: '#52525b',
    textSecondary: '#52525b',
    fgSubtle: '#71717a',
    textMuted: '#71717a',
    hover: 'rgba(0, 0, 0, 0.04)',
    active: '#f4f4f5',
    // Live / Energy state accent
    live: '#059669',
    liveGlow: 'rgba(5, 150, 105, 0.2)',
    liveBg: 'rgba(5, 150, 105, 0.1)',
    liveBorder: 'rgba(5, 150, 105, 0.3)',
    // Primary action
    primary: '#18181b',
    primaryFg: '#fafafa',
    // Status
    warn: '#d97706',
    warnBg: 'rgba(217, 119, 6, 0.1)',
    warnBorder: 'rgba(217, 119, 6, 0.3)',
    error: '#dc2626',
    errorBg: 'rgba(220, 38, 38, 0.1)',
    errorBorder: 'rgba(220, 38, 38, 0.3)',
    // Charts
    chart: ['#059669', '#2563eb', '#d97706', '#7c3aed', '#e11d48'],
  },
} as const;
