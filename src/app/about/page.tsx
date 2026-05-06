"use client";

import Link from 'next/link';
import { applyBionicToText } from '@/lib/adaptEngine';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import styles from './page.module.css';

const INLINE_DEMO = "The human brain reads words primarily by their initial shapes — bionic reading makes the anchor characters visually dominant, accelerating word recognition.";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <Header minimalWhenAuthed />

      <main className={styles.main}>
        <div className={styles.hero}>
          <div className={styles.eyebrow}>Science &amp; Research</div>
          <h1 className={styles.title}>Why Readapt works.</h1>
          <p className={styles.sub}>
            Every feature in Readapt is built on cognitive science research about attention, working memory, and how the ADHD brain actually reads.
          </p>
        </div>

        <div className={styles.content}>
          {/* Section 1 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>The Science of ADHD and Reading</h2>
            <p>ADHD is not a deficit of intelligence — it is a deficit of attention regulation. The prefrontal cortex, which governs sustained attention and working memory, shows reduced activation in ADHD brains during reading tasks. This means that holding the thread of a long sentence, tracking your place in a paragraph, and suppressing distraction from surrounding text are all genuinely harder.</p>
            <p>The dopaminergic reward system plays a crucial role. Reading &ldquo;reward&rdquo; — the intrinsic motivation to continue reading — is weaker in ADHD brains when text is unformatted and cognitively demanding. The result is avoidance, re-reading, and fatigue that neurotypical readers don&apos;t experience at the same rate.</p>
            <p>What Readapt does is environmental modification: instead of changing the reader, we change the text. The adaptations reduce cognitive load at each level — word recognition, line tracking, sentence parsing, and paragraph retention.</p>
          </section>

          {/* Section 2 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Why Bionic Reading Works</h2>
            <p>When you read, your eyes don&apos;t move smoothly across a line — they make rapid, discrete jumps called saccades, landing on anchor points in each word. Your brain pattern-matches the full word from those anchor characters, predicting the rest faster than it can serially decode each letter.</p>
            <p>Bionic reading makes those anchor characters visually dominant. The bold initial letters give your brain&apos;s pattern-recognition system a stronger signal. The result is faster word recognition with less cognitive effort expended per word — leaving more resources for comprehension.</p>

            {/* Inline demo */}
            <div className={styles.demoBox}>
              <div className={styles.demoRow}>
                <span className={styles.demoTag}>Normal</span>
                <p className={styles.demoNormal}>{INLINE_DEMO}</p>
              </div>
              <div className={styles.demoRow}>
                <span className={styles.demoTag} style={{ color: 'var(--accent)' }}>Bionic</span>
                <p
                  className={`${styles.demoBionic} bionic-text`}
                  dangerouslySetInnerHTML={{ __html: applyBionicToText(INLINE_DEMO, 0.5) }}
                />
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Why Line Width Matters</h2>
            <p>Eye-tracking research consistently shows that long lines of text increase the cognitive effort required for saccadic return — the eye movement from the end of one line to the beginning of the next. When a line is too long, readers land on the wrong line more frequently, triggering re-reading.</p>
            <p>The optimal typographic measure (characters per line) for body text is 55–65 characters. Readapt enforces this with a max-width constraint on the reading container. For ADHD readers, this is not optional — it&apos;s a primary accessibility feature.</p>
          </section>

          {/* Section 4 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>The ASRS-6 Screener</h2>
            <p>The Adult ADHD Self-Report Scale Part A (ASRS-6) is a 6-item screener developed in collaboration with the World Health Organization. It is used by clinicians worldwide as a first-pass screening tool for ADHD in adults. Research has validated its sensitivity (68.7%) and specificity (99.5%) for identifying ADHD presentations.</p>
            <p>Readapt uses the ASRS Part A to determine a reading difficulty profile — not to diagnose anything. We use the sum score to assign one of three reading presets. The quiz takes less than 2 minutes and requires no account to complete.</p>
          </section>

          {/* Disclaimer */}
          <section className={`${styles.section} ${styles.disclaimer}`}>
            <h2 className={styles.sectionTitle}>What We Are Not</h2>
            <p>Readapt is a reading productivity tool. We are not a medical device, a diagnostic service, or a treatment for ADHD. The ASRS-6 quiz on this site produces a reading profile, not a clinical assessment. If you think you may have ADHD and want a formal evaluation, please speak to a licensed healthcare professional.</p>
            <p>The testimonials on this site are from early users. The research references we cite are real, but we do not claim that Readapt has been clinically validated as a treatment.</p>
          </section>

          {/* Founder */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Built by someone who gets it</h2>
            <p>Readapt was built in Chennai, India, after watching 100,000+ people respond to a single post about bionic reading for ADHD. The comments were full of people asking &ldquo;why isn&apos;t this available everywhere?&rdquo; — so we built it.</p>
            <p>This is not a research project. It is a product built by someone who has sat in the comments section of that post, wanted the same thing, and decided to make it real.</p>
          </section>
        </div>

        <div className={styles.cta}>
          <p>Ready to experience it?</p>
          <Link href="/quiz" className="btn btn-primary" style={{ height: '52px', padding: '0 36px', fontSize: '17px' }}>
            Take the Free Quiz
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
