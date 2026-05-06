'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AdaptTour.module.css';

// ── Storage keys ───────────────────────────────────────────────────
const TOUR_COMPLETE_KEY  = 'adaptTourComplete';
const TOUR_PRESETS_KEY   = 'adaptTourPresets';
const TOUR_SUMMARY_SEEN  = 'adaptTourSummarySeen';
const TOUR_FOCUS_SEEN    = 'adaptTourFocusSeen';

// ── Tour step type ─────────────────────────────────────────────────
type TourStep = {
  targetId: string;
  title: string;
  text: string;
  placement?: 'top' | 'bottom' | 'center';
  scroll?: boolean;
};

// ── Reusable shared step atoms ─────────────────────────────────────
const FOCUS_TOOLS_STEP: TourStep = {
  targetId: 'tour-focus-section',
  title: 'Focus Tools',
  text: 'Focus Mode dims all chunks but the one you\'re reading. Focus Line adds a guide bar to track your place. Toggle each on or off.',
  placement: 'top',
  scroll: true,
};

const SUMMARY_STEP: TourStep = {
  targetId: 'tour-summary-btn',
  title: 'Summary',
  text: 'Get a quick AI summary of the full text.',
  placement: 'top',
  scroll: true,
};

// ── Common steps (shown on first ever visit, all presets) ──────────
const COMMON_STEPS: TourStep[] = [
  {
    targetId: 'tour-reading-canvas',
    title: 'Reading Canvas',
    text: 'Your text appears here, adapted for your brain. Layout and style change per preset.',
    placement: 'center',
  },
  {
    targetId: 'tour-preset-selector',
    title: 'Presets',
    text: 'A = Mild, B = Moderate, C = Intense. Switch to find what works for you.',
    placement: 'bottom',
    scroll: true,
  },
  {
    targetId: 'tour-reading-style-section',
    title: 'Reading Style',
    text: 'Bionic Reading bolds the start of each word to guide your eye. In B & C, Sentence Chunking breaks text into short pieces. Toggle each on or off.',
    placement: 'bottom',
    scroll: true,
  },
  {
    targetId: 'tour-appearance-section',
    title: 'Appearance',
    text: 'Pick a background colour (paper, sepia, dark) and use + / – to adjust font size.',
    placement: 'top',
    scroll: true,
  },
  {
    targetId: 'tour-tts-btn',
    title: 'Text to Speech',
    text: 'Tap to hear the adapted text read aloud.',
    placement: 'top',
    scroll: true,
  },
  {
    targetId: 'tour-sync-btn',
    title: 'Sync with Extension',
    text: 'Found your best preset? Sync it to the extension so Readapt works on every website.',
    placement: 'bottom',
    scroll: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────
function getTouredPresets(): string[] {
  try {
    const raw = localStorage.getItem(TOUR_PRESETS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function markPresetTouredAndSave(preset: string) {
  const existing = getTouredPresets();
  if (!existing.includes(preset)) {
    existing.push(preset);
    localStorage.setItem(TOUR_PRESETS_KEY, JSON.stringify(existing));
  }
}

function isTourComplete(): boolean {
  try { return localStorage.getItem(TOUR_COMPLETE_KEY) === 'true'; }
  catch { return false; }
}
function completeTour() {
  try { localStorage.setItem(TOUR_COMPLETE_KEY, 'true'); }
  catch { /* ignore */ }
}

// One-time flags — prevent showing the same step twice across preset tours
function isSummarySeen(): boolean {
  try { return localStorage.getItem(TOUR_SUMMARY_SEEN) === 'true'; }
  catch { return false; }
}
function markSummarySeen() {
  try { localStorage.setItem(TOUR_SUMMARY_SEEN, 'true'); }
  catch { /* ignore */ }
}

function isFocusSeen(): boolean {
  try { return localStorage.getItem(TOUR_FOCUS_SEEN) === 'true'; }
  catch { return false; }
}
function markFocusSeen() {
  try { localStorage.setItem(TOUR_FOCUS_SEEN, 'true'); }
  catch { /* ignore */ }
}

// ── Preset-specific step builders ──────────────────────────────────
// B: Focus Tools (if not seen) + Summary (if not seen)
function buildPresetBSteps(): TourStep[] {
  const steps: TourStep[] = [];
  if (!isFocusSeen())   steps.push(FOCUS_TOOLS_STEP);
  if (!isSummarySeen()) steps.push(SUMMARY_STEP);
  return steps;
}

// C: Focus Tools (if not seen) + Custom Builder + Summary (if not seen)
function buildPresetCSteps(): TourStep[] {
  const steps: TourStep[] = [];
  if (!isFocusSeen()) steps.push(FOCUS_TOOLS_STEP);
  steps.push({
    targetId: 'tour-custom-builder-btn',
    title: 'Custom Builder',
    text: 'Unique to Preset C. Fine-tune font, spacing, and contrast to build your perfect reading mode.',
    placement: 'bottom',
    scroll: true,
  });
  if (!isSummarySeen()) steps.push(SUMMARY_STEP);
  return steps;
}

function getPresetSteps(preset: string): TourStep[] {
  if (preset === 'B') return buildPresetBSteps();
  if (preset === 'C') return buildPresetCSteps();
  return [];
}

// ── Tooltip positioning ────────────────────────────────────────────
const TIP_W  = 300;
const TIP_H  = 155;
const OFFSET = 12;

type TipStyle = { top: number; left: number; arrow: string };

function calcTip(el: HTMLElement | null, placement: TourStep['placement']): TipStyle {
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  const centerPos: TipStyle = {
    top:  Math.max(16, vpH / 2 - TIP_H / 2),
    left: Math.max(16, vpW / 2 - TIP_W / 2),
    arrow: 'none',
  };

  if (placement === 'center' || !el) return centerPos;

  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > vpH || r.right < 0 || r.left > vpW) return centerPos;

  const clampX = (x: number) => Math.max(12, Math.min(vpW - TIP_W - 12, x));
  const clampY = (y: number) => Math.max(12, Math.min(vpH - TIP_H - 12, y));
  const elCx = r.left + r.width / 2;

  let p = placement ?? 'bottom';
  if (p === 'bottom' && r.bottom + TIP_H + OFFSET > vpH - 8) p = 'top';
  if (p === 'top'    && r.top   - TIP_H - OFFSET < 8)        p = 'bottom';
  if (p === 'bottom' && r.bottom + TIP_H + OFFSET > vpH - 8) return centerPos;
  if (p === 'top'    && r.top   - TIP_H - OFFSET < 8)        return centerPos;

  if (p === 'top')  return { top: clampY(r.top - TIP_H - OFFSET), left: clampX(elCx - TIP_W / 2), arrow: 'bottom' };
  /* bottom */      return { top: clampY(r.bottom + OFFSET),       left: clampX(elCx - TIP_W / 2), arrow: 'top'    };
}

// ── Component ──────────────────────────────────────────────────────
type AdaptTourProps = { preset: string };

export default function AdaptTour({ preset }: AdaptTourProps) {
  const [steps,         setSteps        ] = useState<TourStep[]>([]);
  const [stepIndex,     setStepIndex    ] = useState(0);
  const [active,        setActive       ] = useState(false);
  const [tipStyle,      setTipStyle     ] = useState<TipStyle | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [fadeKey,       setFadeKey      ] = useState(0);
  const didInitRef = useRef(false);

  // ── Position step ─────────────────────────────────────────────────
  const positionStep = useCallback((step: TourStep) => {
    const el = document.getElementById(step.targetId);
    if (el && step.scroll) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }
    // Double rAF — lets layout settle after scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const freshEl = document.getElementById(step.targetId);
        if (freshEl) {
          const r = freshEl.getBoundingClientRect();
          const inView =
            r.bottom > 0 && r.top < window.innerHeight &&
            r.right  > 0 && r.left < window.innerWidth;
          setSpotlightRect(inView ? r : null);
          setTipStyle(calcTip(freshEl, step.placement));
        } else {
          setSpotlightRect(null);
          setTipStyle(calcTip(null, 'center'));
        }
        setFadeKey(k => k + 1);
      });
    });
  }, []);

  // ── Init tour ─────────────────────────────────────────────────────
  const initTour = useCallback((currentPreset: string) => {
    if (isTourComplete()) return;
    const toured = getTouredPresets();

    let stepsToShow: TourStep[];
    if (toured.length === 0) {
      stepsToShow = [...COMMON_STEPS, ...getPresetSteps(currentPreset)];
    } else if (!toured.includes(currentPreset)) {
      stepsToShow = getPresetSteps(currentPreset);
    } else {
      stepsToShow = [];
    }

    if (stepsToShow.length === 0) return;
    setSteps(stepsToShow);
    setStepIndex(0);
    setActive(true);
  }, []);

  // Bootstrap on mount
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const t = window.setTimeout(() => initTour(preset), 1000);
    return () => window.clearTimeout(t);
  }, [initTour, preset]);

  // Preset change → fire preset-specific steps if not yet toured
  useEffect(() => {
    if (!didInitRef.current) return;
    if (isTourComplete()) return;
    const toured = getTouredPresets();
    if (toured.length === 0) return;
    if (!toured.includes(preset)) {
      const ps = getPresetSteps(preset);
      if (ps.length > 0) {
        setSteps(ps);
        setStepIndex(0);
        setActive(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // Position tooltip whenever step changes
  useEffect(() => {
    if (!active || steps.length === 0) return;
    const step = steps[stepIndex];
    if (step) positionStep(step);
  }, [active, steps, stepIndex, positionStep]);

  // ── Controls ──────────────────────────────────────────────────────
  function handleNext() {
    const step = steps[stepIndex];
    // Track one-time seen flags before advancing
    if (step?.targetId === 'tour-summary-btn')  markSummarySeen();
    if (step?.targetId === 'tour-focus-section') markFocusSeen();

    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      markPresetTouredAndSave(preset);
      setActive(false);
      setSteps([]);
      setSpotlightRect(null);
      setTipStyle(null);
    }
  }

  function handleSkip() {
    completeTour();
    setActive(false);
    setSteps([]);
    setSpotlightRect(null);
    setTipStyle(null);
  }

  if (!active || steps.length === 0 || !tipStyle) return null;
  const step = steps[stepIndex];
  if (!step) return null;
  const PAD = 8;

  return (
    <>
      <div className={styles.overlay} aria-hidden="true" />
      {spotlightRect && (
        <div
          className={styles.spotlight}
          aria-hidden="true"
          style={{
            top:    spotlightRect.top    - PAD,
            left:   spotlightRect.left   - PAD,
            width:  spotlightRect.width  + PAD * 2,
            height: spotlightRect.height + PAD * 2,
          }}
        />
      )}
      <div
        key={fadeKey}
        className={styles.tooltip}
        data-arrow={tipStyle.arrow}
        style={{ top: tipStyle.top, left: tipStyle.left, width: TIP_W }}
        role="dialog"
        aria-label="Tour tooltip"
      >
        <div className={styles.tooltipTitle}>{step.title}</div>
        <p className={styles.tooltipText}>{step.text}</p>
        <div className={styles.tooltipFooter}>
          <span className={styles.progress}>{stepIndex + 1} / {steps.length}</span>
          <div className={styles.tooltipBtns}>
            <button className={styles.skipBtn} onClick={handleSkip}>Skip tour</button>
            <button className={styles.nextBtn} onClick={handleNext}>
              {stepIndex < steps.length - 1 ? 'Next →' : 'Done ✓'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
