'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CHROME_WEBSTORE_URL } from '@/lib/publicLinks';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import styles from './page.module.css';

type DashTab = 'profile' | 'extension';

type UserProfile = {
  quiz_score: number | null;
};

function getDisplayName(email: string, name?: string | null) {
  if (name && name.trim().length > 0) return name.trim();
  if (!email) return 'User';
  return email.split('@')[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<DashTab>('profile');
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function loadDashboard() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        router.replace('/auth/login');
        return;
      }

      const user = data.user;
      const email = user.email || '';
      const metaName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : null;

      setUserName(getDisplayName(email, metaName));

      try {
        const res = await fetch(`/api/presets?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        if (res.ok) {
          const payload = (await res.json()) as { profile?: UserProfile | null };
          if (payload.profile) {
            setQuizScore(typeof payload.profile.quiz_score === 'number' ? payload.profile.quiz_score : null);
          }
        }
      } catch {
        // Keep safe defaults.
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loaderWrap}>
          <Image src="/logo.png" alt="Readapt" width={84} height={84} className={styles.loaderLogo} priority />
          <div className={styles.loaderRing} />
        </div>
        <p className={styles.loaderText}>Loading your dashboard...</p>
      </div>
    );
  }

  const avatarLetter = userName.charAt(0).toUpperCase();

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.logoWrap}>
          <Image src="/logo.png" alt="Readapt" width={42} height={42} className={styles.logoIcon} priority />
          <span className={styles.logo}>Readapt</span>
        </Link>

        <div className={styles.userCard}>
          <div className={styles.avatar}>{avatarLetter}</div>
          <div>
            <div className={styles.userName}>{userName}</div>
          </div>
        </div>

        <nav className={styles.sideNav}>
          {[
            { id: 'profile', label: '📚 Reading Profile' },
            { id: 'extension', label: '🌐 Extension Setup' },
          ].map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${tab === item.id ? styles.navItemActive : ''}`}
              onClick={() => setTab(item.id as DashTab)}
            >
              {item.label}
            </button>
          ))}

          <Link href="/about" className={styles.navLink}>ℹ️ About</Link>
        </nav>

        <Link href="/paste" className={styles.adaptBtn} id="dash-open-reader-sidebar">Open Reader →</Link>
        <button className={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
      </aside>

      <main className={styles.main}>
        {tab === 'profile' && (
          <div className={styles.tabContent}>
            {/* ── Hero CTA area ── */}
            <div className={styles.heroSection}>
              <div className={styles.animItem} style={{ '--delay': '0ms' } as React.CSSProperties}>
                <div className={styles.greeting}>Welcome back, {userName}.</div>
                <p className={styles.greetingSub}>Your reading space is ready.</p>
              </div>

              <div className={styles.ctaGroup} style={{ '--delay': '80ms' } as React.CSSProperties}>
                <div className={styles.animItem} style={{ '--delay': '80ms' } as React.CSSProperties}>
                  <Link
                    href="/paste"
                    className={`btn btn-primary ${styles.primaryCta}`}
                    id="dash-open-reader"
                  >
                    Open Reader
                  </Link>
                </div>
                <div className={styles.animItem} style={{ '--delay': '160ms' } as React.CSSProperties}>
                  <Link
                    href="/quiz"
                    className={`btn btn-ghost ${styles.secondaryCta}`}
                    id="dash-take-quiz"
                  >
                    Take Quiz
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Quiz score card ── */}
            <div className={`${styles.scoreCard} ${styles.animItem}`} style={{ '--delay': '240ms' } as React.CSSProperties}>
              <div className={styles.scoreCardLeft}>
                <div className={styles.scoreNum}>{quizScore ?? '--'}<span className={styles.scoreMax}>/24</span></div>
                <div className={styles.scoreBand}>Latest quiz score</div>
              </div>
              <Link href="/quiz" className="btn btn-ghost">Take Quiz</Link>
            </div>
          </div>
        )}

        {tab === 'extension' && (
          <div className={styles.tabContent}>
            <h1 className={styles.tabTitle}>Extension Setup</h1>
            <p className={styles.tabSub}>Get Readapt on every website in 4 steps.</p>

            <div className={styles.steps}>
              {[
                { n: '1', title: 'Install from Chrome Web Store', desc: 'Click below to open the Chrome Web Store and install the Readapt extension.', action: <a href={CHROME_WEBSTORE_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ height: '40px', fontSize: '14px', padding: '0 20px' }}>Install Extension →</a> },
                { n: '2', title: 'Pin the extension', desc: 'Click the puzzle icon in your Chrome toolbar, find Readapt, and click the pin icon to keep it visible.' },
                { n: '3', title: 'Sync your current preset from Readapt', desc: 'In the Readapt web app, open Adapt and click Sync with Extension. No login is required for guest sync.' },
                { n: '4', title: 'Apply on any website', desc: 'Open the Readapt extension on the same tab, choose Inline or Overlay, then enable adaptation instantly.' },
              ].map((step, i) => (
                <div key={i} className={styles.stepCard}>
                  <div className={styles.stepNum}>{step.n}</div>
                  <div className={styles.stepBody}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDesc}>{step.desc}</p>
                    {step.action && <div style={{ marginTop: '16px' }}>{step.action}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
