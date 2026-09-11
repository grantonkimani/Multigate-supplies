'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push('/admin/orders');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[#e8f4fc]">
      <div className="bg-white rounded-2xl shadow-xl border border-sky-200 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-sky-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Multigate Medical Supplies</h1>
          <p className="text-sky-600 font-medium mt-2">Admin Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              disabled={loading}
              autoComplete="email"
              className="w-full px-3 py-2.5 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
              className="w-full px-3 py-2.5 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-400 disabled:bg-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 text-white font-semibold py-3 rounded-lg hover:bg-sky-700 disabled:opacity-50 transition flex items-center justify-center shadow-sm"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} Multigate Medical Supplies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
