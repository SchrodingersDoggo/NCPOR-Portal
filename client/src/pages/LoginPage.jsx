import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If ProtectedRoute redirected here, send the user back where they were
  // headed once login succeeds. Otherwise just go home.
  const from = location.state?.from?.pathname || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0b1c25] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#0f1f2b] border border-slate-700 rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Sign in</h1>
        <p className="text-sm text-slate-400 mb-6">Access the NCPOR portal</p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-1">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        />

        <label className="block text-sm text-slate-300 mb-1">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-sm text-slate-400 mt-4 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-cyan-300 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
