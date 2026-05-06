'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import styles from '../signup/page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setError(null);
    setIsSubmitting(true);

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      const message = clientError instanceof Error ? clientError.message : 'Supabase client is not configured.';
      setError(message);
      setIsSubmitting(false);
      return;
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsSubmitting(false);
    }
  }

  async function handleEmailLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      const message = clientError instanceof Error ? clientError.message : 'Supabase client is not configured.';
      setError(message);
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <Link href="/" className={styles.logoWrap} aria-label="Readapt home">
          <Image src="/logo.png" alt="Readapt" width={180} height={180} className={styles.logoImage} priority />
        </Link>
        <div className={styles.leftImageWrap}>
          <Image src="/auth-side.png" alt="Readapt testimonial visual" width={700} height={800} className={styles.leftImage} priority />
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formContainer}>
          <h1 className={styles.formTitle}>Welcome back</h1>
          <p className={styles.formSub}>Log in to your Readapt account.</p>

          <button id="google-login-btn" className={styles.googleBtn} onClick={handleGoogleLogin} type="button" disabled={isSubmitting}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {isSubmitting ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className={styles.divider}><span>or</span></div>

          <form id="login-form" className={styles.form} onSubmit={handleEmailLogin}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input id="email" type="email" className={styles.input} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required disabled={isSubmitting} />
            </div>
            <div className={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className={styles.label} htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
                <Link href="#" className={styles.link} style={{ fontSize: 'var(--text-xs)' }}>Forgot password?</Link>
              </div>
              <input id="password" type="password" className={styles.input} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={isSubmitting} />
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            <button id="login-submit" type="submit" className={`btn btn-primary ${styles.submitBtn}`}>
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className={styles.link}>Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
