'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

const QUESTIONS = [
  "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
  "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
  "How often do you have problems remembering appointments or obligations?",
  "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
  "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
  "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
];

const OPTIONS = [
  { label: 'Never', value: 0 },
  { label: 'Rarely', value: 1 },
  { label: 'Sometimes', value: 2 },
  { label: 'Often', value: 3 },
  { label: 'Very Often', value: 4 },
];

export default function QuizPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(6).fill(-1));
  const [selected, setSelected] = useState<number>(-1);
  const [calculating, setCalculating] = useState(false);
  const [direction, setDirection] = useState<'in' | 'out'>('in');

  const progress = ((step) / 6) * 100;

  function handleSelect(val: number) {
    setSelected(val);
  }

  function handleNext() {
    const newAnswers = [...answers];
    newAnswers[step] = selected;
    setAnswers(newAnswers);

    if (step < 5) {
      setDirection('out');
      setTimeout(() => {
        setStep(s => s + 1);
        setSelected(newAnswers[step + 1] ?? -1);
        setDirection('in');
      }, 180);
    } else {
      // Done — show calculating screen
      setCalculating(true);
      const score = newAnswers.reduce((a, b) => a + (b >= 0 ? b : 0), 0);
      setTimeout(() => {
        router.push(`/results?score=${score}`);
      }, 1400);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(s => s - 1);
      setSelected(answers[step - 1] ?? -1);
    }
  }

  if (calculating) {
    return (
      <div className={styles.calculating}>
        <div className={styles.calcBrand}>
          <Image src="/logo.png" alt="Readapt" width={54} height={54} className={styles.brandIcon} priority />
          <div className={styles.calcLogo}>Readapt</div>
        </div>
        <p className={styles.calcText}>Calculating your profile...</p>
        <div className={styles.calcSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header — logo only */}
      <div className={styles.quizHeader}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Readapt" width={32} height={32} className={styles.brandIcon} priority />
          <span>Readapt</span>
        </Link>
      </div>

      <main className={styles.main}>
        {/* Progress */}
        <div className={styles.progressRow}>
          <span className={styles.questionNum}>Question {step + 1} of 6</span>
        </div>
        <div className="progress-bar-track" style={{ marginBottom: '48px' }}>
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div
          key={step}
          className={`${styles.questionBlock} ${direction === 'in' ? styles.slideIn : styles.slideOut}`}
        >
          <p className={styles.question}>{QUESTIONS[step]}</p>

          <div className={styles.options}>
            {OPTIONS.map(opt => (
              <button
                key={opt.value}
                id={`option-${opt.value}`}
                className={`${styles.option} ${selected === opt.value ? styles.optionSelected : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <span className={styles.optionRadio}>
                  {selected === opt.value ? '✓' : '○'}
                </span>
                <span className={styles.optionLabel}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className={styles.navRow}>
          {step > 0 ? (
            <button className={`btn btn-ghost ${styles.backBtn}`} onClick={handleBack}>
              ← Back
            </button>
          ) : <span />}

          {selected >= 0 && (
            <button
              id="next-btn"
              className={`btn btn-primary ${styles.nextBtn}`}
              onClick={handleNext}
            >
              {step === 5 ? 'See My Profile →' : 'Next →'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
