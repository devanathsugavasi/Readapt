'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import styles from './page.module.css';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignup() {
    setError(null);
    setSuccess(null);
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

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!termsAccepted) {
      setError('Please accept Terms and Privacy Policy to continue.');
      return;
    }

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

    const normalizedEmail = email.trim().toLowerCase();
    const signupRes = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        termsAccepted,
      }),
    });

    const signupPayload = (await signupRes.json()) as { error?: string };

    if (!signupRes.ok) {
      setError(signupPayload.error || 'Unable to create account right now.');
      setIsSubmitting(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setIsSubmitting(false);
      return;
    }

    if (!loginError) {
      router.push('/dashboard');
      return;
    }
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
          <h1 className={styles.formTitle}>Create your account</h1>
          <p className={styles.formSub}>Free forever. No credit card required.</p>

          <button id="google-signup-btn" className={styles.googleBtn} onClick={handleGoogleSignup} type="button" disabled={isSubmitting}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {isSubmitting ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div className={styles.divider}><span>or</span></div>

          <form id="signup-form" className={styles.form} onSubmit={handleSignup}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className={styles.checkboxRow}>
              <input id="terms" type="checkbox" className={styles.checkbox} checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} disabled={isSubmitting} />
              <label htmlFor="terms" className={styles.termsLabel}>
                I agree to the <Link href="/terms" className={styles.link}>Terms</Link> and <Link href="/privacy" className={styles.link}>Privacy Policy</Link>
              </label>
            </div>
            {error && <p className={styles.errorMsg}>{error}</p>}
            {success && <p className={styles.successMsg}>{success}</p>}
            <button id="signup-submit" type="submit" className={`btn btn-primary ${styles.submitBtn}`}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Already have an account?{' '}
            <Link href="/auth/login" className={styles.link}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
