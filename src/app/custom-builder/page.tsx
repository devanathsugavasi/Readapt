'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { applyBionicToText } from '@/lib/adaptEngine';
import { CUSTOM_SETTINGS_KEY } from '@/lib/readingSession';
import styles from './page.module.css';

// ── Storage key (must match CUSTOM_SETTINGS_KEY in readingSession.ts) ──
const STORAGE_KEY = CUSTOM_SETTINGS_KEY; // 'readapt:customBuilderSettings'

// ── Long, realistic preview passage (180+ words, multi-sentence) ───
const PREVIEW_TEXT = `The human brain is not a passive receiver of information — it is a relentless prediction engine. As your eyes move across a line of text, your visual cortex does not wait for full word recognition before firing. Instead, it uses the leading letters as anchors and predicts the rest of the word based on millions of pattern-matches stored in long-term memory.

This is why bolding the first portion of each word produces such a striking effect for readers with ADHD. By giving the brain a stronger anchor point, you reduce the cognitive effort required for word recognition. That freed-up capacity flows directly into comprehension and retention — the things that actually matter.

Typography choices compound this effect dramatically. Wider line-height reduces crowding between lines, making it harder for your eyes to accidentally drift to the wrong row. Generous letter spacing prevents letters from blurring into one another during rapid saccades. Shorter line widths reduce the distance your eyes must travel to return to the start of the next line.

All of these adjustments work together. Experiment with each slider and notice how your mental effort changes as you read the text above.`;

// ── Defaults ───────────────────────────────────────────────────────
const DEFAULTS = {
  fontSize: 26,
  lineHeight: 2.16,
  letterSpacing: 0.039,
  wordSpacing: 0.12,
  maxWidth: 730,
  fontFamily: 'Literata, Georgia, serif',
  textColor: '#F0EDEA',
  backgroundColor: '#1A1814',
  bionicIntensity: 0.5,
  focusLineColor: '#C8A96E',
  focusLineOpacity: 0.24,
  focusLineWidth: 56,
  // focusLineLength removed — focus line always spans full text width automatically
};

type Settings = typeof DEFAULTS;

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => `${c}${c}`).join('')
    : normalized;
  if (full.length !== 6) return `rgba(200, 169, 110, ${opacity})`;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

export default function CustomBuilderPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // ── FIX: Load previously saved settings on mount ─────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        // Merge with DEFAULTS so any new fields are still populated
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Bad storage entry — fall through to DEFAULTS
    } finally {
      setLoaded(true);
    }
  }, []);

  const previewHtml = useMemo(
    () => applyBionicToText(PREVIEW_TEXT, settings.bionicIntensity),
    [settings.bionicIntensity]
  );

  const setNumber = (key: keyof Settings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveAndApply = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage quota exceeded — non-fatal
    }
    router.push('/adapt?preset=C');
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Avoid flash of DEFAULTS before localStorage loads
  if (!loaded) {
    return (
      <div className={styles.page} style={{ background: DEFAULTS.backgroundColor, color: DEFAULTS.textColor }}>
        <div className={styles.header}>
          <Link href="/adapt?preset=C" className={styles.backLink}>← Back to Adapt</Link>
          <h1 className={styles.title}>Custom Builder</h1>
        </div>
        <div style={{ padding: '40px', color: '#9cb0d3', fontSize: '14px' }}>Loading settings…</div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ background: settings.backgroundColor, color: settings.textColor }}>
      <div className={styles.header}>
        <Link href="/adapt?preset=C" className={styles.backLink}>← Back to Adapt</Link>
        <h1 className={styles.title}>Custom Builder</h1>
      </div>

      <div className={styles.layout}>
        {/* ── Controls ─────────────────────────────────────────── */}
        <section className={styles.controls}>
          <h2>Manual Controls</h2>

          <label>Font size ({settings.fontSize}px)
            <input type="range" min={14} max={40} step={1}
              value={settings.fontSize}
              onChange={(e) => setNumber('fontSize', Number(e.target.value))} />
          </label>

          <label>Line height ({settings.lineHeight.toFixed(2)})
            <input type="range" min={1.4} max={3} step={0.02}
              value={settings.lineHeight}
              onChange={(e) => setNumber('lineHeight', Number(e.target.value))} />
          </label>

          <label>Letter spacing ({settings.letterSpacing.toFixed(3)}em)
            <input type="range" min={0} max={0.08} step={0.001}
              value={settings.letterSpacing}
              onChange={(e) => setNumber('letterSpacing', Number(e.target.value))} />
          </label>

          <label>Word spacing ({settings.wordSpacing.toFixed(2)}em)
            <input type="range" min={0} max={0.3} step={0.01}
              value={settings.wordSpacing}
              onChange={(e) => setNumber('wordSpacing', Number(e.target.value))} />
          </label>

          <label>Line width ({settings.maxWidth}px)
            <input type="range" min={560} max={980} step={10}
              value={settings.maxWidth}
              onChange={(e) => setNumber('maxWidth', Number(e.target.value))} />
          </label>

          <label>Bionic intensity ({settings.bionicIntensity.toFixed(2)})
            <input type="range" min={0.35} max={0.7} step={0.01}
              value={settings.bionicIntensity}
              onChange={(e) => setNumber('bionicIntensity', Number(e.target.value))} />
          </label>

          <label>Font family
            <select value={settings.fontFamily}
              onChange={(e) => setSettings((prev) => ({ ...prev, fontFamily: e.target.value }))}>
              <option value="Literata, Georgia, serif">Literata</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="DM Sans, sans-serif">DM Sans</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="'OpenDyslexic', 'Comic Sans MS', sans-serif">OpenDyslexic</option>
              <option value="'Comic Sans MS', 'Comic Sans', cursive, sans-serif">Comic Sans</option>
              <option value="'Atkinson Hyperlegible', Arial, sans-serif">Atkinson Hyperlegible</option>
              <option value="'Source Sans 3', Arial, sans-serif">Source Sans 3</option>
              <option value="'IBM Plex Sans', Arial, sans-serif">IBM Plex Sans</option>
              <option value="'Merriweather', Georgia, serif">Merriweather</option>
              <option value="'Lora', Georgia, serif">Lora</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </label>

          <div className={styles.colorRow}>
            <label>Text color
              <input type="color" value={settings.textColor}
                onChange={(e) => setSettings((prev) => ({ ...prev, textColor: e.target.value }))} />
            </label>
            <label>Background
              <input type="color" value={settings.backgroundColor}
                onChange={(e) => setSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))} />
            </label>
          </div>

          <div className={styles.colorRow}>
            <label>Focus line color
              <input type="color" value={settings.focusLineColor}
                onChange={(e) => setSettings((prev) => ({ ...prev, focusLineColor: e.target.value }))} />
            </label>
            <label>Focus line opacity ({settings.focusLineOpacity.toFixed(2)})
              <input type="range" min={0.08} max={0.55} step={0.01}
                value={settings.focusLineOpacity}
                onChange={(e) => setNumber('focusLineOpacity', Number(e.target.value))} />
            </label>
          </div>

          <label>Focus line width ({settings.focusLineWidth}px)
            <input type="range" min={28} max={120} step={2}
              value={settings.focusLineWidth}
              onChange={(e) => setNumber('focusLineWidth', Number(e.target.value))} />
          </label>

          {/* Focus Line Length removed — it now automatically spans full text column width */}
          <div style={{ fontSize: '11px', color: '#7aaddd', marginTop: '-4px', marginBottom: '8px', opacity: 0.85 }}>
            ℹ Focus line automatically spans your full text width
          </div>
          <div className={styles.actions}>
            <button className={styles.resetBtn} onClick={resetSettings}>Reset</button>
            <button className={styles.applyBtn} onClick={saveAndApply}>Save &amp; Apply</button>
          </div>
        </section>

        {/* ── Preview ──────────────────────────────────────────── */}
        <section className={styles.preview}>
          <h2>Live Preview</h2>
          <div className={styles.previewCanvas}>
            {/* Focus line indicator */}
            <div
              className={styles.previewFocusLine}
              style={{
                height: `${settings.focusLineWidth}px`,
                width: `${settings.maxWidth}px`,   /* auto full-width like extension */
                maxWidth: '100%',
                margin: '0 auto',
                background: `linear-gradient(to bottom, transparent, ${hexToRgba(settings.focusLineColor, settings.focusLineOpacity)} 25%, ${hexToRgba(settings.focusLineColor, settings.focusLineOpacity)} 75%, transparent)`,
              }}
            />
            {/* Bionic preview text */}
            <div
              className="bionic-text"
              style={{
                maxWidth: `${settings.maxWidth}px`,
                fontFamily: settings.fontFamily,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}em`,
                wordSpacing: `${settings.wordSpacing}em`,
                color: settings.textColor,
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
