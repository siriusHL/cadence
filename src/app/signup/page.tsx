'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app/home` },
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    // If email confirmation is off, log in immediately; otherwise show confirm message.
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      router.push('/app/home');
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-[-0.025em] mb-3">Check your email</h1>
        <p className="text-ink-soft max-w-sm">We sent a confirmation link to <b>{email}</b>. Click it to finish signing up.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.06em] uppercase mb-10">
        <span className="w-2 h-2 rounded-full bg-accent-soft" /> Cadence
      </Link>
      <h1 className="text-3xl font-semibold tracking-[-0.025em] mb-2">Start free</h1>
      <p className="text-ink-soft mb-8 text-sm">10 holdings, no credit card.</p>
      <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-3">
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
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full h-11 px-3.5 rounded-xl border border-line-strong bg-white focus:outline-none focus:border-ink"
          />
        </label>
        {error && <p className="text-sm text-down">{error}</p>}
        <button type="submit" disabled={busy}
          className="mt-2 h-11 rounded-full bg-ink text-white font-medium disabled:opacity-50">
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-sm text-ink-soft text-center mt-3">
          Already have an account? <Link href="/login" className="text-ink underline underline-offset-2">Log in</Link>
        </p>
      </form>
    </main>
  );
}
