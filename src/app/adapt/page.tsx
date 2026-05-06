'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  adaptText,
  PRESETS,
  PresetId,
  applyBionicToText,
  type PresetConfig,
} from '@/lib/adaptEngine';
import { CUSTOM_SETTINGS_KEY, READING_TEXT_KEY } from '@/lib/readingSession';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import AdaptTour from '@/components/AdaptTour';
import styles from './page.module.css';

type CustomBuilderSettings = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  maxWidth: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  bionicIntensity: number;
  focusLineColor: string;
  focusLineOpacity: number;
  focusLineWidth: number;
};

const BG_OPTIONS = [
  { id: 'default', color: '#1A1814', label: 'Warm Dark' },
  { id: 'cream', color: '#F5F0E8', label: 'Cream' },
  { id: 'sage', color: '#EEF2EC', label: 'Sage' },
  { id: 'dusk', color: '#1D1E2C', label: 'Dusk' },
];
const DEFAULT_BG_COLOR = BG_OPTIONS[0].color;

// Session-level 5-minute gate for unauthenticated users (page-scoped, all presets)
const SESSION_GATE_MS = 5 * 60 * 1000;
const SESSION_START_KEY = 'readapt:sessionStart'; // sessionStorage
const EXTENSION_SYNC_GUEST_KEY = 'readapt:extensionSyncGuest';
const EXTENSION_SYNC_ACK_TIMEOUT_MS = 1600;
const ADAPT_CONTROL_PREFS_KEY = 'readapt:adaptControlPrefs';
const ADAPT_ACTIVE_PRESET_KEY = 'readapt:activePreset';

function normalizePresetId(raw: string | null | undefined): PresetId {
  return raw === 'A' || raw === 'B' || raw === 'C' ? raw : 'B';
}

type PresetControlPrefs = {
  focusMode: boolean;
  focusLineEnabled: boolean;
  chunkingEnabled: boolean;
  bionicEnabled: boolean;
};

function getDefaultPresetControlPrefs(preset: PresetId): PresetControlPrefs {
  if (preset === 'A') {
    return {
      focusMode: false,
      focusLineEnabled: false,
      chunkingEnabled: PRESETS.A.sentenceChunking,
      bionicEnabled: true,
    };
  }

  return {
    focusMode: true,
    focusLineEnabled: preset === 'C' ? true : PRESETS[preset].focusLine,
    chunkingEnabled: PRESETS[preset].sentenceChunking,
    bionicEnabled: true,
  };
}



function getTextColor(bg: string) {
  const light = ['#F5F0E8', '#EEF2EC'];
  return light.includes(bg) ? '#1A1814' : '#F0EDEA';
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => `${c}${c}`).join('')
    : normalized;

  if (full.length !== 6) {
    return `rgba(200, 169, 110, ${opacity})`;
  }

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

async function pushSyncPayloadToExtension(payload: Record<string, unknown>) {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise<boolean>((resolve) => {
    let settled = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      resolve(ok);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || !event.data || typeof event.data !== 'object') return;

      const data = event.data as { type?: string; requestId?: string; ok?: boolean };
      if (data.type === 'READAPT_EXTENSION_SYNC_ACK' && data.requestId === requestId) {
        finish(Boolean(data.ok));
      }
    };

    window.addEventListener('message', onMessage);

    window.postMessage(
      {
        type: 'READAPT_EXTENSION_SYNC_PUSH',
        requestId,
        payload,
      },
      window.location.origin
    );

    window.setTimeout(() => finish(false), EXTENSION_SYNC_ACK_TIMEOUT_MS);
  });
}

function buildLocalSummary(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const scored = sentences.map((sentence) => {
    const words = sentence.toLowerCase().match(/[a-z']+/g) || [];
    const longWordBonus = words.filter((w) => w.length > 7).length * 0.2;
    const punctuationBonus = (sentence.match(/[,;:]/g) || []).length * 0.25;
    const lengthScore = Math.min(words.length / 12, 1.6);
    return { sentence, score: lengthScore + longWordBonus + punctuationBonus };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.sentence.replace(/^[-*•]\s*/, '').trim());
}

function getGoogleUkEnglishFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.name === 'Google UK English Female') || null;
}

function waitForGoogleUkEnglishFemaleVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  const immediate = getGoogleUkEnglishFemaleVoice();
  if (immediate) return Promise.resolve(immediate);

  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const startedAt = Date.now();

    const onVoicesChanged = () => {
      const voice = getGoogleUkEnglishFemaleVoice();
      if (voice) {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(voice);
      } else if (Date.now() - startedAt >= timeoutMs) {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(null);
      }
    };

    synth.addEventListener('voiceschanged', onVoicesChanged);

    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(getGoogleUkEnglishFemaleVoice());
    }, timeoutMs);
  });
}

function AdaptPage() {
  const router = useRouter();
  const initialPreset = normalizePresetId(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('preset') : null
  );

  const initialPresetState = (() => {
    if (typeof window === 'undefined') return initialPreset;
    try {
      const stored = sessionStorage.getItem(ADAPT_ACTIVE_PRESET_KEY);
      return normalizePresetId(stored);
    } catch {
      return initialPreset;
    }
  })();

  const [rawText, setRawText] = useState('');
  const [preset, setPreset] = useState<PresetId>(initialPresetState);
  const [bg, setBg] = useState(DEFAULT_BG_COLOR);
  const [fontSize, setFontSize] = useState(0);
  const [focusMode, setFocusMode] = useState(initialPresetState !== 'A');
  const [focusLineEnabled, setFocusLineEnabled] = useState(PRESETS[initialPresetState].focusLine);
  const [chunkingEnabled, setChunkingEnabled] = useState(PRESETS[initialPresetState].sentenceChunking);
  const [bionicEnabled, setBionicEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({
    reading: true,
    focus: true,
    appearance: true,
  });
  const [ttsActive, setTtsActive] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryBullets, setSummaryBullets] = useState<string[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [customSettings, setCustomSettings] = useState<CustomBuilderSettings | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  // Session-level sign-up gate for unauthenticated users
  const [showSignUpGate, setShowSignUpGate] = useState(false);
  const [extensionSyncState, setExtensionSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [extensionSyncMeta, setExtensionSyncMeta] = useState('Ready to sync');

  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chunkRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const syncResetTimerRef = useRef<number | null>(null);
  const controlPrefsRef = useRef<Partial<Record<PresetId, PresetControlPrefs>>>({});
  const controlPrefsReadyRef = useRef(false);
  const controlPrefsHydratedRef = useRef(false);
  const suppressPrefsPersistRef = useRef(true);

  const presetConfig: PresetConfig = PRESETS[preset];
  const activeConfig: PresetConfig = preset === 'C' && customSettings
    ? {
        ...presetConfig,
        fontSize: customSettings.fontSize,
        lineHeight: customSettings.lineHeight,
        letterSpacing: `${customSettings.letterSpacing}em`,
        wordSpacing: `${customSettings.wordSpacing}em`,
        maxWidth: `${customSettings.maxWidth}px`,
        bionicIntensity: customSettings.bionicIntensity,
      }
    : presetConfig;

  const actualFontSize = fontSize || activeConfig.fontSize;
  const summaryText = summaryBullets.join(' ');
  const displayText = showSummary && summaryText ? summaryText : rawText;

  const adapted = adaptText(displayText, activeConfig, { bionic: bionicEnabled, chunking: chunkingEnabled });
  const allChunks = adapted.flatMap((p) => p.chunks);
  const chunkParagraphs = adapted.map((p) => p.chunks);

  useEffect(() => {
    try {
      sessionStorage.setItem(ADAPT_ACTIVE_PRESET_KEY, preset);
    } catch {
      // Ignore storage access failures.
    }

    const url = new URL(window.location.href);
    if (url.searchParams.get('preset') !== preset) {
      url.searchParams.set('preset', preset);
      const next = `${url.pathname}?${url.searchParams.toString()}`;
      window.history.replaceState({}, '', next);
    }
  }, [preset]);

  let chunkCounter = 0;
  const chunkIndexMap = chunkParagraphs.map((par) => par.map(() => chunkCounter++));

  // ── Check auth status & start session gate timer ─────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function checkAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (user) {
          setUserId(user.id);
          setIsAuthed(true);
          setAuthChecked(true);
          return;
        }
        // Unauthenticated — start or resume session timer
        setUserId(null);
        setIsAuthed(false);
        setAuthChecked(true);

        try {
          const stored = sessionStorage.getItem(SESSION_START_KEY);
          if (!stored) {
            sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
          } else {
            // If we reload and already past 5 min, show gate immediately
            const elapsed = Date.now() - Number(stored);
            if (elapsed >= SESSION_GATE_MS) {
              setShowSignUpGate(true);
            }
          }
        } catch {
          // sessionStorage may be blocked in private browsing — silently skip gate
        }
      } catch {
        setUserId(null);
        setIsAuthed(false);
        setAuthChecked(true);
      }
    }

    checkAuth();

    // Also listen for auth state changes (e.g. user signs in from another tab)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        setIsAuthed(true);
        setShowSignUpGate(false);
      } else {
        setUserId(null);
        setIsAuthed(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // ── Session gate countdown (runs only for unauthenticated users) ──
  useEffect(() => {
    if (!authChecked || isAuthed) return;

    let interval: number | null = null;

    try {
      const stored = sessionStorage.getItem(SESSION_START_KEY);
      if (!stored) return;

      const startTime = Number(stored);

      const check = () => {
        if (isAuthed) {
          if (interval !== null) window.clearInterval(interval);
          return;
        }
        const elapsed = Date.now() - startTime;
        if (elapsed >= SESSION_GATE_MS) {
          setShowSignUpGate(true);
          if (interval !== null) window.clearInterval(interval);
        }
      };

      check(); // immediate check
      interval = window.setInterval(check, 1000);
    } catch {
      // sessionStorage unavailable — skip timer
    }

    return () => {
      if (interval !== null) window.clearInterval(interval);
    };
  }, [authChecked, isAuthed]);

  // ── Load extension sync status ───────────────────────────────────
  useEffect(() => {
    if (!userId) {
      try {
        const raw = localStorage.getItem(EXTENSION_SYNC_GUEST_KEY);
        if (!raw) {
          setExtensionSyncState('idle');
          setExtensionSyncMeta('Ready to sync');
          return;
        }

        const parsed = JSON.parse(raw) as { presetId?: PresetId; syncedAt?: string };
        if (parsed.presetId && parsed.syncedAt) {
          const timeText = new Date(parsed.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setExtensionSyncState('idle');
          setExtensionSyncMeta(`Last synced ${parsed.presetId} at ${timeText}`);
          return;
        }

        setExtensionSyncState('idle');
        setExtensionSyncMeta('Ready to sync');
      } catch {
        setExtensionSyncState('error');
        setExtensionSyncMeta('Could not load local sync status');
      }
      return;
    }

    const currentUserId = userId;

    let cancelled = false;

    async function loadExtensionSync() {
      try {
        const res = await fetch(`/api/extension/sync?userId=${encodeURIComponent(currentUserId)}`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed sync status request');
        }

        const payload = (await res.json()) as {
          synced?: boolean;
          extensionSync?: {
            presetId?: PresetId;
            syncedAt?: string;
          } | null;
        };

        if (cancelled) return;

        if (payload.synced && payload.extensionSync?.presetId) {
          const timeText = payload.extensionSync.syncedAt
            ? new Date(payload.extensionSync.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;
          setExtensionSyncState('idle');
          setExtensionSyncMeta(`Last synced ${payload.extensionSync.presetId}${timeText ? ` at ${timeText}` : ''}`);
          return;
        }

        setExtensionSyncState('idle');
        setExtensionSyncMeta('Ready to sync');
      } catch {
        if (cancelled) return;
        setExtensionSyncState('error');
        setExtensionSyncMeta('Could not load sync status');
      }
    }

    loadExtensionSync();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Load reading text & custom settings ─────────────────────────
  useEffect(() => {
    const text = localStorage.getItem(READING_TEXT_KEY) || '';
    setRawText(text);

    try {
      const raw = localStorage.getItem(CUSTOM_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CustomBuilderSettings;
        setCustomSettings(parsed);
      }
    } catch {
      setCustomSettings(null);
    }
  }, []);

  // ── Load persisted control prefs once (per preset) ──────────────
  useEffect(() => {
    suppressPrefsPersistRef.current = true;
    controlPrefsHydratedRef.current = false;

    try {
      const raw = localStorage.getItem(ADAPT_CONTROL_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<PresetId, PresetControlPrefs>>;
        if (parsed && typeof parsed === 'object') {
          controlPrefsRef.current = parsed;
        }
      }
    } catch {
      controlPrefsRef.current = {};
    } finally {
      controlPrefsReadyRef.current = true;
      const presetPrefs = controlPrefsRef.current[preset] ?? getDefaultPresetControlPrefs(preset);
      setFocusMode(preset === 'A' ? false : presetPrefs.focusMode);
      setFocusLineEnabled(preset === 'A' ? false : presetPrefs.focusLineEnabled);
      setChunkingEnabled(presetPrefs.chunkingEnabled);
      setBionicEnabled(presetPrefs.bionicEnabled);

      window.requestAnimationFrame(() => {
        controlPrefsHydratedRef.current = true;
        suppressPrefsPersistRef.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Apply stored prefs when preset changes ────────────────────
  useEffect(() => {
    if (!controlPrefsReadyRef.current) return;

    suppressPrefsPersistRef.current = true;

    const presetPrefs = controlPrefsRef.current[preset] ?? getDefaultPresetControlPrefs(preset);
    setFocusMode(preset === 'A' ? false : presetPrefs.focusMode);
    setFocusLineEnabled(preset === 'A' ? false : presetPrefs.focusLineEnabled);
    setChunkingEnabled(presetPrefs.chunkingEnabled);
    setBionicEnabled(presetPrefs.bionicEnabled);

    window.requestAnimationFrame(() => {
      suppressPrefsPersistRef.current = false;
    });
  }, [preset]);

  // ── Persist current control prefs per preset ────────────────────
  useEffect(() => {
    if (!controlPrefsReadyRef.current || !controlPrefsHydratedRef.current) return;
    if (suppressPrefsPersistRef.current) return;

    const nextPrefs: PresetControlPrefs = {
      focusMode: preset === 'A' ? false : focusMode,
      focusLineEnabled: preset === 'A' ? false : focusLineEnabled,
      chunkingEnabled,
      bionicEnabled,
    };

    const merged = {
      ...controlPrefsRef.current,
      [preset]: nextPrefs,
    };

    controlPrefsRef.current = merged;
    try {
      localStorage.setItem(ADAPT_CONTROL_PREFS_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage quota failures.
    }
  }, [preset, focusMode, focusLineEnabled, chunkingEnabled, bionicEnabled]);

  useEffect(() => {
    if (preset === 'C' && customSettings?.backgroundColor) {
      setBg(customSettings.backgroundColor);
    } else {
      setBg(DEFAULT_BG_COLOR);
    }
  }, [preset, customSettings]);

  // ── Focus/reveal scroll sync ─────────────────────────────────────
  useEffect(() => {
    if (!focusMode || preset === 'A') return;

    const syncRevealToScroll = () => {
      const canvas = canvasRef.current;
      const el = contentRef.current;
      if (!canvas || !el || allChunks.length === 0) return;

      const canvasRect = canvas.getBoundingClientRect();
      const activationLine = canvasRect.top + canvas.clientHeight * 0.35;
      const beforeContentTop = canvas.scrollTop <= 4;
      if (beforeContentTop) {
        setRevealIndex(0);
        return;
      }

      let nextIndex = 0;
      chunkRefs.current.forEach((node, idx) => {
        if (!node) return;
        const nodeTop = node.getBoundingClientRect().top;
        if (nodeTop <= activationLine) {
          nextIndex = idx;
        }
      });

      setRevealIndex(Math.min(allChunks.length - 1, Math.max(0, nextIndex)));
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    syncRevealToScroll();
    canvas.addEventListener('scroll', syncRevealToScroll, { passive: true });
    window.addEventListener('resize', syncRevealToScroll);
    return () => {
      canvas.removeEventListener('scroll', syncRevealToScroll);
      window.removeEventListener('resize', syncRevealToScroll);
    };
  }, [focusMode, preset, allChunks.length]);

  useEffect(() => {
    chunkRefs.current = chunkRefs.current.slice(0, allChunks.length);
  }, [allChunks.length]);

  useEffect(() => {
    setRevealIndex(0);
  }, [preset, focusMode]);

  // ── TTS ─────────────────────────────────────────────────────────
  async function handleTTS() {
    if (!window.speechSynthesis) return;

    if (ttsActive) {
      window.speechSynthesis.cancel();
      setTtsActive(false);
      return;
    }

    const targetVoice = await waitForGoogleUkEnglishFemaleVoice();
    if (!targetVoice) {
      setTtsActive(false);
      window.alert('Google UK English Female voice is not available in this browser.');
      return;
    }

    const utt = new SpeechSynthesisUtterance(displayText);
    utt.voice = targetVoice;
    utt.lang = targetVoice.lang;
    utt.onend = () => setTtsActive(false);
    utt.onerror = () => setTtsActive(false);
    window.speechSynthesis.speak(utt);
    setTtsActive(true);
  }

  // ── Summary ──────────────────────────────────────────────────────
  async function fetchSummary() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const bullets = buildLocalSummary(rawText);
      if (bullets.length === 0) {
        throw new Error('Not enough content to summarize.');
      }
      setSummaryBullets(bullets);
      setShowSummary(true);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Failed to generate summary.');
      setSummaryBullets([]);
      setShowSummary(false);
    } finally {
      setSummaryLoading(false);
    }
  }

  // ── Handle preset selection ──────────────────────────────────────
  function handlePresetClick(p: PresetId) {
    if (p === 'A') {
      setPreset('A');
      setFocusMode(false);
      return;
    }

    setPreset(p);
    setFocusMode(true);
    setFocusLineEnabled(p === 'C' ? true : PRESETS[p].focusLine);
  }

  async function handleSyncWithExtension() {
    setExtensionSyncState('syncing');
    setExtensionSyncMeta('Syncing current preset...');

    try {
      const settingsPayload: Record<string, unknown> = {
        presetId: preset,
        profileName: PRESETS[preset].profileName,
        bionicEnabled,
        chunkingEnabled,
        focusMode,
        focusLineEnabled,
        extensionFocusLineAvailable: false,
        sentenceReveal: preset !== 'A' && focusMode,
        fontSize: actualFontSize,
        fontFamily: preset === 'C' && customSettings?.fontFamily
          ? customSettings.fontFamily
          : 'Literata, Georgia, serif',
        backgroundColor: bg,
        textColor: pageTextColor,
        focusLineColor,
        focusLineOpacity,
        focusLineWidth: focusLineHeight,
        // focusLineLength removed — focus line auto-spans full text column width
        lineHeight: activeConfig.lineHeight,
        letterSpacing: activeConfig.letterSpacing,
        wordSpacing: activeConfig.wordSpacing,
        maxWidth: activeConfig.maxWidth,
        bionicIntensity: activeConfig.bionicIntensity,
        maxChunkWords: activeConfig.maxChunkWords,
      };

      if (preset === 'C' && customSettings) {
        settingsPayload.customBuilder = customSettings;
      }

      const bridgePayload = {
        presetId: preset,
        source: 'web',
        syncedAt: new Date().toISOString(),
        settings: settingsPayload,
      };

      const extensionBridgeOk = await pushSyncPayloadToExtension(bridgePayload);

      if (!userId) {
        localStorage.setItem(
          EXTENSION_SYNC_GUEST_KEY,
          JSON.stringify(bridgePayload)
        );

        if (extensionBridgeOk) {
          setExtensionSyncState('synced');
          setExtensionSyncMeta(`Synced ${preset} \u2713 (guest mode)`);
          if (syncResetTimerRef.current !== null) {
            window.clearTimeout(syncResetTimerRef.current);
          }
          syncResetTimerRef.current = window.setTimeout(() => {
            setExtensionSyncState('idle');
            setExtensionSyncMeta('Ready to sync');
          }, 1500);
        } else {
          setExtensionSyncState('error');
          setExtensionSyncMeta('Extension not reachable on this tab. Open popup on this page and retry.');
        }
        return;
      }

      const res = await fetch('/api/extension/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          presetId: preset,
          source: 'web',
          settings: settingsPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Sync failed');
      }

      if (extensionBridgeOk) {
        setExtensionSyncState('synced');
        setExtensionSyncMeta(`Synced ${preset} \u2713`);
        if (syncResetTimerRef.current !== null) {
          window.clearTimeout(syncResetTimerRef.current);
        }
        syncResetTimerRef.current = window.setTimeout(() => {
          setExtensionSyncState('idle');
          setExtensionSyncMeta('Ready to sync');
        }, 1500);
      } else {
        setExtensionSyncState('error');
        setExtensionSyncMeta('Cloud sync saved, but extension on this tab did not confirm.');
      }
    } catch {
      setExtensionSyncState('error');
      setExtensionSyncMeta('Sync failed. Try again.');
    }
  }

  if (!rawText.trim()) {
    return (
      <div className={styles.inputPage}>
        <div className={styles.inputInner}>
          <Link href="/dashboard" className={styles.logo}>
            <Image src="/logo.png" alt="Readapt" width={34} height={34} className={styles.logoIcon} priority />
            <span>Readapt</span>
          </Link>
          <h1 className={styles.inputHeading}>No pasted text yet.</h1>
          <p className={styles.inputSub}>Paste text first, then come back to read with your preset.</p>
          <Link href="/paste" className="btn btn-primary" style={{ width: 'fit-content' }}>Go to Paste Page →</Link>
        </div>
      </div>
    );
  }

  const textColor = getTextColor(bg);
  const pageBackground = bg;
  const pageTextColor = preset === 'C' && customSettings?.textColor ? customSettings.textColor : textColor;
  const focusLineColor = preset === 'C' && customSettings?.focusLineColor
    ? customSettings.focusLineColor
    : '#C8A96E';
  const focusLineOpacity = preset === 'C' && typeof customSettings?.focusLineOpacity === 'number'
    ? customSettings.focusLineOpacity
    : PRESETS[preset].focusLineOpacity;
  const focusLineHeight = preset === 'C' && typeof customSettings?.focusLineWidth === 'number'
    ? customSettings.focusLineWidth
    : 58;
  // focusLineLength removed — focus line now always spans full text column width
  const focusLineFill = hexToRgba(focusLineColor, focusLineOpacity);

  const presetInfo = {
    A: { name: 'Mild', accent: '#5AB98C' },
    B: { name: 'Moderate', accent: '#C8A96E' },
    C: { name: 'Intense', accent: '#9B8EC4' },
  } as const;

  const renderSectionHeader = (id: 'reading' | 'focus' | 'appearance', label: string) => (
    <button className={styles.sectionHeaderBtn} onClick={() => setSectionOpen((s) => ({ ...s, [id]: !s[id] }))}>
      <span>{label}</span>
      <span>{sectionOpen[id] ? '▾' : '▸'}</span>
    </button>
  );

  return (
    <div className={`${styles.adaptLayout} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      <section ref={canvasRef} id="tour-reading-canvas" className={styles.readingCanvas} style={{ background: pageBackground, color: pageTextColor }}>

        {focusMode && focusLineEnabled && preset !== 'A' && (
          <div
            className={styles.canvasFocusLine}
            style={{
              height: `${focusLineHeight}px`,
              /* Width = text column width (matches activeConfig.maxWidth) — always full text span */
              width: activeConfig.maxWidth,
              maxWidth: 'calc(100% - 32px)',
              margin: '0 auto',
              background: `linear-gradient(to bottom, transparent, ${focusLineFill} 25%, ${focusLineFill} 75%, transparent)`,
            }}
          />
        )}

        <div
          ref={contentRef}
          className={styles.textContainer}
          style={{
            maxWidth: activeConfig.maxWidth,
            fontFamily: preset === 'C' && customSettings ? customSettings.fontFamily : 'Literata, Georgia, serif',
            fontSize: `${actualFontSize}px`,
            lineHeight: activeConfig.lineHeight,
            letterSpacing: activeConfig.letterSpacing,
            wordSpacing: activeConfig.wordSpacing,
            color: pageTextColor,
          }}
        >
          {showSummary && !summaryLoading && !summaryError && (
            <p className={styles.summaryInlineMeta}>Summary mode enabled. You are reading the adapted summary.</p>
          )}
          {summaryError && <p className={styles.summaryInlineError}>{summaryError}</p>}

          {(preset === 'B' || preset === 'C') ? (
            <div className={styles.chunkFlow}>
              {chunkParagraphs.map((paragraphChunks, paragraphIndex) => (
                <div key={paragraphIndex} className={styles.chunkParagraph} style={{ marginBottom: activeConfig.paragraphSpacing }}>
                  {paragraphChunks.map((chunk, chunkInParagraphIndex) => {
                    const globalChunkIndex = chunkIndexMap[paragraphIndex][chunkInParagraphIndex];
                    const isActive = globalChunkIndex === revealIndex;
                    return (
                      <span
                        key={globalChunkIndex}
                        ref={(node) => { chunkRefs.current[globalChunkIndex] = node; }}
                        className={styles.chunkSentence}
                        style={{
                          opacity: focusMode ? (isActive ? 1 : globalChunkIndex < revealIndex ? 0.25 : 0.15) : 1,
                          transition: 'opacity 300ms',
                        }}
                        dangerouslySetInnerHTML={{
                          __html: (
                            bionicEnabled
                              ? applyBionicToText(chunk, activeConfig.bionicIntensity)
                              : escapeHtml(chunk)
                          ).replace(/\n/g, '<br/>') + ' ',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
              {focusMode && (
                <div className={styles.revealHint}>
                  Scroll to advance · {revealIndex + 1} / {allChunks.length}
                </div>
              )}
            </div>
          ) : (
            adapted.map((para, i) => (
              <p
                key={i}
                className="bionic-text"
                style={{ marginBottom: activeConfig.paragraphSpacing, color: pageTextColor }}
                dangerouslySetInnerHTML={{ __html: para.html.replace(/\n/g, '<br/>') }}
              />
            ))
          )}

          <div className={styles.endStateCard}>
            <p>You&apos;ve finished reading.</p>
            <div className={styles.endStateBtns}>
              <button
                id="tour-back-btn"
                className="btn btn-ghost"
                style={{
                  color: pageTextColor,
                  borderColor: pageTextColor === '#1A1814' ? 'rgba(26,24,20,0.45)' : 'rgba(240,237,234,0.45)',
                }}
                onClick={() => router.push('/paste?preset=A')}
              >
                Back to Paste Text
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className={styles.sidebarPanel}>
        {!sidebarCollapsed && (
          <div className={styles.sidebarHeaderBlock}>
            <div className={styles.sidebarHeaderTop}>
              <button className={styles.sidebarBackBtn} onClick={() => router.push(`/paste?preset=${preset}`)}>← Back</button>
              <button
                className={styles.sidebarCollapseIconBtn}
                onClick={() => setSidebarCollapsed(true)}
                aria-label="Collapse controls"
                title="Collapse controls"
              >
                ›
              </button>
            </div>
            <Link href="/dashboard" className={styles.sidebarBrandLink}>
              <Image src="/logo.png" alt="Readapt" width={44} height={44} className={styles.sidebarBrandIcon} priority />
              <span className={styles.sidebarBrandName}>Readapt</span>
            </Link>
            <div className={styles.sidebarPresetTitle}>Preset {preset}</div>
            <div className={styles.sidebarPresetSub}>{PRESETS[preset].profileName}</div>
          </div>
        )}

        {!sidebarCollapsed ? (
          <>
            <div id="tour-preset-selector" className={styles.presetSelectorGrid}>
              {(['A', 'B', 'C'] as PresetId[]).map((p) => (
                <button
                  key={p}
                  className={`${styles.presetCardBtn} ${preset === p ? styles.presetCardActive : ''}`}
                  style={{ borderColor: preset === p ? presetInfo[p].accent : 'var(--bg-border)' }}
                  onClick={() => handlePresetClick(p)}
                >
                  <div className={styles.presetCardTop}>
                    <span>{p}</span>
                  </div>
                  <div className={styles.presetCardLabel}>{presetInfo[p].name}</div>
                </button>
              ))}
            </div>
            <>
                <div className={styles.extensionSyncPanel}>
                  <div className={styles.extensionSyncLabel}>Extension Sync</div>
                  <button
                    id="tour-sync-btn"
                    className={`${styles.extensionSyncBtn} ${extensionSyncState === 'synced' ? styles.extensionSyncBtnSynced : ''}`}
                    onClick={handleSyncWithExtension}
                    disabled={extensionSyncState === 'syncing'}
                  >
                    {extensionSyncState === 'syncing' ? 'Syncing...' : extensionSyncState === 'synced' ? '\u2713 Synced' : 'Sync with Extension'}
                  </button>
                  {preset === 'C' && (
                    <button
                      id="tour-custom-builder-btn"
                      className={styles.extensionSyncBtn}
                      style={{ marginTop: '8px', background: 'rgba(155, 142, 196, 0.18)', borderColor: 'rgba(155, 142, 196, 0.5)', color: 'var(--text-primary)' }}
                      onClick={() => router.push('/custom-builder')}
                    >
                      Open Custom Builder
                    </button>
                  )}
                  <div className={styles.extensionSyncMeta}>{extensionSyncMeta}</div>
                </div>

                <div id="tour-reading-style-section" className={styles.sidebarSection}>
                  {renderSectionHeader('reading', 'Reading Style')}
                  {sectionOpen.reading && (
                    <div className={styles.sectionBody}>
                      <div id="tour-bionic-toggle" className={styles.controlRow}><span>Bionic Reading</span><button className={`${styles.smallToggle} ${bionicEnabled ? styles.smallToggleOn : ''}`} onClick={() => setBionicEnabled((v) => !v)}>{bionicEnabled ? 'On' : 'Off'}</button></div>
                      <div className={styles.readOnlyLine}>Intensity: {activeConfig.bionicIntensity.toFixed(2)}</div>
                      {preset !== 'A' && (
                        <>
                          <div id="tour-chunking-toggle" className={styles.controlRow}><span>Sentence Chunking</span><button className={`${styles.smallToggle} ${chunkingEnabled ? styles.smallToggleOn : ''}`} onClick={() => setChunkingEnabled((v) => !v)}>{chunkingEnabled ? 'On' : 'Off'}</button></div>
                          <div className={styles.readOnlyLine}>Chunk size up to {activeConfig.maxChunkWords} words</div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {preset !== 'A' && (
                  <div id="tour-focus-section" className={styles.sidebarSection}>
                    {renderSectionHeader('focus', 'Focus Tools')}
                    {sectionOpen.focus && (
                      <div className={styles.sectionBody}>
                        <div id="tour-focus-toggle" className={styles.controlRow}><span>Focus Mode</span><button className={`${styles.smallToggle} ${focusMode ? styles.smallToggleOn : ''}`} onClick={() => setFocusMode((v) => !v)}>{focusMode ? 'On' : 'Off'}</button></div>
                        <div className={styles.controlRow}><span>Focus Line</span><button className={`${styles.smallToggle} ${focusLineEnabled ? styles.smallToggleOn : ''}`} onClick={() => setFocusLineEnabled((v) => !v)}>{focusLineEnabled ? 'On' : 'Off'}</button></div>
                      </div>
                    )}
                  </div>
                )}

                <div id="tour-appearance-section" className={styles.sidebarSection}>
                  {renderSectionHeader('appearance', 'Appearance')}
                  {sectionOpen.appearance && (
                    <div className={styles.sectionBody}>
                      <div className={styles.bgSwatchRow}>
                        {BG_OPTIONS.map((b) => (
                          <button
                            key={b.id}
                            className={`${styles.bgSwatch} ${bg === b.color ? styles.bgSwatchActive : ''}`}
                            style={{ background: b.color }}
                            onClick={() => setBg(b.color)}
                            title={b.label}
                          />
                        ))}
                      </div>
                      <div className={styles.controlRow}><span>Font Size</span><div className={styles.fontStepper}><button onClick={() => setFontSize((f) => Math.max(14, (f || actualFontSize) - 2))}>−</button><span>{actualFontSize}</span><button onClick={() => setFontSize((f) => Math.min(38, (f || actualFontSize) + 2))}>+</button></div></div>
                    </div>
                  )}
                </div>


                <div className={styles.sidebarFooter}>
                  <button id="tour-tts-btn" className={`btn btn-ghost ${styles.fullWidthBtn}`} onClick={handleTTS}>{ttsActive ? 'Stop TTS' : 'Start TTS'}</button>
                  {preset !== 'A' && (
                    <button
                      id="tour-summary-btn"
                      className={`btn btn-primary ${styles.fullWidthBtn}`}
                      onClick={() => {
                        if (summaryLoading) return;
                        if (showSummary) { setShowSummary(false); return; }
                        if (summaryBullets.length > 0) { setShowSummary(true); return; }
                        fetchSummary();
                      }}
                    >
                      {summaryLoading ? 'Generating...' : `Summary ${showSummary ? 'On' : 'Off'}`}
                    </button>
                  )}
                </div>
              </>
            </>
          ) : (
            <div className={styles.sidebarCollapsedRail}>
              <button onClick={() => setSidebarCollapsed(false)} aria-label="Open controls" title="Open controls">‹</button>
            </div>
          )}
        </aside>

        {/* Guided tour — fires on first visit, preset-specific re-fires */}
        {!showSignUpGate && <AdaptTour preset={preset} />}

        {/* Sign-up gate overlay — shown after 5 min for unauthenticated users */}
        {showSignUpGate && (
          <div className={styles.signUpGate}>
            <div className={styles.signUpGateCard}>
              <Image src="/logo.png" alt="Readapt" width={56} height={56} className={styles.signUpGateLogo} />
              <h2 className={styles.signUpGateTitle}>Your free reading session has ended</h2>
              <p className={styles.signUpGateSub}>
                Create a free account to keep reading with all presets &mdash; no payment required.
              </p>
              <div className={styles.signUpGateBtns}>
                <Link href="/auth/login?mode=signup" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Create Free Account</Link>
                <Link href="/auth/login" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>Log In</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}

export default function AdaptPageWrapper() {
  return (
    <Suspense>
      <AdaptPage />
    </Suspense>
  );
}
