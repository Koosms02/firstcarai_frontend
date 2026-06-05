'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { login, getUser, getUserRecommendations, forgotPassword } from '@/lib/recommendations';
import { AnimatedForm } from '@/components/ui/auth-components';
import { AuthLeftPanel, MobileLogo } from '@/components/ui/auth-layout';

type Mode = 'login' | 'forgot-password';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';

  const [mode, setMode] = useState<Mode>('login');
  const [fields, setFields] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(id: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [id]: e.target.value }));
    };
  }

  async function handleLoginSubmit(_e: React.SyntheticEvent<HTMLFormElement>) {
    setIsSubmitting(true);
    setServerError('');
    try {
      const user = await login({ email: fields.email.trim(), password: fields.password });
      sessionStorage.setItem('user_id', user.id);
      sessionStorage.setItem('user_email', user.email);

      const profile = await getUser(user.id);
      const hasCompletedForm = profile?.netSalary != null;

      if (hasCompletedForm && profile) {
        const reverseYearsMap: Record<number, string> = { 0: 'less-than-1', 2: '1-3', 4: '3-5', 6: '5-plus' };
        const formAnswers: Record<string, string> = {};
        if (profile.firstName) formAnswers.first_name = profile.firstName;
        if (profile.lastName) formAnswers.last_name = profile.lastName;
        if (profile.netSalary != null) formAnswers.net_salary = String(profile.netSalary);
        if (profile.gender) formAnswers.gender = profile.gender;
        if (profile.location) formAnswers.location = profile.location;
        if (profile.city) formAnswers.city = profile.city;
        if (profile.idNumber) formAnswers.id_number = profile.idNumber;
        if (profile.yearsLicensed != null) {
          formAnswers.years_licenced = reverseYearsMap[profile.yearsLicensed] ?? '';
        }
        if (profile.preferredBrand) formAnswers.preferred_brand = profile.preferredBrand;
        if (profile.carType) formAnswers.car_type = profile.carType;
        if (profile.fuelType) formAnswers.fuel_type = profile.fuelType;
        if (profile.transmission) formAnswers.transmission = profile.transmission;
        if (profile.expensesGroceries != null) formAnswers.expenses_groceries = String(profile.expensesGroceries);
        if (profile.expensesAccounts != null) formAnswers.expenses_accounts = String(profile.expensesAccounts);
        if (profile.expensesLoans != null) formAnswers.expenses_loans = String(profile.expensesLoans);
        if (profile.expensesOther != null) formAnswers.expenses_other = String(profile.expensesOther);
        sessionStorage.setItem('form_answers', JSON.stringify(formAnswers));

        if (profile.creditScore != null) {
          sessionStorage.setItem('credit_score', String(profile.creditScore));
        }

        const recs = await getUserRecommendations(user.id);
        if (recs.length > 0) {
          sessionStorage.setItem('recommendations', JSON.stringify(recs));
          sessionStorage.setItem('result_source', 'api');
        }

        router.push('/dashboard');
        return;
      }

      router.push('/form');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setServerError('Please enter your email address.'); return; }
    setIsSubmitting(true);
    setServerError('');
    setResetUrl('');
    try {
      const res = await forgotPassword(forgotEmail.trim());
      if (res.resetPath) {
        setResetUrl(window.location.origin + res.resetPath);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
      <MobileLogo />

      {justRegistered && mode === 'login' && (
        <div className="w-96 max-md:w-full mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-green-600">
            <circle cx="8" cy="8" r="8" fill="currentColor" fillOpacity="0.15" />
            <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm font-medium text-green-700">Account created! Please sign in to continue.</p>
        </div>
      )}

      {/* ── Forgot password ── */}
      {mode === 'forgot-password' && (
        <div className="w-96 max-md:w-full flex flex-col gap-5">
          <div>
            <h2 className="font-bold text-3xl text-neutral-800">Forgot password</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Enter your email and we&apos;ll generate a secure reset link for you.
            </p>
          </div>

          {!resetUrl && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">Email address</label>
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
                {isSubmitting ? 'Generating link…' : 'Generate reset link →'}
              </button>
            </form>
          )}

          {resetUrl && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Your password reset link</p>
                <p className="text-xs text-blue-600 break-all font-mono">{resetUrl}</p>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(resetUrl)}
                    className="text-xs border border-blue-300 text-blue-600 rounded px-2 py-1 hover:bg-blue-100 transition-colors"
                  >
                    Copy link
                  </button>
                  <a
                    href={resetUrl}
                    className="text-xs border border-blue-400 bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600 transition-colors"
                  >
                    Open link →
                  </a>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                This link expires in 1 hour. In production it would be sent to your email.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setMode('login'); setServerError(''); setResetUrl(''); }}
            className="text-sm text-blue-500 text-center"
          >
            ← Back to sign in
          </button>
        </div>
      )}

      {/* ── Login ── */}
      {mode === 'login' && (
        <>
          <AnimatedForm
            key="login"
            header="Welcome back"
            subHeader="Sign in to see your car recommendations."
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
                placeholder: 'Your password',
                onChange: handleChange('password'),
              },
            ]}
            submitButton="Sign in"
            isLoading={isSubmitting}
            textVariantButton="Don't have an account? Register"
            errorField={serverError}
            onSubmit={handleLoginSubmit}
            goTo={() => router.push('/register')}
          />

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => { setForgotEmail(fields.email); setMode('forgot-password'); setServerError(''); }}
              className="text-sm text-blue-500 hover:underline"
            >
              Forgot your password?
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />
      <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-white" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
