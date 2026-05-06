'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CursorOrb from '@/components/CursorOrb';
import { applyBionicToText, SAMPLE_TEXTS } from '@/lib/adaptEngine';
import { CHROME_WEBSTORE_URL } from '@/lib/publicLinks';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import styles from './page.module.css';

// ──────────────────────────────────────────────────────────────────
// BionicToggleDemo — the live demo section control
// ──────────────────────────────────────────────────────────────────
function BionicToggleDemo() {
  const [mode, setMode] = useState<'normal' | 'adapted'>('normal');
  const [sample, setSample] = useState<'article' | 'academic' | 'news'>('article');
  const bionicOn = true;

  const text = SAMPLE_TEXTS[sample];
  const adaptedHtml = applyBionicToText(text, 0.40);

  const bgStyle = {
    background: mode === 'adapted' ? '#1A1814' : 'var(--bg-elevated)',
    color: mode === 'adapted' ? '#F0EDEA' : 'var(--text-primary)',
    fontFamily: mode === 'adapted' ? 'Literata, Georgia, serif' : 'inherit',
    lineHeight: mode === 'adapted' ? 1.8 : 1.6,
    letterSpacing: mode === 'adapted' ? '0.029em' : 'normal',
    fontSize: mode === 'adapted' ? '22px' : '15px',
    transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <div className={styles.demoCard}>
      {/* Sample selector */}
      <div className={styles.demoTop}>
        <div className={styles.samplePills}>
          {(['article', 'academic', 'news'] as const).map(s => (
            <button
              key={s}
              className={`${styles.samplePill} ${sample === s ? styles.samplePillActive : ''}`}
              onClick={() => setSample(s)}
            >
              {s === 'article' ? 'Article excerpt' : s === 'academic' ? 'Academic text' : 'News story'}
            </button>
          ))}
        </div>

        {/* Adaptive toggle */}
        <div className={styles.demoToggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'normal' ? styles.toggleActive : ''}`}
            onClick={() => setMode('normal')}
          >
            Normal
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'adapted' ? styles.toggleActive : ''}`}
            onClick={() => setMode('adapted')}
          >
            Adapted
          </button>
        </div>
      </div>

      <p className={styles.demoHint}>Click Adapted to preview Preset A. Click Normal to switch back.</p>

      {/* Text panel */}
      <div
        className={styles.demoText}
        style={bgStyle}
      >
        {mode === 'adapted' && bionicOn ? (
          <p
            className="bionic-text"
            dangerouslySetInnerHTML={{ __html: adaptedHtml }}
          />
        ) : (
          <p>{text}</p>
        )}
      </div>

      {/* CTA below demo */}
      <div className={styles.demoCta}>
        <p className={styles.demoCtaText}>
          This is Preset A — recommended for mild ADHD.<br />
          Take the quiz to find your exact preset.
        </p>
        <Link href="/quiz" className="btn btn-primary">Get My Reading Profile</Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// AnimatedStat — counts up on scroll
// ──────────────────────────────────────────────────────────────────
function AnimatedStat({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statNum}>{value}<span className={styles.statSuffix}>{suffix}</span></span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// HeroCard — before/after card in hero
// ──────────────────────────────────────────────────────────────────
function HeroCard() {
  const [adapted, setAdapted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setAdapted((prev) => !prev), 2000);
    return () => clearInterval(timer);
  }, []);

  const sample = "The human brain processes written language in a remarkably efficient way when given the right visual anchors.";
  const html = applyBionicToText(sample, 0.5);

  return (
    <div className={styles.heroCard}>
      <div className={styles.heroCardLabel}>{adapted ? 'Adapted ✓' : 'Normal text'}</div>
      <div
        className={`${styles.heroCardText} ${adapted ? styles.heroCardAdapted : ''}`}
        style={{
          fontFamily: adapted ? 'Literata, Georgia, serif' : 'var(--font-ui)',
          lineHeight: adapted ? 1.9 : 1.5,
          fontSize: adapted ? '16px' : '14px',
        }}
      >
        {adapted ? (
          <span className="bionic-text" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          sample
        )}
      </div>
      <div className={styles.heroCardBottom}>
        <span className={styles.realOutput}>Actual Readapt output</span>
        <div className={styles.heroDots}>
          <span className={adapted ? '' : styles.dotActive} />
          <span className={adapted ? styles.dotActive : ''} />
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// LANDING PAGE
// ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  return (
    <div className={styles.page}>
      <CursorOrb />
      <Header />

      {/* ░░░ SECTION 1: HERO ░░░ */}
      <section className={`${styles.hero} dot-grid`} ref={heroRef}>
        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>Built for ADHD brains</div>
            <h1 className={styles.headline}>
              <span className={styles.headlineLine}>Read faster.</span>
              <span className={styles.headlineLine}>Stay focused.</span>
              <em className={styles.headlineFinally}>Finally.</em>
            </h1>
            <p className={styles.subheadline}>
              Readapt transforms any text into a format<br />
              your ADHD brain actually locks onto.<br />
              Takes 2 minutes to set up. Works everywhere.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/quiz" className="btn btn-primary" style={{ height: '52px', fontSize: '16px', padding: '0 32px' }}>
                Take the Free Quiz
              </Link>
              <a href="#demo" className={`btn btn-ghost ${styles.seeItBtn}`}>
                See it work ↓
              </a>
            </div>
          </div>
          <div className={styles.heroRight}>
            <HeroCard />
          </div>
        </div>
        <div className={styles.heroGradient} />
      </section>

      {/* ░░░ SECTION 2: THE PROBLEM ░░░ */}
      <section className={styles.problem}>
        <div className="container">
          <div className={styles.sectionLabel}>Why it&apos;s hard to read with ADHD</div>
          <div className={styles.stats}>
            <AnimatedStat value="3–5×" label="more mind-wandering than neurotypical readers" />
            <AnimatedStat value="40%" label="of people with ADHD read significantly below their intelligence level" />
            <AnimatedStat value="2.8s" label="average time before attention drifts on unformatted text" />
          </div>
          <p className={styles.problemBody}>
            ADHD isn&apos;t a problem with intelligence. It&apos;s a problem with engagement.<br />
            The right text format can re-engage your brain&apos;s reward system and keep<br />
            it locked in — the same way a great conversation does.
          </p>
        </div>
      </section>

      {/* ░░░ SECTION 3: LIVE DEMO ░░░ */}
      <section className={styles.demoSection} id="demo">
        <div className="container">
          <div className={styles.sectionLabel}>Try it right now — no signup</div>
          <h2 className={styles.sectionTitle}>
            See what your brain<br />has been missing.
          </h2>
          <BionicToggleDemo />
        </div>
      </section>

      {/* ░░░ SECTION 4: HOW IT WORKS ░░░ */}
      <section className={styles.howItWorks}>
        <div className="container">
          <div className={styles.sectionLabel}>How it works</div>
          <h2 className={styles.sectionTitle}>Three steps to reading differently.</h2>
          <div className={styles.steps}>
            {[
              { num: '1', title: 'Take the 2-minute ASRS quiz', desc: 'The same 6-question screener used by clinicians worldwide. Tells us exactly how your attention works.' },
              { num: '2', title: 'Get your personalized reading preset', desc: 'A or B or C — your exact reading adaptation profile, calibrated to your attention profile.' },
              { num: '3', title: 'Read anything, anywhere, with your settings', desc: 'Paste text on our app. Install the extension for every website. Your brain, finally supported.' },
            ].map((step, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepNum}>{step.num}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ░░░ SECTION 5: FEATURE HIGHLIGHTS ░░░ */}
      <section className={styles.features} id="features">
        <div className="container">
          <div className={styles.sectionLabel}>Adaptations that actually work</div>
          <h2 className={styles.sectionTitle}>Every feature has a reason.</h2>

          {/* Row 1: Bionic Reading */}
          <div className={styles.featureRow}>
            <div className={styles.featureText}>
              <h3 className={styles.featureName}>Bionic Reading</h3>
              <p className={styles.featureDesc}>
                Your brain anchors on the bold leading letters and auto-completes each word. The result: your eyes move faster because your brain is doing less decoding.
              </p>
            </div>
            <div className={`${styles.featureVisual} card`}>
              <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '17px', lineHeight: 1.9 }} className="bionic-text" dangerouslySetInnerHTML={{ __html: applyBionicToText("Your brain anchors on the bold leading letters and auto-completes each word seamlessly.", 0.5) }} />
            </div>
          </div>

          {/* Row 3: Sentence Chunking */}
          <div className={styles.featureRow}>
            <div className={styles.featureText}>
              <h3 className={styles.featureName}>Sentence Chunking</h3>
              <p className={styles.featureDesc}>
                Long sentences are split at natural clause boundaries into manageable chunks. Preset B uses moderate chunking, and Preset C applies more aggressive chunking for maximum clarity.
              </p>
            </div>
            <div className={`${styles.featureVisual} card`}>
              <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)', marginBottom: '16px', textDecoration: 'line-through' }}>
                Long sentences that contain multiple clauses are difficult to process because they demand that the reader hold too many ideas in working memory simultaneously.
              </p>
              <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '16px', lineHeight: 2 }}>
                Long sentences<br/>
                <span style={{ color: 'var(--accent)', marginRight: '8px' }}>·</span>that contain multiple clauses<br/>
                <span style={{ color: 'var(--accent)', marginRight: '8px' }}>·</span>are split for easy reading.
              </p>
            </div>
          </div>

          {/* Row 4: ADHD Summary + TTS */}
          <div className={`${styles.featureRow} ${styles.featureRowReverse}`}>
            <div className={`${styles.featureVisual} card`}>
              <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Article summary</div>
              {['The key insight is X.', 'Action required: do Y.', 'Critical deadline: this Friday.', 'Impact: affects team Q.'].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>✦</span>
                  <span style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '15px', lineHeight: 1.5 }}>{b}</span>
                </div>
              ))}
            </div>
            <div className={styles.featureText}>
              <h3 className={styles.featureName}>ADHD Summary + TTS</h3>
              <p className={styles.featureDesc}>
                Summarize dense passages into concise bullet points and listen using built-in text-to-speech. Ideal when reading fatigue kicks in.
              </p>
            </div>
          </div>

          {/* Row 5: Focus Line */}
          <div className={styles.featureRow}>
            <div className={styles.featureText}>
              <h3 className={styles.featureName}>Focus Line</h3>
              <p className={styles.featureDesc}>
                A soft highlight tracks your current line so your eyes always know where to return. This reduces line-jumping and re-reading when attention drops.
              </p>
            </div>
            <div className={`${styles.featureVisual} card`}>
              <div style={{ position: 'relative', border: '1px solid var(--bg-border)', borderRadius: '12px', padding: '16px 14px', background: 'var(--bg-elevated)' }}>
                <div style={{ position: 'absolute', left: '10px', right: '10px', top: '44%', height: '42px', borderRadius: '8px', background: 'linear-gradient(to bottom, transparent, rgba(200,169,110,0.22) 30%, rgba(200,169,110,0.22) 70%, transparent)' }} />
                <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '15px', lineHeight: 1.9, position: 'relative' }}>
                  The same paragraph stays readable because your visual anchor remains stable.<br />
                  You do not lose the active line while scanning forward.<br />
                  Reading feels smoother when your eyes know exactly where to land.
                </p>
              </div>
            </div>
          </div>

          {/* Row 6: Custom Builder */}
          <div className={styles.featureRow}>
            <div className={styles.featureText}>
              <h3 className={styles.featureName}>Custom Builder</h3>
              <p className={styles.featureDesc}>
                Build your own reading mode manually: text size, spacing, contrast, width, reveal behavior, and chunking intensity. Preview every tweak live, then save and apply instantly.
              </p>
            </div>
            <div className={`${styles.featureVisual} card`} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Custom Builder</div>
              <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '15px', lineHeight: 1.9, marginBottom: '12px' }}>
                Font size 26px · Line height 2.2 · Letter spacing 0.04em
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Contrast', 'Font', 'Spacing', 'Reveal', 'Width'].map((pill, idx) => (
                  <span key={idx} style={{ fontSize: '12px', border: '1px solid var(--bg-border)', borderRadius: '999px', padding: '5px 10px', background: 'var(--bg-elevated)' }}>{pill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ░░░ SECTION 6: SOCIAL PROOF ░░░ */}
      <section className={`${styles.socialProof} noise-texture`}>
        <div className="container">
          <h2 className={styles.proofTitle}>People are feeling it.</h2>
          <div className={styles.testimonials}>
            {[
              { quote: "I read an entire article without losing focus for the first time in years.", name: "Anonymous", desc: "" },
              { quote: "I paste my work emails into Readapt before reading them. It sounds extreme until you try it.", name: "Anonymous", desc: "" },
              { quote: "The custom builder made the reading mode finally feel like mine.", name: "Anonymous", desc: "" },
            ].map((t, i) => (
              <div key={i} className={`${styles.testimonialCard} card-elevated`}>
                <p className={styles.testimonialQuote}>&ldquo;{t.quote}&rdquo;</p>
                <div className={styles.testimonialMeta}>
                  <span className={styles.testimonialName}>— {t.name}</span>
                  <span className={styles.testimonialDesc}>{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.viralRef}>
            <span className={styles.viralNum}>100,000+</span>
            <span className={styles.viralText}>people reacted to this technique in one week.</span>
          </div>
        </div>
      </section>

      {/* ░░░ SECTION 7: EXTENSION ░░░ */}
      <section className={styles.extension}>
        <div className="container">
          <div className={styles.extensionInner}>
            <div className={styles.extensionText}>
              <div className={styles.sectionLabel}>Browser Extension</div>
              <h2 className={styles.sectionTitle}>Your reading settings,<br />on every website.</h2>
              <p className={styles.subheadline} style={{ fontSize: 'var(--text-md)', marginBottom: '32px' }}>
                Install the extension and Readapt follows you everywhere — news, Reddit, emails, Wikipedia. Your preset syncs automatically.
              </p>
              <a href={CHROME_WEBSTORE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Get the Extension</a>
            </div>
            <div className={styles.browserMockup}>
              <div className={styles.browserBar}>
                <div className={styles.browserDots}><span/><span/><span/></div>
                <div className={styles.browserUrl}>news.example.com</div>
                <div className={styles.extensionBadge}>R</div>
              </div>
              <div className={styles.browserContent}>
                <div style={{ height: '12px', background: 'var(--bg-border)', borderRadius: '4px', marginBottom: '12px', width: '60%' }} />
                <p style={{ fontFamily: 'Literata, Georgia, serif', fontSize: '15px', lineHeight: 1.9 }} className="bionic-text" dangerouslySetInnerHTML={{ __html: applyBionicToText("Scientists have discovered a new reading method that significantly improves focus for people with ADHD.", 0.5) }} />
                <div style={{ height: '8px', background: 'var(--bg-border)', borderRadius: '4px', marginTop: '12px', width: '40%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ░░░ SECTION 8: FINAL CTA ░░░ */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaGlow} />
        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <p className={styles.finalCtaSub}>It takes 2 minutes.</p>
          <h2 className={styles.finalCtaTitle}>
            You&apos;ll read differently<br />for the rest of your life.
          </h2>
          <Link href="/quiz" className="btn btn-primary" style={{ height: '56px', padding: '0 40px', fontSize: '18px' }}>
            Start the Quiz — It&apos;s Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
