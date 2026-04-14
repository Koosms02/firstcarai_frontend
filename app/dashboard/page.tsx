'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, getUser, submitQuestionnaire, type Recommendation } from '@/lib/recommendations';

function formatCurrency(value: number | null) {
  if (value === null) return 'N/A';
  return `R ${value.toLocaleString()}`;
}

const FIELD_CONFIG: {
  key: string;
  label: string;
  type: 'text' | 'choice';
  options?: { value: string; label: string }[];
}[] = [
  {
    key: 'gender',
    label: 'Gender',
    type: 'choice',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non-binary', label: 'Non-binary' },
      { value: 'prefer-not-to-say', label: 'Prefer not to say' },
    ],
  },
  { key: 'location', label: 'City', type: 'text' },
  { key: 'net_salary', label: 'Monthly salary', type: 'text' },
  {
    key: 'credit_score',
    label: 'Credit score',
    type: 'choice',
    options: [
      { value: 'below-600', label: 'Below 600 (Poor)' },
      { value: '600-699', label: '600 – 699 (Fair)' },
      { value: '700-749', label: '700 – 749 (Good)' },
      { value: '750-plus', label: '750+ (Excellent)' },
    ],
  },
  {
    key: 'years_licenced',
    label: 'Years licenced',
    type: 'choice',
    options: [
      { value: 'less-than-1', label: 'Less than 1 year' },
      { value: '1-3', label: '1 – 3 years' },
      { value: '3-5', label: '3 – 5 years' },
      { value: '5-plus', label: '5+ years' },
    ],
  },
  {
    key: 'preferred_brand',
    label: 'Preferred brand',
    type: 'text',
  },
  {
    key: 'car_type',
    label: 'Car type',
    type: 'choice',
    options: [
      { value: 'hatchback', label: 'Hatchback' },
      { value: 'sedan', label: 'Sedan' },
      { value: 'suv', label: 'SUV' },
      { value: 'bakkie', label: 'Bakkie' },
    ],
  },
  {
    key: 'fuel_type',
    label: 'Fuel type',
    type: 'choice',
    options: [
      { value: 'petrol', label: 'Petrol' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'electric', label: 'Electric' },
    ],
  },
  {
    key: 'transmission',
    label: 'Transmission',
    type: 'choice',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'automatic', label: 'Automatic' },
    ],
  },
];

function displayValue(key: string, value: string, config: typeof FIELD_CONFIG[number]) {
  if (config.type === 'choice' && config.options) {
    const match = config.options.find((o) => o.value === value);
    return match ? match.label : value.replace(/-/g, ' ');
  }
  return value;
}

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

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const storedId = sessionStorage.getItem('user_id') ?? '';

    if (!storedId) {
      router.replace('/');
      return;
    }

    getUser(storedId).then((user) => {
      if (!user) {
        sessionStorage.clear();
        router.replace('/');
        return;
      }

      setEmail(sessionStorage.getItem('user_email') ?? '');
      setUserId(storedId);

      const raw = sessionStorage.getItem('recommendations');
      if (raw) setRecommendations(JSON.parse(raw) as Recommendation[]);

      const src = sessionStorage.getItem('result_source');
      if (src === 'api' || src === 'mock') setResultSource(src);

      const rawAnswers = sessionStorage.getItem('form_answers');
      if (rawAnswers) setAnswers(JSON.parse(rawAnswers) as Record<string, string>);
    });
  }, [router]);

  function startEditing() {
    setEditedAnswers({ ...answers });
    setSaveError('');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError('');
  }

  async function saveEdits() {
    setIsSaving(true);
    setSaveError('');
    try {
      const result = await submitQuestionnaire(editedAnswers, userId, email);
      setAnswers(editedAnswers);
      setRecommendations(result.recommendations);
      setResultSource(result.source);
      sessionStorage.setItem('form_answers', JSON.stringify(editedAnswers));
      sessionStorage.setItem('recommendations', JSON.stringify(result.recommendations));
      sessionStorage.setItem('result_source', result.source);
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }

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

  const profileFields = FIELD_CONFIG.filter(({ key }) => answers[key]);

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your profile</h2>
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.753.445l-3.026.877a.75.75 0 0 1-.929-.929l.877-3.026a1.75 1.75 0 0 1 .445-.753l8.436-8.784Z" fill="currentColor"/>
                </svg>
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdits}
                  disabled={isSaving}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save & refresh'}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold select-none">
              {email ? email[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="font-medium text-gray-900">{email || '—'}</p>
            </div>
          </div>

          {saveError && (
            <p className="mb-4 text-sm text-red-500">{saveError}</p>
          )}

          {profileFields.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {profileFields.map((config) => (
                <div key={config.key}>
                  <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {config.label}
                  </dt>
                  {isEditing ? (
                    config.type === 'choice' && config.options ? (
                      <select
                        value={editedAnswers[config.key] ?? ''}
                        onChange={(e) =>
                          setEditedAnswers((prev) => ({ ...prev, [config.key]: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {config.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editedAnswers[config.key] ?? ''}
                        onChange={(e) =>
                          setEditedAnswers((prev) => ({ ...prev, [config.key]: e.target.value }))
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    )
                  ) : (
                    <dd className="text-sm font-medium text-gray-800">
                      {displayValue(config.key, answers[config.key], config)}
                    </dd>
                  )}
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
