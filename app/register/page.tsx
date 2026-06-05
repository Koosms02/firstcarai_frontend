'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { signup } from '@/lib/recommendations';
import { AuthLeftPanel, MobileLogo } from '@/components/ui/auth-layout';

function validateSaId(id: string): string | null {
  if (!id) return null;
  if (!/^\d+$/.test(id)) return 'Must contain only numbers';
  if (id.length !== 13) return 'Must be 13 digits';
  const yy = parseInt(id.substring(0, 2), 10);
  const mm = parseInt(id.substring(2, 4), 10);
  const dd = parseInt(id.substring(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return 'Invalid date in ID number';
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const date = new Date(year, mm - 1, dd);
  if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd)
    return 'Invalid date in ID number';
  let sum = 0;
  let alternate = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let n = parseInt(id[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  if (sum % 10 !== 0) return 'This ID number doesn\'t look valid — please double-check it.';
  return null;
}

function extractGenderFromId(id: string): 'male' | 'female' | null {
  if (!id || id.length < 10) return null;
  const genderDigits = parseInt(id.substring(6, 10), 10);
  if (isNaN(genderDigits)) return null;
  return genderDigits >= 5000 ? 'male' : 'female';
}

export default function RegisterPage() {
  const router = useRouter();
  const [fields, setFields] = useState({ email: '', password: '' });
  const [signupFields, setSignupFields] = useState({ firstName: '', lastName: '', idNumber: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!signupFields.firstName.trim()) errs.firstName = 'Required';
    if (!signupFields.lastName.trim()) errs.lastName = 'Required';
    if (!fields.email.trim()) errs.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errs.email = 'Invalid email address';
    if (!signupFields.idNumber.trim()) errs.idNumber = 'Required';
    else {
      const idErr = validateSaId(signupFields.idNumber.trim());
      if (idErr) errs.idNumber = idErr;
    }
    if (!fields.password) errs.password = 'Required';
    else if (fields.password.length < 8) errs.password = 'Must be at least 8 characters';
    else if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d])/.test(fields.password))
      errs.password = 'Must include uppercase, lowercase, a number and a symbol';

    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    void (async () => {
      setIsSubmitting(true);
      setServerError('');
      try {
        await signup({
          email: fields.email.trim(),
          password: fields.password,
          firstName: signupFields.firstName.trim(),
          lastName: signupFields.lastName.trim(),
          idNumber: signupFields.idNumber.trim(),
        });
        router.push('/login?registered=1');
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        <MobileLogo />

        <div className="w-96 max-md:w-full flex flex-col gap-4">
          <div>
            <h2 className="font-bold text-3xl text-neutral-800">Create your account</h2>
            <p className="mt-2 text-sm text-neutral-500">Sign up to get personalised car recommendations.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Jane"
                  value={signupFields.firstName}
                  onChange={(e) => { setSignupFields((p) => ({ ...p, firstName: e.target.value })); setErrors((p) => ({ ...p, firstName: '' })); }}
                  className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-neutral-700">Surname <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={signupFields.lastName}
                  onChange={(e) => { setSignupFields((p) => ({ ...p, lastName: e.target.value })); setErrors((p) => ({ ...p, lastName: '' })); }}
                  className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Email address <span className="text-red-500">*</span></label>
              <input
                type="email"
                placeholder="jane@example.co.za"
                value={fields.email}
                onChange={(e) => { setFields((p) => ({ ...p, email: e.target.value })); setErrors((p) => ({ ...p, email: '' })); }}
                className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">SA ID Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                placeholder="0001010000000"
                value={signupFields.idNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                  setSignupFields((p) => ({ ...p, idNumber: val }));
                  setErrors((p) => ({ ...p, idNumber: '' }));
                }}
                className={`h-10 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 ${errors.idNumber ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-blue-400'}`}
              />
              {signupFields.idNumber.length >= 10 && extractGenderFromId(signupFields.idNumber) && (
                <p className="text-xs text-blue-600 font-medium">
                  Gender detected: {extractGenderFromId(signupFields.idNumber) === 'male' ? 'Male' : 'Female'}
                </p>
              )}
              {errors.idNumber && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm-.75 4a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0V5zm.75 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" />
                  </svg>
                  <p className="text-xs text-red-600">{errors.idNumber}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={fields.password}
                  onChange={(e) => { setFields((p) => ({ ...p, password: e.target.value })); setErrors((p) => ({ ...p, password: '' })); }}
                  className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 pr-10 text-sm text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
            </div>

            {serverError && <p className="text-red-500 text-sm">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 h-10 w-full rounded-md bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Create account →'}
            </button>

            <p className="text-sm text-center text-neutral-500 mt-1">
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')} className="text-blue-500 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
