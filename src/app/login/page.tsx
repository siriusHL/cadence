'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { AuthMobileLayout } from '@/components/mobile/PublicMobile';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-3 mx-auto">
      <label className="text-sm font-medium">
        Email
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:border-ink"
        />
      </label>
      <label className="text-sm font-medium">
        Password
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:border-ink"
        />
      </label>
      {error && <p className="text-sm text-down">{error}</p>}
      <button
        type="submit" disabled={busy}
        className="mt-2 h-11 rounded-full bg-ink text-white font-medium disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const formContent = (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
  const footer = (
    <>
      No account?{' '}
      <Link href="/signup" style={{ color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>
        Sign up
      </Link>
    </>
  );

  return (
    <>
      <div className="cdn-mobile-only">
        <AuthMobileLayout
          title="Welcome back"
          sub="Log in to your account"
          form={formContent}
          footer={footer}
        />
      </div>
      <main className="cdn-desktop-only min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase mb-10">
          <span className="w-2 h-2 rounded-full bg-accent-soft" /> Cadence
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.025em] mb-8">Welcome back</h1>
        {formContent}
        <p className="text-sm text-ink-soft text-center mt-3">
          No account? <Link href="/signup" className="text-ink underline underline-offset-2">Sign up</Link>
        </p>
      </main>
    </>
  );
}
