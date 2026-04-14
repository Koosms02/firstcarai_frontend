'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, type Recommendation } from '@/lib/recommendations';

function formatCurrency(value: number | null) {
  if (value === null) return 'N/A';
  return `R ${value.toLocaleString()}`;
}

const LABEL: Record<string, string> = {
  gender: 'Gender',
  location: 'City',
  net_salary: 'Monthly salary',
  credit_score: 'Credit score',
  years_licenced: 'Years licenced',
  preferred_brand: 'Preferred brand',
  car_type: 'Car type',
  fuel_type: 'Fuel type',
  transmission: 'Transmission',
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resultSource, setResultSource] = useState<'api' | 'mock' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setEmail(sessionStorage.getItem('user_email') ?? '');
    setUserId(sessionStorage.getItem('user_id') ?? '');

    const raw = sessionStorage.getItem('recommendations');
    if (raw) setRecommendations(JSON.parse(raw) as Recommendation[]);

    const src = sessionStorage.getItem('result_source');
    if (src === 'api' || src === 'mock') setResultSource(src);

    const rawAnswers = sessionStorage.getItem('form_answers');
    if (rawAnswers) setAnswers(JSON.parse(rawAnswers) as Record<string, string>);
  }, []);

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteUser(userId);
      sessionStorage.clear();
      router.push('/');
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete account. Please try again.'
      );
      setIsDeleting(false);
    }
  }

  const profileFields = Object.entries(LABEL).filter(([key]) => answers[key]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#2563eb" />
            <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white" />
            <rect x="6" y="16" width="16" height="4" rx="2" fill="white" />
            <circle cx="10" cy="20.5" r="2" fill="#2563eb" />
            <circle cx="18" cy="20.5" r="2" fill="#2563eb" />
          </svg>
          <span className="text-lg font-bold text-gray-900">FirstCar</span>
        </div>
        <span className="text-sm text-gray-500">{email}</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Profile card */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your profile</h2>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold select-none">
              {email ? email[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{email || '—'}</p>
            </div>
          </div>

          {profileFields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
              {profileFields.map(([key, label]) => (
                <div key={key}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-800 capitalize">
                    {answers[key].replace(/-/g, ' ')}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Your car matches</h2>
              {resultSource && (
                <span className="text-xs text-gray-400">
                  {resultSource === 'mock' ? 'Mock data' : 'Live recommendations'}
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {recommendations.map((rec) => (
                <article
                  key={rec.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                    Match {(rec.score * 100).toFixed(0)}%
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900">
                    {rec.car.make} {rec.car.model}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {rec.car.year ?? 'Year n/a'} · {rec.car.transmission ?? 'n/a'} · {rec.car.fuelType ?? 'n/a'}
                  </p>
                  <dl className="mt-4 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <dt>Price</dt>
                      <dd className="font-medium">{formatCurrency(rec.car.price)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Monthly cost</dt>
                      <dd className="font-medium">{formatCurrency(rec.estimatedMonthlyCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Insurance</dt>
                      <dd>{formatCurrency(rec.insuranceCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Fuel</dt>
                      <dd>{formatCurrency(rec.fuelCost)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Maintenance</dt>
                      <dd>{formatCurrency(rec.maintenanceCost)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Danger zone */}
        <section className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Danger zone</h2>
          <p className="text-sm text-gray-500 mb-4">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Delete account
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-red-600">
                Are you sure? This will permanently delete your account.
              </p>
              {deleteError && (
                <p className="text-sm text-red-500">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                  disabled={isDeleting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
