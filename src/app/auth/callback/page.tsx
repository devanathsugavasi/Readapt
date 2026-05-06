'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch (clientError) {
        const errorMessage = clientError instanceof Error ? clientError.message : 'Supabase client is not configured.';
        if (active) {
          router.replace(`/auth/login?error=${encodeURIComponent(errorMessage)}`);
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const next = params.get('next') || '/dashboard';
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) {
        if (active) {
          router.replace(`/auth/login?error=${encodeURIComponent(oauthError)}`);
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) {
            router.replace(`/auth/login?error=${encodeURIComponent(error.message)}`);
          }
          return;
        }
      }

      if (active) {
        setMessage('Redirecting...');
        router.replace(next);
      }
    }

    completeAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{message}</p>
    </main>
  );
}
