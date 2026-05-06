'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { scoreToPreset, PRESETS, SAMPLE_TEXTS } from '@/lib/adaptEngine';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { READING_TEXT_KEY } from '@/lib/readingSession';
import styles from './page.module.css';

function NumberCounter({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <span>{count}</span>;
}

function ScoreArc({ score, max = 24 }: { score: number; max: number }) {
  const pct = score / max;
  // SVG arc parameters
  const r = 80;
  const cx = 110;
  const cy = 100;
  const startAngle = -180;
  const endAngle = 0;
  const arcLength = Math.PI * r;
  const filled = pct * arcLength;

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const start = toXY(startAngle);
  const end = toXY(endAngle);

  // Needle
  const needleAngle = -180 + pct * 180;
  const needleEnd = toXY(needleAngle);

  return (
    <div className={styles.arcContainer}>
      <svg width="220" height="120" viewBox="0 0 220 120">
        {/* Track */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="var(--bg-border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLength}`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleEnd.x} y2={needleEnd.y}
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: 'all 1.2s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <circle cx={cx} cy={cy} r="5" fill="var(--accent)" />
      </svg>
    </div>
  );
}

function ResultsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const score = parseInt(params.get('score') || '12', 10);
  const isNoAdhd = score === 0;
  const presetId = scoreToPreset(score);
  const preset = PRESETS[presetId];

  const presetFeatureMap: Record<typeof presetId, string[]> = {
    A: [
      'Bionic Reading (mild intensity)',
      'Extra line and letter spacing',
      'Paragraph breathing room',
      'Text-to-Speech',
      'ADHD summary',
    ],
    B: [
      'Bionic Reading (moderate intensity)',
      'Adaptive sentence reveal mode',
      'Improved sentence chunking',
      'Text-to-Speech',
      'ADHD summary',
    ],
    C: [
      'Bionic Reading (high-focus intensity)',
      'Aggressive sentence chunking + reveal',
      'Text-to-Speech',
      'ADHD summary',
      'Custom Builder (save and apply settings)',
    ],
  };

  const noAdhdFeatures = [
    'Bionic reading to improve reading speed for any reader',
    'Clear spacing presets to reduce visual fatigue',
    'Text-to-Speech for multitasking and retention',
    'ADHD-style summary to extract key points quickly',
    'Optional custom builder for your preferred reading style',
  ];

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function saveScore() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          quizScore: score,
          preset: {
            id: presetId,
            profileName: preset.profileName,
          },
        }),
      });
    }

    saveScore();
  }, [preset.profileName, presetId, score]);

  function handleReadNow() {
    localStorage.setItem(READING_TEXT_KEY, SAMPLE_TEXTS.article);
    router.push(`/paste?preset=${presetId}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Readapt" width={32} height={32} className={styles.logoIcon} priority />
          <span>Readapt</span>
        </Link>
      </div>

      <main className={styles.main}>
        {/* Score display */}
        <div className={styles.scoreBlock}>
          <div className={styles.scoreNum}>
            <NumberCounter target={score} />
          </div>
          <div className={styles.scoreOf}>out of 24</div>
          <ScoreArc score={score} max={24} />
        </div>

        {/* Profile Card */}
        <div className={styles.profileCard}>
          <h1 className={styles.profileName}>{isNoAdhd ? 'No ADHD Indicators' : preset.profileName}</h1>
          <p className={styles.profileDesc}>
            {isNoAdhd
              ? 'Your score does not indicate ADHD-related attention burden in this screener. You can still use Readapt to read faster, reduce fatigue, and stay engaged with long text.'
              : preset.description}
          </p>

          <div className={styles.featureList}>
            {(isNoAdhd ? noAdhdFeatures : presetFeatureMap[presetId]).map((f, i) => (
              <div key={i} className={styles.featureItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={styles.ctaBlock}>
          <p className={styles.ctaLabel}>
            {isNoAdhd ? 'Try adaptations anyway and optimize reading speed for everyday text.' : 'See your preset in action on real text.'}
          </p>
          <button
            type="button"
            id="read-now-btn"
            className="btn btn-primary"
            style={{ height: '52px', padding: '0 36px', fontSize: '17px' }}
            onClick={handleReadNow}
          >
            Read Something Now →
          </button>
          <Link href="/quiz" className={`btn btn-ghost ${styles.retakeBtn}`}>
            Take the Quiz Again
          </Link>
        </div>

        {/* Science note */}
        <p className={styles.scienceNote}>
          Based on ASRS Part A — the same 6-question screener used by clinicians worldwide.<br />
          This is a reading profile, not a medical diagnosis.
        </p>
      </main>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsContent />
    </Suspense>
  );
}
