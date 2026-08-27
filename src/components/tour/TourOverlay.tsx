import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'framer-motion';
import { type TourStep, type TourLanguage } from './tourSteps';

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  language: TourLanguage;
  onChangeLanguage: (lang: TourLanguage) => void;
  onNext: () => void;
  onPrev: () => void;
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

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 16;
const TOOLTIP_MAX_WIDTH = 380;

/**
 * Calculate the best placement for the tooltip relative to the target element.
 */
function computePlacement(
  targetRect: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferred?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
): { top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Space available in each direction
  const spaceTop = targetRect.top - SPOTLIGHT_PADDING;
  const spaceBottom = vh - targetRect.bottom - SPOTLIGHT_PADDING;
  const spaceLeft = targetRect.left - SPOTLIGHT_PADDING;
  const spaceRight = vw - targetRect.right - SPOTLIGHT_PADDING;

  // Determine best placement
  let placement: 'top' | 'bottom' | 'left' | 'right' = 'bottom';

  if (preferred && preferred !== 'auto') {
    // Use preferred if there's enough room
    const fits: Record<string, boolean> = {
      top: spaceTop >= tooltipHeight + TOOLTIP_GAP,
      bottom: spaceBottom >= tooltipHeight + TOOLTIP_GAP,
      left: spaceLeft >= tooltipWidth + TOOLTIP_GAP,
      right: spaceRight >= tooltipWidth + TOOLTIP_GAP,
    };
    if (fits[preferred]) {
      placement = preferred;
    } else {
      // Fallback: pick the direction with the most space
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

  // Clamp within viewport
  left = Math.max(12, Math.min(left, vw - tooltipWidth - 12));
  top = Math.max(12, Math.min(top, vh - tooltipHeight - 12));

  return { top, left, placement };
}

export const TourOverlay: React.FC<TourOverlayProps> = ({
  step,
  stepIndex,
  totalSteps,
  language,
  onChangeLanguage,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}) => {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showLangPicker, setShowLangPicker] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const copy = step.copy[language];

  // ── Find & measure target element ──────────────────────────
  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.id}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll into view if needed
    const rect = el.getBoundingClientRect();
    const isInView =
      rect.top >= -50 &&
      rect.bottom <= window.innerHeight + 50;

    if (!isInView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Re-measure after scroll animation
      setTimeout(() => {
        const newRect = el.getBoundingClientRect();
        setTargetRect({
          top: newRect.top,
          left: newRect.left,
          width: newRect.width,
          height: newRect.height,
          bottom: newRect.bottom,
          right: newRect.right,
        });
      }, 450);
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

  // Re-measure on step change
  useEffect(() => {
    measureTarget();
  }, [measureTarget, stepIndex]);

  // Re-measure on resize / scroll
  useEffect(() => {
    const handler = () => measureTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [measureTarget]);

  // ── Position tooltip once we know target rect + tooltip dimensions
  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltipEl = tooltipRef.current;
    const tooltipWidth = Math.min(tooltipEl.offsetWidth || TOOLTIP_MAX_WIDTH, TOOLTIP_MAX_WIDTH);
    const tooltipHeight = tooltipEl.offsetHeight || 200;

    const pos = computePlacement(targetRect, tooltipWidth, tooltipHeight, step.placement);
    setTooltipPos({ top: pos.top, left: pos.left });
  }, [targetRect, step.placement, language, showLangPicker]);

  // ── Handle keyboard ────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip, onNext, onPrev]);

  // ── Build clip-path for spotlight cutout ────────────────────
  const buildClipPath = () => {
    if (!targetRect) return 'none';
    const p = SPOTLIGHT_PADDING;
    const x = targetRect.left - p;
    const y = targetRect.top - p;
    const w = targetRect.width + p * 2;
    const h = targetRect.height + p * 2;
    const r = 12; // border-radius of cutout

    // Polygon with rounded rect hole using SVG-in-clip-path approach not supported,
    // so we use a simpler approach: inset with polygon
    return `polygon(
      0% 0%, 0% 100%, ${x}px 100%, ${x}px ${y + r}px,
      ${x + r}px ${y}px, ${x + w - r}px ${y}px, ${x + w}px ${y + r}px,
      ${x + w}px ${y + h - r}px, ${x + w - r}px ${y + h}px,
      ${x + r}px ${y + h}px, ${x}px ${y + h - r}px,
      ${x}px 100%, 100% 100%, 100% 0%
    )`;
  };

  return (
    <>
      {/* Full-screen backdrop with spotlight cutout */}
      <Box
        onClick={onSkip}
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 99980,
          bgcolor: 'rgba(0, 0, 0, 0.62)',
          clipPath: targetRect ? buildClipPath() : 'none',
          transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
        }}
      />

      {/* Highlight border ring around target */}
      {targetRect && (
        <Box
          sx={{
            position: 'fixed',
            top: targetRect.top - SPOTLIGHT_PADDING,
            left: targetRect.left - SPOTLIGHT_PADDING,
            width: targetRect.width + SPOTLIGHT_PADDING * 2,
            height: targetRect.height + SPOTLIGHT_PADDING * 2,
            borderRadius: '10px',
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 0 24px rgba(0, 229, 201, 0.45), inset 0 0 24px rgba(0, 229, 201, 0.08)',
            pointerEvents: 'none',
            zIndex: 99981,
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      )}

      {/* Tooltip Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tour-step-${stepIndex}`}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 99985,
            maxWidth: TOOLTIP_MAX_WIDTH,
            width: '92vw',
          }}
        >
          <Paper
            ref={tooltipRef}
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(23, 26, 31, 0.98)'
                  : 'rgba(255, 255, 255, 0.98)',
              border: '1px solid',
              borderColor: 'rgba(0, 229, 201, 0.35)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 229, 201, 0.1)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {/* Top bar: step indicator + language + close */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: 'primary.main',
                  fontSize: '0.6875rem',
                  letterSpacing: '0.05em',
                }}
              >
                STEP {stepIndex + 1} OF {totalSteps}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {/* Language toggle mini button */}
                <IconButton
                  size="small"
                  onClick={() => setShowLangPicker((p) => !p)}
                  sx={{
                    p: 0.5,
                    color: showLangPicker ? 'primary.main' : 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <TranslateIcon sx={{ fontSize: 16 }} />
                </IconButton>

                <IconButton
                  size="small"
                  onClick={onSkip}
                  sx={{
                    p: 0.5,
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Inline language picker (collapsible) */}
            {showLangPicker && (
              <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup
                  value={language}
                  exclusive
                  onChange={(_, val) => {
                    if (val) onChangeLanguage(val as TourLanguage);
                  }}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      py: 0.5,
                      borderRadius: '6px !important',
                      mx: 0.25,
                      '&.Mui-selected': {
                        bgcolor: 'primary.main',
                        color: '#ffffff',
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                >
                  <ToggleButton value="en">English</ToggleButton>
                  <ToggleButton value="tl">Tagalog</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Title */}
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.01em',
                mb: 1,
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
                lineHeight: 1.65,
                mb: 2.5,
                fontSize: '0.8125rem',
              }}
            >
              {copy.description}
            </Typography>

            {/* Progress dots */}
            <Box sx={{ display: 'flex', gap: 0.5, mb: 2, justifyContent: 'center' }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: i === stepIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: i === stepIndex ? 'primary.main' : i < stepIndex ? 'primary.light' : 'action.disabled',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Box>

            {/* Navigation buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                size="small"
                variant="text"
                onClick={onPrev}
                disabled={isFirstStep}
                startIcon={<ArrowBackIcon sx={{ fontSize: '14px !important' }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                  visibility: isFirstStep ? 'hidden' : 'visible',
                }}
              >
                Back
              </Button>

              <Button
                size="small"
                variant="contained"
                onClick={onNext}
                endIcon={
                  isLastStep ? (
                    <CheckIcon sx={{ fontSize: '16px !important' }} />
                  ) : (
                    <ArrowForwardIcon sx={{ fontSize: '14px !important' }} />
                  )
                }
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  borderRadius: 1,
                  px: 2.5,
                  py: 0.75,
                  boxShadow: '0 2px 12px rgba(0, 229, 201, 0.3)',
                }}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </Button>
            </Box>

            {/* Skip link */}
            <Box sx={{ textAlign: 'center', mt: 1.5 }}>
              <Typography
                variant="caption"
                onClick={onSkip}
                sx={{
                  color: 'text.disabled',
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  '&:hover': { color: 'text.secondary', textDecoration: 'underline' },
                  transition: 'color 0.2s',
                }}
              >
                Skip tour
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </AnimatePresence>
    </>
  );
};
