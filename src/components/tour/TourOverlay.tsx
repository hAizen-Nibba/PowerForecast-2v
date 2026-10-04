import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  SkipNext as SkipNextIcon,
  Translate as TranslateIcon,
  Explore as ExploreIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { type TourStep, type TourLanguage, type TourPage, PAGE_METADATA } from './tourSteps';
import { type TourMode } from './TourProvider';

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  language: TourLanguage;
  mode: TourMode;
  fullTourProgress: {
    pageIndex: number;
    totalPages: number;
    pageName: TourPage;
  } | null;
  currentTourTitle: string;
  onChangeLanguage: (lang: TourLanguage) => void;
  onNext: () => void;
  onPrev: () => void;
  onSkipPage?: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 14;
const TOOLTIP_MAX_WIDTH = 420;

function computePlacement(
  targetRect: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferred?: 'top' | 'bottom' | 'left' | 'right'
): { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spaceTop = targetRect.top - SPOTLIGHT_PADDING;
  const spaceBottom = vh - targetRect.bottom - SPOTLIGHT_PADDING;
  const spaceLeft = targetRect.left - SPOTLIGHT_PADDING;
  const spaceRight = vw - targetRect.right - SPOTLIGHT_PADDING;

  let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  if (preferred) {
    const fits: Record<string, boolean> = {
      top: spaceTop >= tooltipHeight + TOOLTIP_GAP,
      bottom: spaceBottom >= tooltipHeight + TOOLTIP_GAP,
      left: spaceLeft >= tooltipWidth + TOOLTIP_GAP,
      right: spaceRight >= tooltipWidth + TOOLTIP_GAP,
    };

    if (fits[preferred]) {
      placement = preferred;
    } else {
      const ranked = [
        { dir: 'bottom' as const, space: spaceBottom },
        { dir: 'top' as const, space: spaceTop },
        { dir: 'right' as const, space: spaceRight },
        { dir: 'left' as const, space: spaceLeft },
      ].sort((a, b) => b.space - a.space);
      placement = ranked[0].dir;
    }
  } else {
    const ranked = [
      { dir: 'bottom' as const, space: spaceBottom },
      { dir: 'top' as const, space: spaceTop },
      { dir: 'right' as const, space: spaceRight },
      { dir: 'left' as const, space: spaceLeft },
    ].sort((a, b) => b.space - a.space);
    placement = ranked[0].dir;
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'bottom':
      top = targetRect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'top':
      top = targetRect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP - tooltipHeight;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + SPOTLIGHT_PADDING + TOOLTIP_GAP;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - SPOTLIGHT_PADDING - TOOLTIP_GAP - tooltipWidth;
      break;
  }

  left = Math.max(16, Math.min(left, vw - tooltipWidth - 16));
  top = Math.max(16, Math.min(top, vh - tooltipHeight - 16));

  return { top, left, placement };
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  language,
  mode,
  fullTourProgress,
  currentTourTitle,
  onChangeLanguage,
  onNext,
  onPrev,
  onSkipPage,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isCenteredFallback, setIsCenteredFallback] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const copy = step.copy[language] || step.copy.en;

  // ── Find and measure target element ──────────────────────────
  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) {
      setTargetRect(null);
      setIsCenteredFallback(true);
      return;
    }

    setIsCenteredFallback(false);
    const rect = el.getBoundingClientRect();
    const isInView = rect.top >= 20 && rect.bottom <= window.innerHeight - 20;

    if (!isInView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => {
        const newRect = el.getBoundingClientRect();
        setTargetRect({
          top: newRect.top,
          left: newRect.left,
          width: newRect.width,
          height: newRect.height,
          bottom: newRect.bottom,
          right: newRect.right,
        });
      }, 420);
      return () => clearTimeout(timer);
    } else {
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
    }
  }, [step.id]);

  useEffect(() => {
    measureTarget();
  }, [measureTarget, stepIndex]);

  useEffect(() => {
    const handler = () => measureTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [measureTarget]);

  // ── Compute Tooltip Position ──────────────────────────────
  useLayoutEffect(() => {
    const tooltipEl = tooltipRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = Math.min(tooltipEl?.offsetWidth || TOOLTIP_MAX_WIDTH, vw - 32);
    const tooltipHeight = tooltipEl?.offsetHeight || 220;

    if (!targetRect) {
      // Graceful centered fallback
      setTooltipPos({
        top: Math.max(20, Math.floor((vh - tooltipHeight) / 2)),
        left: Math.max(16, Math.floor((vw - tooltipWidth) / 2)),
      });
      return;
    }

    const pos = computePlacement(targetRect, tooltipWidth, tooltipHeight, step.placement);
    setTooltipPos({ top: pos.top, left: pos.left });
  }, [targetRect, step.placement, language, stepIndex]);

  // ── Keyboard Controls ─────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip, onNext, onPrev]);

  // ── Build clip-path for spotlight cutout ──────────────────
  const buildClipPath = () => {
    if (!targetRect) return 'none';
    const p = SPOTLIGHT_PADDING;
    const x = Math.max(0, targetRect.left - p);
    const y = Math.max(0, targetRect.top - p);
    const w = targetRect.width + p * 2;
    const h = targetRect.height + p * 2;
    const r = 10;

    return `polygon(
      0% 0%, 0% 100%, ${x}px 100%, ${x}px ${y + r}px,
      ${x + r}px ${y}px, ${x + w - r}px ${y}px, ${x + w}px ${y + r}px,
      ${x + w}px ${y + h - r}px, ${x + w - r}px ${y + h}px,
      ${x + r}px ${y + h}px, ${x}px ${y + h - r}px,
      ${x}px 100%, 100% 100%, 100% 0%
    )`;
  };

  const progressPct = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const currentModuleMeta = fullTourProgress ? PAGE_METADATA[fullTourProgress.pageName] : null;

  return (
    <>
      {/* Semi-transparent backdrop with cutout */}
      <Box
        onClick={onSkip}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 99980,
          bgcolor: 'rgba(0, 0, 0, 0.65)',
          clipPath: targetRect ? buildClipPath() : 'none',
          transition: 'clip-path 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
        }}
      />

      {/* Target Focus Ring & Pulse */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - SPOTLIGHT_PADDING,
            left: targetRect.left - SPOTLIGHT_PADDING,
            width: targetRect.width + SPOTLIGHT_PADDING * 2,
            height: targetRect.height + SPOTLIGHT_PADDING * 2,
            borderRadius: 1.5,
            border: '2px solid',
            borderColor: (theme) => (theme.palette.mode === 'dark' ? '#fafafa' : '#09090b'),
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 0 0 3px rgba(255, 255, 255, 0.16), 0 8px 32px rgba(0, 0, 0, 0.85)'
                : '0 0 0 3px rgba(9, 9, 11, 0.12), 0 8px 24px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'none',
            zIndex: 99982,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'tourPulse 2.8s infinite ease-in-out',
            '@keyframes tourPulse': {
              '0%': {
                boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.16), 0 8px 32px rgba(0, 0, 0, 0.85)',
              },
              '50%': {
                boxShadow: '0 0 0 5px rgba(255, 255, 255, 0.28), 0 12px 40px rgba(0, 0, 0, 0.95)',
              },
              '100%': {
                boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.16), 0 8px 32px rgba(0, 0, 0, 0.85)',
              },
            },
          }}
        />
      )}

      {/* Floating Tooltip Card */}
      <Box
        ref={tooltipRef}
        sx={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: { xs: 'calc(100vw - 32px)', sm: TOOLTIP_MAX_WIDTH },
          maxWidth: TOOLTIP_MAX_WIDTH,
          zIndex: 99985,
          pointerEvents: 'auto',
          transition: 'top 0.25s cubic-bezier(0.4, 0, 0.2, 1), left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step.id}-${language}`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.25, sm: 2.75 },
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? '#121215' : '#ffffff',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? '#27272a' : '#e4e4e7',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
                    : '0 16px 45px rgba(15, 23, 42, 0.12)',
                backdropFilter: 'blur(20px)',
                position: 'relative',
              }}
            >
              {/* Top Banner / Breadcrumb */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                  {mode === 'full' && fullTourProgress ? (
                    <Chip
                      size="small"
                      label={`Module ${fullTourProgress.pageIndex + 1}/${fullTourProgress.totalPages}: ${
                        currentModuleMeta?.title[language] || fullTourProgress.pageName
                      }`}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        color: 'text.primary',
                        border: '1px solid',
                        borderColor: (theme) =>
                          theme.palette.mode === 'dark' ? '#27272a' : '#e4e4e7',
                        maxWidth: 260,
                      }}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.6875rem' }}>
                      {currentTourTitle || 'PowerForecast Tour'}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {/* Language switch */}
                  <Tooltip title={language === 'en' ? 'Lumipat sa Tagalog' : 'Switch to English'}>
                    <Button
                      size="small"
                      onClick={() => onChangeLanguage(language === 'en' ? 'tl' : 'en')}
                      startIcon={<TranslateIcon sx={{ fontSize: '13px !important' }} />}
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        minWidth: 42,
                        py: 0.25,
                        px: 0.75,
                        borderRadius: 1,
                        textTransform: 'none',
                        color: 'text.secondary',
                        bgcolor: 'action.hover',
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {language.toUpperCase()}
                    </Button>
                  </Tooltip>

                  {/* Close button */}
                  <IconButton
                    size="small"
                    onClick={onSkip}
                    sx={{
                      color: 'text.secondary',
                      p: 0.5,
                      borderRadius: 1,
                      '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Centered Overview Notice if element not spotlighted */}
              {isCenteredFallback && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(217, 119, 6, 0.1)',
                    color: 'warning.main',
                  }}
                >
                  <InfoIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    {language === 'tl'
                      ? 'Pangkalahatang Tanawin para sa seksyong ito'
                      : 'Overview step for this module'}
                  </Typography>
                </Box>
              )}

              {/* Title */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: 'text.primary',
                  letterSpacing: '-0.01em',
                  mb: 0.75,
                  lineHeight: 1.3,
                }}
              >
                {copy.title}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.55,
                  mb: 2,
                  fontSize: '0.8125rem',
                }}
              >
                {copy.description}
              </Typography>

              {/* Progress bar */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.6875rem' }}>
                    {language === 'tl' ? 'Hakbang' : 'Step'} {stepIndex + 1} {language === 'tl' ? 'ng' : 'of'} {totalSteps}
                  </Typography>
                  {mode === 'full' && onSkipPage && (
                    <Button
                      size="small"
                      onClick={onSkipPage}
                      endIcon={<SkipNextIcon sx={{ fontSize: '14px !important' }} />}
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        color: 'text.secondary',
                        p: 0,
                        minWidth: 0,
                        '&:hover': { color: 'text.primary' },
                      }}
                    >
                      {language === 'tl' ? 'I-skip itong module' : 'Skip module'}
                    </Button>
                  )}
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2,
                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#fafafa' : '#09090b'),
                    },
                  }}
                />
              </Box>

              {/* Controls Footer */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Button
                  size="small"
                  onClick={onPrev}
                  disabled={isFirstStep}
                  startIcon={<ArrowBackIcon sx={{ fontSize: '16px !important' }} />}
                  sx={{
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.8125rem',
                    borderRadius: 1,
                    px: 1.5,
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  {language === 'tl' ? 'Bumalik' : 'Back'}
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onNext}
                    endIcon={isLastStep ? <CheckIcon sx={{ fontSize: '16px !important' }} /> : <ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                    sx={{
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      borderRadius: 1,
                      px: 2,
                      py: 0.7,
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? '#fafafa' : '#09090b',
                      color: (theme) =>
                        theme.palette.mode === 'dark' ? '#09090b' : '#fafafa',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      '&:hover': {
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? '#e4e4e7' : '#18181b',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                      },
                    }}
                  >
                    {isLastStep
                      ? language === 'tl'
                        ? 'Tapusin'
                        : 'Finish'
                      : language === 'tl'
                      ? 'Susunod'
                      : 'Next'}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        </AnimatePresence>
      </Box>
    </>
  );
};
