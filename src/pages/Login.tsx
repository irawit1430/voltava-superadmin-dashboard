import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertTriangle } from 'lucide-react';
import { request, ApiError, AUTH_MESSAGE_KEY, errorMessage } from '../lib/api';
import type { AuthUser } from '../types';

interface LoginResponse {
  token?: string;
  user?: AuthUser;
}

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Message handed over by the API client when it signed the user out.
  useEffect(() => {
    try {
      const message = sessionStorage.getItem(AUTH_MESSAGE_KEY);
      if (message) {
        setNotice(message);
        sessionStorage.removeItem(AUTH_MESSAGE_KEY);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    try {
      const data = await request<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        // A 401 here means "wrong password", not "session expired" — it must
        // render inline rather than bouncing through the sign-out redirect.
        redirectOnAuthFailure: false,
      });

      // Previously `data.user.role` was read unguarded, so a token-only response
      // surfaced "Cannot read properties of undefined" as if it were a login error.
      if (!data?.token) {
        throw new Error('The server signed you in but did not return a session token.');
      }
      if (!data.user) {
        throw new Error('The server signed you in but did not return your account details.');
      }
      if (data.user.role !== 'SUPER_ADMIN') {
        throw new Error(
          'This console is for super admins. Your account does not have that access.',
        );
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/', { replace: true });
    } catch (err) {
      // Every failure used to read "Invalid credentials" — including a 500 and a
      // cold-start timeout, which told the user their password was wrong when it
      // wasn't.
      if (err instanceof ApiError && err.status === 401) {
        setError('That email and password combination did not work.');
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decoration is now pure CSS. It previously pulled a texture from
          transparenttextures.com, so the auth page depended on a third-party
          host being reachable. */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-900/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-3xl tracking-tighter mb-5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            V
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Voltava</h1>
          <p className="text-[11px] font-bold text-brand-500 uppercase tracking-widest mt-2">
            Energy Systems
          </p>
        </div>

        {notice && (
          <div
            className="mb-4 p-3 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg"
            role="status"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            className="mb-4 p-3 bg-danger-500/10 border border-danger-500/40 text-danger-300 text-sm rounded-lg font-medium flex gap-2.5 items-start"
            role="alert"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium text-white placeholder-slate-600"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all font-medium text-white placeholder-slate-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold py-3 rounded-lg text-sm transition-all mt-4 disabled:opacity-70 flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {isLoading ? 'Signing in…' : 'Access dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
