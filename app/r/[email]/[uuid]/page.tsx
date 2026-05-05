'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/recommendations';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();

  const email = decodeURIComponent(params.email as string);
  const uuid = params.uuid as string;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, uuid, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#2563eb"/>
            <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
            <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
            <circle cx="10" cy="20.5" r="2" fill="#2563eb"/>
            <circle cx="18" cy="20.5" r="2" fill="#2563eb"/>
          </svg>
          <span className="text-lg font-bold text-gray-900">FirstCar</span>
        </div>

        {done ? (
          /* Success state */
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 text-green-600">
                <circle cx="10" cy="10" r="10" fill="currentColor" fillOpacity="0.15"/>
                <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm font-medium text-green-700">
                Password reset successfully!
              </p>
            </div>
            <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
            <button
              onClick={() => router.push('/')}
              className="h-10 w-full rounded-lg bg-blue-500 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
            >
              Go to sign in →
            </button>
          </div>
        ) : (
          /* Reset form */
          <>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
              <p className="mt-1 text-sm text-gray-500">
                Resetting password for <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">New password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">Confirm new password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 flex items-center gap-1.5">
                  <span>⚠</span> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg bg-blue-500 text-sm font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Resetting…' : 'Reset password →'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-blue-500 text-center hover:underline"
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
