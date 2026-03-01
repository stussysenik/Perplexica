'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-light-primary dark:bg-dark-primary">
      <div className="w-full max-w-sm p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/icon-50.png" alt="Perplexica" className="h-8 w-8" />
            <h1 className="text-2xl font-medium text-black/80 dark:text-white/80">
              Perplexica
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
            <input
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="w-full rounded-md border border-light-300 bg-light-secondary px-4 py-2.5 text-sm text-black/70 outline-none placeholder:text-black/30 focus:border-light-300 dark:border-dark-300 dark:bg-dark-secondary dark:text-white/70 dark:placeholder:text-white/30 dark:focus:border-dark-300"
            />

            {error && (
              <p data-testid="text-login-error" className="text-center text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              data-testid="button-login"
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-md bg-dark-secondary px-4 py-2.5 text-sm font-medium text-white/80 transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-light-secondary dark:text-black/80"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
