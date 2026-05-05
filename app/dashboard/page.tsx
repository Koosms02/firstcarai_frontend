'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, getUser, isUsingMockData, submitQuestionnaire, type Recommendation } from '@/lib/recommendations';

function formatCurrency(value: number | null) {
  if (value === null) return 'N/A';
  return `R ${Math.round(value).toLocaleString()}`;
}

function parseCurrencyValue(value: string): number {
  const numeric = value.replace(/[^\d.]/g, '');
  return numeric ? parseFloat(numeric) : 0;
}

const BRAND_DISPLAY_NAMES: Record<string, string> = {
  'bmw': 'BMW',
  'mercedes': 'Mercedes-Benz',
  'volkswagen': 'Volkswagen',
  'toyota': 'Toyota',
  'hyundai': 'Hyundai',
  'ford': 'Ford',
  'audi': 'Audi',
  'kia': 'Kia',
  'nissan': 'Nissan',
};

function getBrandDisplayName(value: string): string {
  return BRAND_DISPLAY_NAMES[value.toLowerCase()] ?? value.charAt(0).toUpperCase() + value.slice(1);
}

function carMatchesBrand(make: string, brandValue: string): boolean {
  const makeLower = make.toLowerCase();
  const brandLower = brandValue.toLowerCase();
  // Handle "mercedes" matching "mercedes-benz"
  return makeLower === brandLower || makeLower.includes(brandLower) || brandLower.includes(makeLower);
}

const FIELD_CONFIG: {
  key: string;
  label: string;
  type: 'text' | 'choice';
  options?: { value: string; label: string }[];
}[] = [
  { key: 'first_name', label: 'First name', type: 'text' },
  { key: 'last_name', label: 'Last name', type: 'text' },
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
  {
    key: 'location',
    label: 'Province',
    type: 'choice',
    options: [
      { value: 'Gauteng', label: 'Gauteng' },
      { value: 'Western Cape', label: 'Western Cape' },
      { value: 'KwaZulu-Natal', label: 'KwaZulu-Natal' },
      { value: 'Eastern Cape', label: 'Eastern Cape' },
      { value: 'Limpopo', label: 'Limpopo' },
      { value: 'Mpumalanga', label: 'Mpumalanga' },
      { value: 'North West', label: 'North West' },
      { value: 'Free State', label: 'Free State' },
      { value: 'Northern Cape', label: 'Northern Cape' },
    ],
  },
  { key: 'net_salary', label: 'Monthly salary', type: 'text' },
  { key: 'id_number', label: 'ID number', type: 'text' },
  { key: 'expenses_groceries', label: 'Groceries', type: 'text' },
  { key: 'expenses_accounts', label: 'Accounts', type: 'text' },
  { key: 'expenses_loans', label: 'Loans', type: 'text' },
  { key: 'expenses_other', label: 'Other Expenses', type: 'text' },
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
  { key: 'preferred_brand', label: 'Preferred brand', type: 'text' },
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

function downloadReport(recommendations: Recommendation[], answers: Record<string, string>, budget: number) {
  const lines: string[] = [
    'FirstCarAI — Car Recommendation Report',
    `Generated: ${new Date().toLocaleDateString('en-ZA')}`,
    `Province: ${answers.location ?? 'N/A'}`,
    `Monthly Budget (20%): ${formatCurrency(budget)}`,
    '',
    'TOP CAR RECOMMENDATIONS',
    '='.repeat(50),
  ];

  recommendations.forEach((rec, i) => {
    const affordPct = Math.max(0, Math.min(100, (1 - rec.estimatedMonthlyCost / Math.max(budget, 1)) * 100));
    lines.push('');
    lines.push(`#${i + 1}  ${rec.car.make} ${rec.car.model} (${rec.car.year ?? 'N/A'})`);
    lines.push(`     Price: ${formatCurrency(rec.car.price)}`);
    lines.push(`     Match Score: ${(rec.score * 100).toFixed(0)}%`);
    lines.push(`     Affordability Score: ${affordPct.toFixed(0)}%`);
    lines.push(`     --- Monthly Cost Breakdown ---`);
    lines.push(`     Loan:        ${formatCurrency(rec.loanCost)}`);
    lines.push(`     Insurance:   ${formatCurrency(rec.insuranceCost)}`);
    lines.push(`     Fuel:        ${formatCurrency(rec.fuelCost)}`);
    lines.push(`     Maintenance: ${formatCurrency(rec.maintenanceCost)}`);
    lines.push(`     TOTAL:       ${formatCurrency(rec.estimatedMonthlyCost)}`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'firstcar-recommendations.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function getCreditScoreRating(score: number): { label: string; color: string; bg: string; bar: string } {
  if (score >= 750) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' };
  if (score >= 700) return { label: 'Very Good', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', bar: 'bg-blue-500' };
  if (score >= 650) return { label: 'Good', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', bar: 'bg-teal-500' };
  if (score >= 600) return { label: 'Fair', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', bar: 'bg-amber-400' };
  return { label: 'Poor', color: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' };
}

const PROVINCE_CITY: Record<string, string> = {
  Gauteng: 'Pretoria',
  'Western Cape': 'Cape Town',
  'KwaZulu-Natal': 'Durban',
  'Eastern Cape': 'Gqeberha',
  Limpopo: 'Polokwane',
  Mpumalanga: 'Nelspruit',
  'North West': 'Mahikeng',
  'Free State': 'Bloemfontein',
  'Northern Cape': 'Kimberley',
};

const TRIP_DESTINATIONS = [
  'Pretoria', 'Johannesburg', 'Cape Town', 'Durban', 'Gqeberha',
  'Bloemfontein', 'Polokwane', 'Nelspruit', 'Kimberley', 'Mahikeng',
  'East London', 'George', 'Rustenburg', 'Pietermaritzburg',
];

const DEFAULT_FUEL_EFFICIENCY: Record<string, number> = {
  petrol: 8.0,
  diesel: 6.5,
  hybrid: 4.5,
  electric: 2.0,
};

function getTripDistance(from: string, to: string): number | null {
  if (from === to) return 0;
  const key = [from, to].sort().join('→');
  const distances: Record<string, number> = {
    'Bloemfontein→Cape Town': 1000, 'Bloemfontein→Durban': 620, 'Bloemfontein→East London': 530,
    'Bloemfontein→George': 1060, 'Bloemfontein→Gqeberha': 530, 'Bloemfontein→Johannesburg': 400,
    'Bloemfontein→Kimberley': 180, 'Bloemfontein→Mahikeng': 420, 'Bloemfontein→Nelspruit': 690,
    'Bloemfontein→Pietermaritzburg': 630, 'Bloemfontein→Polokwane': 780, 'Bloemfontein→Pretoria': 490,
    'Bloemfontein→Rustenburg': 440,
    'Cape Town→Durban': 1750, 'Cape Town→East London': 1070, 'Cape Town→George': 430,
    'Cape Town→Gqeberha': 770, 'Cape Town→Johannesburg': 1400, 'Cape Town→Kimberley': 970,
    'Cape Town→Mahikeng': 1400, 'Cape Town→Nelspruit': 1820, 'Cape Town→Pietermaritzburg': 1740,
    'Cape Town→Polokwane': 1780, 'Cape Town→Pretoria': 1460, 'Cape Town→Rustenburg': 1440,
    'Durban→East London': 640, 'Durban→George': 1490, 'Durban→Gqeberha': 640,
    'Durban→Johannesburg': 560, 'Durban→Kimberley': 780, 'Durban→Mahikeng': 870,
    'Durban→Nelspruit': 670, 'Durban→Pietermaritzburg': 80, 'Durban→Polokwane': 900,
    'Durban→Pretoria': 570, 'Durban→Rustenburg': 690,
    'East London→George': 650, 'East London→Gqeberha': 310, 'East London→Johannesburg': 1000,
    'East London→Kimberley': 680, 'East London→Mahikeng': 1020, 'East London→Nelspruit': 1150,
    'East London→Pietermaritzburg': 600, 'East London→Polokwane': 1380, 'East London→Pretoria': 1050,
    'East London→Rustenburg': 1080,
    'George→Gqeberha': 480, 'George→Johannesburg': 1490, 'George→Kimberley': 960,
    'George→Mahikeng': 1440, 'George→Nelspruit': 1720, 'George→Pietermaritzburg': 1490,
    'George→Polokwane': 1870, 'George→Pretoria': 1540, 'George→Rustenburg': 1530,
    'Gqeberha→Johannesburg': 1080, 'Gqeberha→Kimberley': 630, 'Gqeberha→Mahikeng': 1080,
    'Gqeberha→Nelspruit': 1390, 'Gqeberha→Pietermaritzburg': 600, 'Gqeberha→Polokwane': 1360,
    'Gqeberha→Pretoria': 1130, 'Gqeberha→Rustenburg': 1120,
    'Johannesburg→Kimberley': 480, 'Johannesburg→Mahikeng': 270, 'Johannesburg→Nelspruit': 360,
    'Johannesburg→Pietermaritzburg': 600, 'Johannesburg→Polokwane': 330, 'Johannesburg→Pretoria': 58,
    'Johannesburg→Rustenburg': 110,
    'Kimberley→Mahikeng': 390, 'Kimberley→Nelspruit': 820, 'Kimberley→Pietermaritzburg': 820,
    'Kimberley→Polokwane': 790, 'Kimberley→Pretoria': 470, 'Kimberley→Rustenburg': 440,
    'Mahikeng→Nelspruit': 620, 'Mahikeng→Pietermaritzburg': 920, 'Mahikeng→Polokwane': 530,
    'Mahikeng→Pretoria': 290, 'Mahikeng→Rustenburg': 170,
    'Nelspruit→Pietermaritzburg': 640, 'Nelspruit→Polokwane': 450, 'Nelspruit→Pretoria': 360,
    'Nelspruit→Rustenburg': 480,
    'Pietermaritzburg→Polokwane': 950, 'Pietermaritzburg→Pretoria': 610, 'Pietermaritzburg→Rustenburg': 720,
    'Polokwane→Pretoria': 320, 'Polokwane→Rustenburg': 380,
    'Pretoria→Rustenburg': 130,
  };
  return distances[key] ?? null;
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
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Compare state
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  // Trip fuel calculator state
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [tripDestination, setTripDestination] = useState('');
  const [showTripModal, setShowTripModal] = useState(false);

  // Preferred car state
  const [preferredCarId, setPreferredCarIdState] = useState<string | null>(null);
  const [preferredTripDestination, setPreferredTripDestination] = useState('');

  // Credit score
  const [creditScore, setCreditScore] = useState<number | null>(null);

  // Brand filter state
  const [brandFilter, setBrandFilter] = useState<string>('all');

  useEffect(() => {
    const storedId = sessionStorage.getItem('user_id') ?? '';

    if (!storedId) {
      router.replace('/');
      return;
    }

    getUser(storedId).then((user) => {
      // In mock mode getUser always returns null — skip the guard.
      // In real API mode, null means no profile in DB → send back to home.
      if (!user && !isUsingMockData()) {
        sessionStorage.clear();
        router.replace('/');
        return;
      }

      setEmail(sessionStorage.getItem('user_email') ?? '');
      setUserId(storedId);

      const raw = sessionStorage.getItem('recommendations');
      if (raw) setRecommendations(JSON.parse(raw) as Recommendation[]);

      const src = sessionStorage.getItem('result_source');
      if (src === 'api' || src === 'mock') {
        setResultSource(src);
        setHasSubmittedForm(true);
      }

      const rawAnswers = sessionStorage.getItem('form_answers');
      if (rawAnswers) setAnswers(JSON.parse(rawAnswers) as Record<string, string>);

      const savedPreferredId = sessionStorage.getItem('preferred_car_id');
      if (savedPreferredId) setPreferredCarIdState(savedPreferredId);

      const savedCreditScore = sessionStorage.getItem('credit_score');
      if (savedCreditScore) setCreditScore(Number(savedCreditScore));
    });
  }, [router]);

  const budget = parseCurrencyValue(answers.net_salary ?? '') * 0.20;

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
      setHasSubmittedForm(true);
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

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }

  function setPreferredCar(id: string | null) {
    setPreferredCarIdState(id);
    setPreferredTripDestination('');
    if (id) sessionStorage.setItem('preferred_car_id', id);
    else sessionStorage.removeItem('preferred_car_id');
  }

  const compareRecs = recommendations.filter((r) => compareIds.has(r.id));

  const tripCar = recommendations.find((r) => r.id === selectedCarId) ?? null;
  const originCity = answers.city || PROVINCE_CITY[answers.location ?? ''] || null;
  const tripDistance =
    tripCar && originCity && tripDestination
      ? getTripDistance(originCity, tripDestination)
      : null;
  const tripEfficiency = DEFAULT_FUEL_EFFICIENCY[tripCar?.car.fuelType ?? 'petrol'] ?? 8;
  const tripLitres = tripDistance !== null ? (tripDistance / 100) * tripEfficiency : null;
  const tripFuelCost = tripLitres !== null ? Math.round(tripLitres * 22) : null;

  // Preferred car trip calculation
  const preferredCar = recommendations.find((r) => r.id === preferredCarId) ?? null;
  const preferredTripDistance =
    preferredCar && originCity && preferredTripDestination
      ? getTripDistance(originCity, preferredTripDestination)
      : null;
  const preferredTripEfficiency = DEFAULT_FUEL_EFFICIENCY[preferredCar?.car.fuelType ?? 'petrol'] ?? 8;
  const preferredTripLitres =
    preferredTripDistance !== null ? (preferredTripDistance / 100) * preferredTripEfficiency : null;
  const preferredTripFuelCost =
    preferredTripLitres !== null ? Math.round(preferredTripLitres * 22) : null;

  const profileFields = FIELD_CONFIG.filter(({ key }) => answers[key]);

  const selectedBrands = (answers.preferred_brand ?? '').split(',').filter(Boolean);
  const filteredRecommendations =
    brandFilter === 'all' || selectedBrands.length === 0
      ? recommendations
      : recommendations.filter((r) => carMatchesBrand(r.car.make, brandFilter));

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{email}</span>
          <button
            onClick={() => {
              sessionStorage.clear();
              router.push('/');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
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

          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold select-none">
              {answers.first_name
                ? answers.first_name[0].toUpperCase()
                : email
                ? email[0].toUpperCase()
                : '?'}
            </div>

            {/* Name + email + budget */}
            <div className="flex-1 min-w-0">
              {(answers.first_name || answers.last_name) && (
                <p className="text-lg font-semibold text-gray-900 leading-tight">
                  {[answers.first_name, answers.last_name].filter(Boolean).join(' ')}
                </p>
              )}
              <p className="text-sm text-gray-500">{email || '—'}</p>
              {budget > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Monthly budget (20%): <span className="font-semibold text-blue-600">{formatCurrency(budget)}</span>
                </p>
              )}
            </div>

            {/* Credit score badge */}
            {creditScore !== null && (() => {
              const rating = getCreditScoreRating(creditScore);
              const pct = Math.min(100, Math.max(0, ((creditScore - 300) / (850 - 300)) * 100));
              return (
                <div className={`shrink-0 rounded-xl border px-4 py-3 text-center min-w-[110px] ${rating.bg}`}>
                  <p className="text-xs text-gray-500 mb-1">Credit Score</p>
                  <p className={`text-2xl font-bold ${rating.color}`}>{creditScore}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${rating.color}`}>{rating.label}</p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                    <div className={`h-1.5 rounded-full ${rating.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
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
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your car matches</h2>
            <div className="flex items-center gap-3">
              {recommendations.length > 0 && (
                <>
                  {compareIds.size >= 2 && (
                    <button
                      onClick={() => setShowCompare(true)}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
                    >
                      Compare ({compareIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => downloadReport(recommendations, answers, budget)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    ↓ Download report
                  </button>
                </>
              )}
              {resultSource && recommendations.length > 0 && (
                <span className="text-xs text-gray-400">
                  {resultSource === 'mock' ? 'Mock data' : 'Live recommendations'}
                </span>
              )}
            </div>
          </div>

          {compareIds.size > 0 && compareIds.size < 2 && (
            <p className="mb-3 text-xs text-blue-500">
              Select {2 - compareIds.size} more car{2 - compareIds.size > 1 ? 's' : ''} to compare
            </p>
          )}

          {/* Brand filter tabs — only shown when user selected multiple brands */}
          {selectedBrands.length > 0 && recommendations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => setBrandFilter('all')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  brandFilter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                All brands
              </button>
              {selectedBrands.map((brand) => {
                const count = recommendations.filter((r) => carMatchesBrand(r.car.make, brand)).length;
                return (
                  <button
                    key={brand}
                    onClick={() => setBrandFilter(brand)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      brandFilter === brand
                        ? 'bg-blue-500 text-white'
                        : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {getBrandDisplayName(brand)}
                    <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${
                      brandFilter === brand ? 'bg-blue-400 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {recommendations.length === 0 ? (
            hasSubmittedForm ? (
              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50 p-12 flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
                  ⚠
                </div>
                <div>
                  <p className="font-semibold text-gray-900">No vehicles match your affordability range</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your preferences or updating your income details.
                  </p>
                </div>
                <button
                  onClick={startEditing}
                  className="mt-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Adjust preferences
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="14" fill="#dbeafe"/>
                    <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="#2563eb"/>
                    <rect x="6" y="16" width="16" height="4" rx="2" fill="#2563eb"/>
                    <circle cx="10" cy="20.5" r="2" fill="#dbeafe"/>
                    <circle cx="18" cy="20.5" r="2" fill="#dbeafe"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">No recommendations yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Complete the questionnaire so we can find your perfect car.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/form')}
                  className="mt-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Start questionnaire
                </button>
              </div>
            )
          ) : filteredRecommendations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center text-center gap-3">
              <p className="font-semibold text-gray-900">No cars found for {getBrandDisplayName(brandFilter)}</p>
              <p className="text-sm text-gray-500">
                The AI did not return any {getBrandDisplayName(brandFilter)} vehicles in your affordability range.
              </p>
              <button
                onClick={() => setBrandFilter('all')}
                className="mt-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Show all brands
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {filteredRecommendations.map((rec, idx) => {
                const affordPct = budget > 0
                  ? Math.max(0, Math.min(100, (1 - rec.estimatedMonthlyCost / budget) * 100))
                  : null;
                const isSelected = compareIds.has(rec.id);
                const isPreferred = preferredCarId === rec.id;

                return (
                  <article
                    key={rec.id}
                    className={`bg-white rounded-2xl border p-5 transition-all ${
                      isPreferred
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : isSelected
                        ? 'border-blue-400 ring-2 ring-blue-100'
                        : 'border-gray-200'
                    }`}
                  >
                    {/* Rank + badges row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        {isPreferred && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            ★ Preferred
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleCompare(rec.id)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 text-gray-400 hover:border-gray-400'
                        }`}
                      >
                        {isSelected ? '✓ Comparing' : 'Compare'}
                      </button>
                    </div>

                    {/* Car image */}
                    {rec.car.imageUrl && (
                      <div className="relative w-full h-36 -mx-5 mb-3 overflow-hidden" style={{ width: 'calc(100% + 2.5rem)' }}>
                        <img
                          src={rec.car.imageUrl}
                          alt={`${rec.car.make} ${rec.car.model}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
                      </div>
                    )}

                    {/* Match score */}
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">
                      Match {(rec.score * 100).toFixed(0)}%
                    </p>

                    <h3 className="mt-1 text-xl font-semibold text-gray-900">
                      {rec.car.make} {rec.car.model}
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      {rec.car.year ?? 'Year n/a'} · {rec.car.transmission ?? 'n/a'} · {rec.car.fuelType ?? 'n/a'}
                    </p>

                    {/* Affordability score bar */}
                    {affordPct !== null && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500">Affordability</span>
                          <span className={`font-semibold ${affordPct >= 60 ? 'text-green-600' : affordPct >= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                            {affordPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full ${affordPct >= 60 ? 'bg-green-500' : affordPct >= 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${affordPct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <dl className="mt-4 space-y-1.5 text-sm text-gray-700">
                      <div className="flex justify-between font-medium">
                        <dt>Price</dt>
                        <dd>{formatCurrency(rec.car.price)}</dd>
                      </div>
                      <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                        <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Monthly breakdown</p>
                        <div className="flex justify-between">
                          <dt>Loan</dt>
                          <dd>{formatCurrency(rec.loanCost)}</dd>
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
                        <div className="flex justify-between font-semibold border-t border-gray-100 pt-1.5 mt-1.5">
                          <dt>Total</dt>
                          <dd className="text-blue-600">{formatCurrency(rec.estimatedMonthlyCost)}</dd>
                        </div>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (preferredCarId === rec.id) {
                            setPreferredCar(null);
                          } else {
                            setPreferredCar(rec.id);
                          }
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          preferredCarId === rec.id
                            ? 'border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {preferredCarId === rec.id ? '★ My preferred car' : '☆ Set as preferred car'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCarId(rec.id);
                          setTripDestination('');
                          setShowTripModal(true);
                        }}
                        className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                      >
                        Calculate trip fuel cost →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Preferred car + trip planner */}
        {preferredCar && (
          <section className="bg-white rounded-2xl border border-amber-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Your preferred car</h2>
                <p className="text-sm text-gray-500 mt-0.5">Plan your trips and estimate fuel costs for this car.</p>
              </div>
              <button
                onClick={() => setPreferredCar(null)}
                className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
              >
                Clear selection
              </button>
            </div>

            {/* Car summary */}
            <div className="flex items-center gap-4 rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 mb-6">
              {preferredCar.car.imageUrl ? (
                <img
                  src={preferredCar.car.imageUrl}
                  alt={`${preferredCar.car.make} ${preferredCar.car.model}`}
                  className="h-14 w-20 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm select-none">
                  {preferredCar.car.make.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-base">
                  {preferredCar.car.make} {preferredCar.car.model}
                </p>
                <p className="text-sm text-gray-500">
                  {preferredCar.car.year ?? 'Year n/a'} · {preferredCar.car.fuelType ?? 'n/a'} · {preferredCar.car.transmission ?? 'n/a'} · {preferredTripEfficiency} L/100km
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Match score</p>
                <p className="text-sm font-bold text-blue-600">{(preferredCar.score * 100).toFixed(0)}%</p>
              </div>
            </div>

            {/* Trip planner */}
            <div className="flex flex-col gap-5">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Trip fuel calculator</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">From</p>
                  {originCity ? (
                    <p className="text-sm font-medium text-gray-800 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      {originCity}{' '}
                      <span className="text-gray-400 font-normal">({answers.location})</span>
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                      City not set — complete the questionnaire first.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">To</p>
                  <select
                    value={preferredTripDestination}
                    onChange={(e) => setPreferredTripDestination(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select destination city...</option>
                    {TRIP_DESTINATIONS.filter((c) => c !== originCity).map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {preferredTripDistance !== null && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Distance (one-way)</p>
                    <p className="text-base font-semibold text-gray-900">{preferredTripDistance.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Fuel needed</p>
                    <p className="text-base font-semibold text-gray-900">{preferredTripLitres!.toFixed(1)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Fuel price</p>
                    <p className="text-base font-semibold text-gray-900">R22 / L</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Estimated cost</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(preferredTripFuelCost!)}</p>
                  </div>
                </div>
              )}

              {preferredTripDestination && preferredTripDistance === null && (
                <p className="text-sm text-amber-600 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  Distance data not available for this route.
                </p>
              )}
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

      {/* Compare modal */}
      {showCompare && compareRecs.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Compare vehicles</h3>
              <button
                onClick={() => setShowCompare(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 font-medium pb-3 pr-4 w-32">Feature</th>
                    {compareRecs.map((rec, i) => (
                      <th key={rec.id} className="text-left pb-3 pr-4">
                        <span className="font-semibold text-gray-900">#{recommendations.findIndex(r => r.id === rec.id) + 1} {rec.car.make} {rec.car.model}</span>
                        <br />
                        <span className="text-gray-400 font-normal">{rec.car.year}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { label: 'Price', fn: (r: Recommendation) => formatCurrency(r.car.price) },
                    { label: 'Fuel type', fn: (r: Recommendation) => r.car.fuelType ?? 'n/a' },
                    { label: 'Transmission', fn: (r: Recommendation) => r.car.transmission ?? 'n/a' },
                    { label: 'Mileage', fn: (r: Recommendation) => r.car.mileage ? `${r.car.mileage.toLocaleString()} km` : 'n/a' },
                    { label: 'Match score', fn: (r: Recommendation) => `${(r.score * 100).toFixed(0)}%` },
                    { label: 'Affordability', fn: (r: Recommendation) => budget > 0 ? `${Math.max(0, Math.min(100, (1 - r.estimatedMonthlyCost / budget) * 100)).toFixed(0)}%` : 'n/a' },
                    { label: 'Loan / mo', fn: (r: Recommendation) => formatCurrency(r.loanCost) },
                    { label: 'Insurance / mo', fn: (r: Recommendation) => formatCurrency(r.insuranceCost) },
                    { label: 'Fuel / mo', fn: (r: Recommendation) => formatCurrency(r.fuelCost) },
                    { label: 'Maintenance / mo', fn: (r: Recommendation) => formatCurrency(r.maintenanceCost) },
                    { label: 'Total / mo', fn: (r: Recommendation) => formatCurrency(r.estimatedMonthlyCost) },
                  ].map(({ label, fn }) => (
                    <tr key={label}>
                      <td className="py-2.5 pr-4 text-gray-400">{label}</td>
                      {compareRecs.map((rec) => (
                        <td key={rec.id} className="py-2.5 pr-4 font-medium text-gray-800">
                          {fn(rec)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trip Fuel Calculator modal */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Trip Fuel Calculator</h3>
              <button
                onClick={() => setShowTripModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              {tripCar && (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {tripCar.car.make.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {tripCar.car.make} {tripCar.car.model}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tripCar.car.year} · {tripCar.car.fuelType ?? 'n/a'} · {tripEfficiency} L/100km
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">From</p>
                {originCity ? (
                  <p className="text-sm font-medium text-gray-800">
                    {originCity}{' '}
                    <span className="text-gray-400">({answers.location})</span>
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">
                    Province not set — complete the questionnaire first.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">To</p>
                <select
                  value={tripDestination}
                  onChange={(e) => setTripDestination(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select destination city...</option>
                  {TRIP_DESTINATIONS.filter((c) => c !== originCity).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {tripDistance !== null && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-4 flex flex-col gap-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distance (one-way)</span>
                    <span className="font-semibold text-gray-900">{tripDistance.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Fuel needed</span>
                    <span className="font-semibold text-gray-900">{tripLitres!.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                    <span className="font-semibold text-gray-700">Estimated cost</span>
                    <span className="font-bold text-blue-600 text-base">{formatCurrency(tripFuelCost!)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Based on R22/L · one-way trip</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
