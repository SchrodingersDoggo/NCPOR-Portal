import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'researcher' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0b1c25] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#0f1f2b] border border-slate-700 rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Create account</h1>
        <p className="text-sm text-slate-400 mb-6">Join the NCPOR portal</p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <label className="block text-sm text-slate-300 mb-1">Name</label>
        <input
          required
          value={form.name}
          onChange={update('name')}
          className="w-full mb-4 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        />

        <label className="block text-sm text-slate-300 mb-1">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          className="w-full mb-4 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        />

        <label className="block text-sm text-slate-300 mb-1">Password</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          className="w-full mb-4 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        />

        <label className="block text-sm text-slate-300 mb-1">Role</label>
        <select
          value={form.role}
          onChange={update('role')}
          className="w-full mb-6 px-3 py-2 rounded bg-[#162933] border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="researcher">Researcher</option>
          <option value="comms_officer">Comms Officer</option>
          {/* "admin" is deliberately not offered here — admin accounts
              should be created manually/by an existing admin, not via
              open self-registration. */}
        </select>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium transition-colors"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-sm text-slate-400 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-300 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
