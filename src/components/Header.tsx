'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import styles from './Header.module.css';

type HeaderProps = {
  minimalWhenAuthed?: boolean;
};

function getDisplayName(email: string, name?: string | null) {
  if (name && name.trim().length > 0) return name.trim();
  if (!email) return 'User';
  return email.split('@')[0];
}

export default function Header({ minimalWhenAuthed = false }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [userName, setUserName] = useState('User');
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        const metaName =
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === 'string'
              ? user.user_metadata.name
              : null;
        setIsAuthed(true);
        setUserName(getDisplayName(user.email || '', metaName));
      }
      setAuthResolved(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setIsAuthed(false);
        setUserName('User');
        setAuthResolved(true);
        return;
      }
      const metaName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : null;
      setIsAuthed(true);
      setUserName(getDisplayName(user.email || '', metaName));
      setAuthResolved(true);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const homeHref = isAuthed ? '/dashboard' : '/';
  const shouldUseMinimalAuthed = minimalWhenAuthed && isAuthed;
  const hidePublicUntilAuthResolved = minimalWhenAuthed && !authResolved;

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}
    >
      <div className={styles.inner}>
        <Link href={homeHref} className={styles.logo}>
          <Image src="/logo.png" alt="Readapt" width={34} height={34} className={styles.logoIcon} priority />
          <span>Readapt</span>
        </Link>

        {!shouldUseMinimalAuthed && !hidePublicUntilAuthResolved && (
          <nav className={styles.nav}>
            <Link href="/#features" className={styles.navLink}>Features</Link>
            <Link href="/about" className={styles.navLink}>Science</Link>
          </nav>
        )}

        <div className={styles.actions}>
          {hidePublicUntilAuthResolved ? (
            <span className={styles.actionPlaceholder} aria-hidden="true" />
          ) : shouldUseMinimalAuthed ? (
            <Link href="/dashboard" className={styles.profileChip}>
              <span className={styles.profileAvatar}>{userName.charAt(0).toUpperCase()}</span>
              <span>{userName}</span>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className={`${styles.loginBtn} hide-mobile`}>Log In</Link>
              <Link href="/quiz" className="btn btn-primary" style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}>
                Get Started
              </Link>
              <button
                className={styles.hamburger}
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <span className={menuOpen ? styles.barTop : ''} />
                <span className={menuOpen ? styles.barMid : ''} />
                <span className={menuOpen ? styles.barBot : ''} />
              </button>
            </>
          )}
        </div>
      </div>

      {menuOpen && !shouldUseMinimalAuthed && (
        <div className={styles.mobileMenu}>
          <Link href="/#features" onClick={() => setMenuOpen(false)}>Features</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)}>Science</Link>
          <Link href="/auth/login" onClick={() => setMenuOpen(false)}>Log In</Link>
          <Link href="/quiz" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Get Started</Link>
        </div>
      )}
    </header>
  );
}
