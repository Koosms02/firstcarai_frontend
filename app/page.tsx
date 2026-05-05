'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { signup, login, getUser, forgotPassword, resetPassword } from '@/lib/recommendations';
import { AnimatedForm } from '@/components/ui/auth-components';

const GOLF_R_URL =
  'https://images.unsplash.com/photo-1718629879998-ee8cfc09df39?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dnclMjBnb2xmJTIwcnxlbnwwfHwwfHx8MA%3D%3D';

type Mode = 'signup' | 'login' | 'forgot-password' | 'reset-password';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [fields, setFields] = useState({ email: '', password: '' });
  const [resetFields, setResetFields] = useState({ code: '', newPassword: '', confirmPassword: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState(''); // code returned by API (dev only)
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carImgError, setCarImgError] = useState(false);

  function handleChange(id: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [id]: e.target.value }));
    };
  }

  function switchMode(next: Mode) {
    setMode(next);
    setServerError('');
    setSuccessMessage('');
    setFields({ email: '', password: '' });
    setResetFields({ code: '', newPassword: '', confirmPassword: '' });
  }

  async function handleSubmit(_e: React.SyntheticEvent<HTMLFormElement>) {
    setIsSubmitting(true);
    setServerError('');
    setSuccessMessage('');
    try {
      if (mode === 'signup') {
        // Unit of work: signup only creates auth credentials.
        // The user profile is NOT written to the database yet —
        // that only happens in submitQuestionnaire when the form is completed.
        await signup({ email: fields.email.trim(), password: fields.password });
        switchMode('login');
        setSuccessMessage('Account created! Please sign in to continue.');
        return;
      }

      if (mode === 'login') {
        const user = await login({ email: fields.email.trim(), password: fields.password });
        sessionStorage.setItem('user_id', user.id);
        sessionStorage.setItem('user_email', user.email);

        // Unit of work check: the user record exists after signup (needed for auth),
        // but netSalary is only populated after the form is submitted.
        const profile = await getUser(user.id);
        const hasCompletedForm = profile?.netSalary != null;
        router.push(hasCompletedForm ? '/dashboard' : '/form');
        return;
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setServerError('Please enter your email address.'); return; }
    setIsSubmitting(true);
    setServerError('');
    try {
      const res = await forgotPassword(forgotEmail.trim());
      setResetCode(res.resetCode ?? '');
      setMode('reset-password');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (resetFields.newPassword !== resetFields.confirmPassword) {
      setServerError('Passwords do not match.');
      return;
    }
    if (resetFields.newPassword.length < 8) {
      setServerError('Password must be at least 8 characters.');
      return;
    }
    setIsSubmitting(true);
    setServerError('');
    try {
      await resetPassword(forgotEmail.trim(), resetFields.code.trim(), resetFields.newPassword);
      switchMode('login');
      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — car background */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden">
        {carImgError ? (
          <div className="absolute inset-0 bg-blue-600">
            <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500 opacity-40 -bottom-24 -left-24" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-700 opacity-30 top-10 right-10" />
            <Image src="/car.svg" alt="Car illustration" fill className="object-cover opacity-30" priority />
          </div>
        ) : (
          <Image
            src={GOLF_R_URL}
            alt="Volkswagen Golf R"
            fill
            className="object-cover"
            priority
            onError={() => setCarImgError(true)}
          />
        )}

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-10 text-center">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="white" fillOpacity="0.2"/>
              <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
              <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
              <circle cx="10" cy="20.5" r="2" fill="#2563eb"/>
              <circle cx="18" cy="20.5" r="2" fill="#2563eb"/>
            </svg>
            <span className="text-2xl font-bold text-white">FirstCar</span>
          </div>

          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Find Your
              <br />
              Perfect First Car
            </h2>
            <p className="mt-3 text-blue-100 text-base max-w-xs">
              Smart recommendations tailored to your budget and lifestyle.
            </p>
          </div>

          <div className="flex gap-4 mt-2">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">500+</p>
              <p className="text-blue-100 text-xs">Car Models</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">10K+</p>
              <p className="text-blue-100 text-xs">Happy Buyers</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">Free</p>
              <p className="text-blue-100 text-xs">No Hidden Fees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#2563eb"/>
            <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
            <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
            <circle cx="10" cy="20.5" r="2" fill="#2563eb"/>
            <circle cx="18" cy="20.5" r="2" fill="#2563eb"/>
          </svg>
          <span className="text-xl font-bold text-gray-900">FirstCar</span>
        </div>

        {successMessage && (
          <div className="w-96 max-md:w-full mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-green-600">
              <circle cx="8" cy="8" r="8" fill="currentColor" fillOpacity="0.15"/>
              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm font-medium text-green-700">{successMessage}</p>
          </div>
        )}

        {/* ── Forgot password form ── */}
        {mode === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="w-96 max-md:w-full flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-3xl text-neutral-800">Forgot password</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Enter your email address and we&apos;ll generate a reset code for you.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <input
                type="email"
                required
                placeholder="jane@example.co.za"
                value={forgotEmail}
                onChange={(e) => { setForgotEmail(e.target.value); setServerError(''); }}
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-md bg-gradient-to-br from-zinc-200 to-zinc-200 font-medium text-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Generating…' : 'Send reset code →'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-blue-500 text-center"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {/* ── Reset password form ── */}
        {mode === 'reset-password' && (
          <form onSubmit={handleResetPassword} className="w-96 max-md:w-full flex flex-col gap-5">
            <div>
              <h2 className="font-bold text-3xl text-neutral-800">Reset password</h2>
              <p className="mt-2 text-sm text-neutral-500">
                Enter the 6-digit code and choose a new password.
              </p>
            </div>

            {/* Dev-mode code banner */}
            {resetCode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                  Dev mode — code (would be emailed in production)
                </p>
                <p className="text-2xl font-mono font-bold tracking-widest text-amber-800">{resetCode}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Reset code</label>
              <input
                type="text"
                required
                placeholder="123456"
                maxLength={6}
                value={resetFields.code}
                onChange={(e) => setResetFields((p) => ({ ...p, code: e.target.value.replace(/\D/g, '') }))}
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-mono tracking-widest placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">New password</label>
              <input
                type="password"
                required
                placeholder="At least 8 characters"
                value={resetFields.newPassword}
                onChange={(e) => setResetFields((p) => ({ ...p, newPassword: e.target.value }))}
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Confirm new password</label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={resetFields.confirmPassword}
                onChange={(e) => setResetFields((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-md bg-gradient-to-br from-zinc-200 to-zinc-200 font-medium text-sm disabled:opacity-60"
            >
              {isSubmitting ? 'Resetting…' : 'Reset password →'}
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-blue-500 text-center"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {/* ── Signup / Login form ── */}
        {(mode === 'signup' || mode === 'login') && (
          <>
            <AnimatedForm
              key={mode}
              header={isLogin ? 'Welcome back' : 'Create your account'}
              subHeader={
                isLogin
                  ? 'Sign in to see your car recommendations.'
                  : 'Sign up to get personalised car recommendations.'
              }
              fields={[
                {
                  label: 'Email',
                  required: true,
                  type: 'email',
                  placeholder: 'jane@example.co.za',
                  onChange: handleChange('email'),
                },
                {
                  label: 'Password',
                  required: true,
                  type: 'password',
                  placeholder: isLogin ? 'Your password' : 'At least 8 characters',
                  onChange: handleChange('password'),
                },
              ]}
              submitButton={isLogin ? 'Sign in' : 'Create account'}
              isLoading={isSubmitting}
              textVariantButton={
                isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'
              }
              errorField={serverError}
              onSubmit={handleSubmit}
              goTo={() => switchMode(isLogin ? 'signup' : 'login')}
              showTerms={!isLogin}
            />

            {isLogin && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => { setForgotEmail(fields.email); switchMode('forgot-password'); }}
                  className="text-sm text-blue-500 hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
