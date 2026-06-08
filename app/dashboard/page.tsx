'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, friendlyError, generateAiRecommendations, getUser, isUsingMockData, setPreferredCar as setPreferredCarApi, submitQuestionnaire, type Recommendation } from '@/lib/recommendations';

function formatCurrency(value: number | null) {
  if (value === null) return 'N/A';
  return `R ${Math.round(value).toLocaleString()}`;
}

function parseCurrencyValue(value: string): number {
  const numeric = value.replace(/[^\d.]/g, '');
  return numeric ? parseFloat(numeric) : 0;
}

function renderChatMessage(content: string, isUser: boolean) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-0.5 my-1">
          {listItems.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      listItems.push(trimmed.replace(/^[-•]\s+/, ''));
    } else {
      flushList(`list-${idx}`);
      if (!trimmed) {
        elements.push(<div key={idx} className="h-1" />);
      } else {
        elements.push(<p key={idx} className="leading-relaxed">{renderInline(trimmed)}</p>);
      }
    }
  });
  flushList('list-end');
  return <div className={`text-sm space-y-1 ${isUser ? 'text-white' : 'text-gray-800'}`}>{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  );
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


function getCreditScoreRating(score: number): { label: string; color: string; bg: string; bar: string } {
  if (score >= 750) return { label: 'Excellent', color: 'text-green-700', bg: 'bg-green-50 border-green-200', bar: 'bg-green-500' };
  if (score >= 700) return { label: 'Very Good', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', bar: 'bg-blue-500' };
  if (score >= 650) return { label: 'Good', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', bar: 'bg-teal-500' };
  if (score >= 600) return { label: 'Fair', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', bar: 'bg-amber-400' };
  return { label: 'Poor', color: 'text-red-700', bg: 'bg-red-50 border-red-200', bar: 'bg-red-500' };
}

function getCreditScoreExplanation(score: number): { riskLevel: string; message: string; impact: string } {
  if (score >= 700) {
    return {
      riskLevel: 'Low Risk',
      message: 'Excellent credit profile. You qualify for the widest range of vehicles with the best interest rates.',
      impact: 'Lower insurance premiums and better loan terms, meaning more affordable monthly payments.',
    };
  }
  if (score >= 600) {
    return {
      riskLevel: 'Medium Risk',
      message: 'Good credit profile. Most vehicles remain affordable with competitive interest rates.',
      impact: 'Standard insurance rates apply. You may see slightly higher interest rates on loans.',
    };
  }
  return {
    riskLevel: 'High Risk',
    message: 'Higher insurance and affordability risk. Consider improving your financial profile.',
    impact: 'Higher insurance premiums and loan interest rates will increase your monthly costs significantly.',
  };
}

function computeBadges(rec: Recommendation, allRecs: Recommendation[], budget: number): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  if (allRecs.length === 0) return badges;

  // Best Match — highest score
  const maxScore = Math.max(...allRecs.map((r) => r.score));
  if (rec.score === maxScore && rec.score > 0) {
    badges.push({ label: 'Best Match', color: 'bg-blue-500 text-white' });
  }

  // Most Affordable — lowest monthly cost
  const minCost = Math.min(...allRecs.map((r) => r.estimatedMonthlyCost));
  if (rec.estimatedMonthlyCost === minCost && allRecs.length > 1) {
    badges.push({ label: 'Most Affordable', color: 'bg-green-500 text-white' });
  }

  // Lowest Insurance
  const minInsurance = Math.min(...allRecs.map((r) => r.insuranceCost));
  if (rec.insuranceCost === minInsurance && rec.insuranceCost > 0 && allRecs.length > 1) {
    badges.push({ label: 'Lowest Insurance', color: 'bg-teal-500 text-white' });
  }

  // Best Fuel Economy — lowest fuel cost
  const minFuel = Math.min(...allRecs.map((r) => r.fuelCost));
  if (rec.fuelCost === minFuel && rec.fuelCost > 0 && allRecs.length > 1) {
    badges.push({ label: 'Best Fuel Economy', color: 'bg-emerald-500 text-white' });
  }

  // Family Friendly — SUVs and bakkies with good scores
  const carType = (rec.car.model || '').toLowerCase();
  if (/suv|crossover|fortuner|tucson|sportage|rav4|x3|tiguan|sorento/i.test(carType) || /suv/i.test(rec.car.make)) {
    badges.push({ label: 'Family Friendly', color: 'bg-purple-500 text-white' });
  }

  // Budget Saver — well under budget
  if (budget > 0 && rec.estimatedMonthlyCost < budget * 0.75) {
    badges.push({ label: 'Budget Saver', color: 'bg-amber-500 text-white' });
  }

  return badges;
}

function computeConfidenceScore(rec: Recommendation, budget: number, creditScore: number | null, yearsLicenced: string): number {
  let score = 0;
  let factors = 0;

  // Affordability (40% weight)
  if (budget > 0) {
    const affordRatio = Math.max(0, 1 - rec.estimatedMonthlyCost / budget);
    score += affordRatio * 40;
    factors += 40;
  }

  // Match score from API (25% weight)
  score += rec.score * 25;
  factors += 25;

  // Credit score factor (20% weight)
  if (creditScore !== null) {
    const creditFactor = Math.min(1, Math.max(0, (creditScore - 300) / 550));
    score += creditFactor * 20;
    factors += 20;
  }

  // Driving experience (15% weight)
  const expMap: Record<string, number> = { 'less-than-1': 0.3, '1-3': 0.5, '3-5': 0.75, '5-plus': 1 };
  const expFactor = expMap[yearsLicenced] ?? 0.5;
  score += expFactor * 15;
  factors += 15;

  return factors > 0 ? Math.round((score / factors) * 100) : Math.round(rec.score * 100);
}

function getRecommendationExplanation(rec: Recommendation, budget: number, creditScore: number | null): string {
  const parts: string[] = [];

  if (budget > 0) {
    const pctOfBudget = Math.round((rec.estimatedMonthlyCost / budget) * 100);
    if (pctOfBudget <= 75) parts.push('Well within your monthly budget');
    else if (pctOfBudget <= 90) parts.push('Fits within your monthly budget');
    else if (pctOfBudget <= 100) parts.push('Close to your budget limit');
    else parts.push('Slightly above your budget');
  }

  if (rec.insuranceCost > 0) {
    const avgInsurance = 800; // rough SA average
    if (rec.insuranceCost < avgInsurance * 0.7) parts.push('low insurance risk');
    else if (rec.insuranceCost < avgInsurance) parts.push('reasonable insurance cost');
  }

  if (rec.fuelCost > 0) {
    const avgFuel = 1200;
    if (rec.fuelCost < avgFuel * 0.7) parts.push('excellent fuel efficiency');
    else if (rec.fuelCost < avgFuel) parts.push('good fuel efficiency');
  }

  if (rec.score >= 0.85) parts.push('strong preference match');
  else if (rec.score >= 0.7) parts.push('matches your preferences');

  if (creditScore !== null && creditScore >= 700) {
    parts.push('your credit score qualifies for competitive rates');
  }

  if (parts.length === 0) return 'Recommended based on your profile.';
  return parts[0] + (parts.length > 1 ? ', has ' + parts.slice(1).join(', ') : '') + '.';
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


type SearchLogEntry = {
  id: string;
  timestamp: number;
  source: 'api' | 'mock';
  resultCount: number;
  budget: number;
  filters: { brand: string; carType: string; fuelType: string; transmission: string };
  recommendations?: Array<{ make: string; model: string; monthlyCost: number; score: number }>;
};

function loadSearchLog(): SearchLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem('search_log') ?? '[]') as SearchLogEntry[];
  } catch { return []; }
}

function appendSearchLog(entry: SearchLogEntry) {
  const log = loadSearchLog();
  log.unshift(entry);
  localStorage.setItem('search_log', JSON.stringify(log.slice(0, 50)));
}

type Filters = {
  fuelType: string;
  transmission: string;
  carType: string;
  maxMonthlyCost: string;
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
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);

  // View state
  const [activeView, setActiveView] = useState<'dashboard' | 'profile' | 'logs'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchLog, setSearchLog] = useState<SearchLogEntry[]>([]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Preferred car state
  const [preferredCarId, setPreferredCarIdState] = useState<string | null>(null);

  // Preferred car AI advisor chat
  const carChatRef = useRef<HTMLElement>(null);
  const [carChatMessages, setCarChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [carChatInput, setCarChatInput] = useState('');
  const [carChatLoading, setCarChatLoading] = useState(false);

  // Credit score
  const [creditScore, setCreditScore] = useState<number | null>(null);

  // Brand filter state
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // UX-025: Advanced filters
  const [filters, setFilters] = useState<Filters>({ fuelType: 'all', transmission: 'all', carType: 'all', maxMonthlyCost: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  // UX-023: Comparison tool
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompareModal, setShowCompareModal] = useState(false);

  // UX-016: Credit score info panel
  const [showCreditInfo, setShowCreditInfo] = useState(false);

  // UX-017: Affordability breakdown
  const [showAffordability, setShowAffordability] = useState(false);

  // UX-019: Show rejected vehicles
  const [showRejected, setShowRejected] = useState(false);

  useEffect(() => {
    const storedId = sessionStorage.getItem('user_id') ?? '';

    if (!storedId) {
      router.replace('/login');
      return;
    }

    getUser(storedId).then((user) => {
      if (!user && !isUsingMockData()) {
        sessionStorage.clear();
        router.replace('/login');
        return;
      }

      setEmail(sessionStorage.getItem('user_email') ?? '');
      setUserId(storedId);
      loadDataFromStorage();
    });
  }, [router]);

  function normalizeRecs(recs: Recommendation[]): Recommendation[] {
    return recs.map((r) => {
      const total = r.loanCost + r.insuranceCost + r.fuelCost + r.maintenanceCost;
      return total > 0 ? { ...r, estimatedMonthlyCost: total } : r;
    });
  }

  function loadDataFromStorage() {
    const raw = sessionStorage.getItem('recommendations');
    const recs = raw ? normalizeRecs(JSON.parse(raw) as Recommendation[]) : [];
    if (recs.length > 0) setRecommendations(recs);

    const src = sessionStorage.getItem('result_source');
    if (src === 'api' || src === 'mock') {
      setResultSource(src);
      setHasSubmittedForm(true);
    }

    const rawAnswers = sessionStorage.getItem('form_answers');
    const parsedAnswers = rawAnswers ? (JSON.parse(rawAnswers) as Record<string, string>) : {};
    if (rawAnswers) setAnswers(parsedAnswers);

    const preferredFromRecs = recs.find((r) => r.isPreferred)?.id ?? null;
    const savedPreferredId =
      preferredFromRecs ??
      sessionStorage.getItem('preferred_car_id') ??
      localStorage.getItem('preferred_car_id');
    if (savedPreferredId) setPreferredCarIdState(savedPreferredId);

    const savedCreditScore = sessionStorage.getItem('credit_score');
    if (savedCreditScore) setCreditScore(Number(savedCreditScore));

    if (recs.length > 0 && (src === 'api' || src === 'mock')) {
      const netSalary = parsedAnswers.net_salary
        ? parseFloat(parsedAnswers.net_salary.replace(/[^\d.]/g, '')) || 0
        : 0;
      const entry: SearchLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        source: src,
        resultCount: recs.length,
        budget: netSalary * 0.2,
        filters: {
          brand: parsedAnswers.preferred_brand ?? 'Any',
          carType: parsedAnswers.car_type ?? 'Any',
          fuelType: parsedAnswers.fuel_type ?? 'Any',
          transmission: parsedAnswers.transmission ?? 'Any',
        },
        recommendations: recs.slice(0, 5).map((r) => ({
          make: r.car.make,
          model: r.car.model,
          monthlyCost: r.estimatedMonthlyCost,
          score: r.score,
        })),
      };
      appendSearchLog(entry);
    }

    setSearchLog(loadSearchLog());
  }

  const budget = parseCurrencyValue(answers.net_salary ?? '') * 0.20;

  const netSalary = parseCurrencyValue(answers.net_salary ?? '');
  const expGroceries = parseCurrencyValue(answers.expenses_groceries ?? '');
  const expAccounts = parseCurrencyValue(answers.expenses_accounts ?? '');
  const expLoans = parseCurrencyValue(answers.expenses_loans ?? '');
  const expOther = parseCurrencyValue(answers.expenses_other ?? '');
  const totalExpenses = expGroceries + expAccounts + expLoans + expOther;
  const disposableIncome = netSalary - totalExpenses;

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
      sessionStorage.setItem('form_answers', JSON.stringify(editedAnswers));
      sessionStorage.setItem('credit_score', String(result.creditScore));

      const resolvedUserId = result.userId ?? userId;
      const aiPayload = resolvedUserId
        ? { userId: resolvedUserId }
        : {
            netSalary: parseFloat((editedAnswers.net_salary ?? '0').replace(/[^\d.]/g, '')) || 0,
            creditScore: result.creditScore,
            location: editedAnswers.location,
          };
      const aiRecs = normalizeRecs(await generateAiRecommendations(aiPayload));
      setRecommendations(aiRecs);
      setResultSource('api');
      setHasSubmittedForm(true);
      sessionStorage.setItem('recommendations', JSON.stringify(aiRecs));
      sessionStorage.setItem('result_source', 'ai');
      setIsEditing(false);
    } catch (err) {
      setSaveError(friendlyError(err));
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
      setDeleteError(friendlyError(err));
      setIsDeleting(false);
    }
  }

  function buildFinancialContext() {
    return {
      netSalary,
      expenses: {
        groceries: expGroceries,
        accounts: expAccounts,
        loans: expLoans,
        other: expOther,
      },
      totalExpenses,
      disposableIncome,
      carBudget: netSalary * 0.2,
      dtiRatio: netSalary > 0 ? totalExpenses / netSalary : 0,
      creditScore,
      location: answers.location ?? '',
    };
  }

  function setPreferredCar(id: string | null) {
    setPreferredCarIdState(id);
    setCarChatMessages([]);
    setCarChatInput('');
    if (id) {
      sessionStorage.setItem('preferred_car_id', id);
      localStorage.setItem('preferred_car_id', id);
      const rec = recommendations.find((r) => r.id === id);
      if (rec) localStorage.setItem('preferred_car_snapshot', JSON.stringify(rec));
      void setPreferredCarApi(id).catch(() => { /* silent fail */ });
      void startCarAdvisorChat(id, rec ?? null);
      setTimeout(() => {
        carChatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      sessionStorage.removeItem('preferred_car_id');
      localStorage.removeItem('preferred_car_id');
      localStorage.removeItem('preferred_car_snapshot');
    }
  }

  function buildCarPayload(rec: typeof recommendations[0]) {
    return {
      make: rec.car.make,
      model: rec.car.model,
      year: rec.car.year,
      price: rec.car.price,
      fuelType: rec.car.fuelType,
      transmission: rec.car.transmission,
      mileage: rec.car.mileage,
      loanCost: rec.loanCost,
      insuranceCost: rec.insuranceCost,
      fuelCost: rec.fuelCost,
      maintenanceCost: rec.maintenanceCost,
      estimatedMonthlyCost: rec.estimatedMonthlyCost,
    };
  }

  type AdvisorAction =
    | { type: 'update_expenses'; groceries?: number; accounts?: number; loans?: number; other?: number }
    | { type: 'update_profile'; netSalary?: number; location?: string; yearsLicensed?: number }
    | { type: 'search_cars'; budget: number; carType?: string; fuelType?: string; transmission?: string };

  async function callAdvisor(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    rec: typeof recommendations[0] | null,
  ): Promise<{ reply: string; actions: AdvisorAction[] }> {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
    const body: Record<string, unknown> = {
      messages,
      financialContext: buildFinancialContext(),
    };
    if (rec) body.preferredCar = buildCarPayload(rec);
    const res = await fetch(`${API_BASE}/ai-advisor/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json() as { reply?: string; actions?: AdvisorAction[]; error?: string };
    if (data.error) throw new Error(data.error);
    return { reply: data.reply ?? '', actions: data.actions ?? [] };
  }

  async function applyActions(actions: AdvisorAction[]) {
    for (const action of actions) {
      if (action.type === 'update_expenses') {
        setAnswers((prev) => {
          const next = { ...prev };
          if (action.groceries !== undefined) next.expenses_groceries = String(action.groceries);
          if (action.accounts !== undefined) next.expenses_accounts = String(action.accounts);
          if (action.loans !== undefined) next.expenses_loans = String(action.loans);
          if (action.other !== undefined) next.expenses_other = String(action.other);
          sessionStorage.setItem('form_answers', JSON.stringify(next));
          return next;
        });
      } else if (action.type === 'update_profile') {
        setAnswers((prev) => {
          const next = { ...prev };
          if (action.netSalary !== undefined) next.net_salary = String(action.netSalary);
          if (action.location !== undefined) next.location = action.location;
          if (action.yearsLicensed !== undefined) next.years_licenced = String(action.yearsLicensed);
          sessionStorage.setItem('form_answers', JSON.stringify(next));
          return next;
        });
      } else if (action.type === 'search_cars') {
        setCarChatLoading(true);
        try {
          const recs = normalizeRecs(await generateAiRecommendations({
            netSalary,
            creditScore: creditScore ?? 650,
            location: answers.location,
          }));
          setRecommendations(recs);
          sessionStorage.setItem('recommendations', JSON.stringify(recs));
          sessionStorage.setItem('result_source', 'api');
        } catch {
          // search failure is non-fatal
        } finally {
          setCarChatLoading(false);
        }
      }
    }
  }

  async function startCarAdvisorChat(_id: string, rec: typeof recommendations[0] | null) {
    if (!rec) return;
    setCarChatLoading(true);
    try {
      const { reply, actions } = await callAdvisor([], rec);
      setCarChatMessages([{ role: 'assistant', content: reply }]);
      if (actions.length > 0) await applyActions(actions);
    } catch {
      setCarChatMessages([{ role: 'assistant', content: "Hi! I'm here to help you plan for this car. What would you like to know?" }]);
    } finally {
      setCarChatLoading(false);
    }
  }

  async function sendCarChat(overrideText?: string) {
    const text = (overrideText ?? carChatInput).trim();
    if (!text || carChatLoading) return;
    const userMsg = { role: 'user' as const, content: text };
    const nextMessages = [...carChatMessages, userMsg];
    setCarChatMessages(nextMessages);
    setCarChatInput('');
    setCarChatLoading(true);
    try {
      const { reply, actions } = await callAdvisor(nextMessages, preferredCar);
      setCarChatMessages([...nextMessages, { role: 'assistant', content: reply }]);
      if (actions.length > 0) await applyActions(actions);
    } catch {
      setCarChatMessages([...nextMessages, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setCarChatLoading(false);
    }
  }

  // UX-023: Toggle comparison
  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }

  // UX-024: Download PDF report
  function downloadReport() {
    const w = window.open('', '_blank');
    if (!w) return;

    const csExplanation = creditScore !== null ? getCreditScoreExplanation(creditScore) : null;

    const recRows = recommendations.map((rec) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${rec.car.make} ${rec.car.model}</td>
        <td style="padding:8px;border:1px solid #ddd;">${rec.car.year ?? '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(rec.car.price)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(rec.loanCost)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(rec.insuranceCost)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(rec.fuelCost)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatCurrency(rec.maintenanceCost)}</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${formatCurrency(rec.estimatedMonthlyCost)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${Math.round(rec.score * 100)}%</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html><head><title>FirstCar Recommendation Report</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #333; }
  h1 { color: #2563eb; margin-bottom: 4px; }
  h2 { color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 32px; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
  .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; }
  .summary-card .value { font-size: 24px; font-weight: bold; color: #1e40af; }
  .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: #2563eb; color: white; padding: 10px 8px; text-align: left; }
  .breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .breakdown-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 10px; } }
</style></head><body>
<h1>FirstCar Recommendation Report</h1>
<p style="color:#64748b;">Generated on ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<p>Prepared for: <strong>${[answers.first_name, answers.last_name].filter(Boolean).join(' ') || email}</strong></p>

<div class="summary">
  <div class="summary-card"><div class="label">Credit Score</div><div class="value">${creditScore ?? 'N/A'}</div></div>
  <div class="summary-card"><div class="label">Monthly Budget</div><div class="value">${formatCurrency(budget)}</div></div>
  <div class="summary-card"><div class="label">Vehicles Found</div><div class="value">${recommendations.length}</div></div>
</div>

${creditScore !== null && csExplanation ? `
<h2>Credit Score Analysis</h2>
<p><strong>Score:</strong> ${creditScore} — <strong>${csExplanation.riskLevel}</strong></p>
<p>${csExplanation.message}</p>
<p><em>${csExplanation.impact}</em></p>
` : ''}

<h2>Affordability Breakdown</h2>
<div class="breakdown">
  <div>
    <div class="breakdown-item"><span>Net Monthly Salary</span><span><strong>${formatCurrency(netSalary)}</strong></span></div>
    <div class="breakdown-item"><span>Groceries</span><span>${formatCurrency(expGroceries)}</span></div>
    <div class="breakdown-item"><span>Accounts</span><span>${formatCurrency(expAccounts)}</span></div>
    <div class="breakdown-item"><span>Loans</span><span>${formatCurrency(expLoans)}</span></div>
    <div class="breakdown-item"><span>Other Expenses</span><span>${formatCurrency(expOther)}</span></div>
  </div>
  <div>
    <div class="breakdown-item"><span>Total Expenses</span><span><strong>${formatCurrency(totalExpenses)}</strong></span></div>
    <div class="breakdown-item"><span>Disposable Income</span><span><strong>${formatCurrency(disposableIncome)}</strong></span></div>
    <div class="breakdown-item"><span>Car Budget (20% of salary)</span><span style="color:#2563eb;font-weight:bold;">${formatCurrency(budget)}</span></div>
  </div>
</div>

<h2>Recommended Vehicles</h2>
<table>
  <thead><tr>
    <th>Vehicle</th><th>Year</th><th>Price</th><th>Loan</th><th>Insurance</th><th>Fuel</th><th>Maintenance</th><th>Total/mo</th><th>Match</th>
  </tr></thead>
  <tbody>${recRows}</tbody>
</table>

<div class="footer">
  <p>This report is for informational purposes only. Actual costs may vary based on lending institution, insurance provider, and market conditions.</p>
  <p>FirstCar &mdash; Your smart car recommendation partner</p>
</div>
</body></html>`;

    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }

  const preferredCar = recommendations.find((r) => r.id === preferredCarId) ?? null;

  const EDITABLE_KEYS = new Set([
  'first_name', 'last_name',
  'net_salary',
  'expenses_groceries', 'expenses_accounts', 'expenses_loans', 'expenses_other',
  'years_licenced',
]);

const profileFields = FIELD_CONFIG.filter(({ key }) => answers[key]);

  const selectedBrands = (answers.preferred_brand ?? '').split(',').filter(Boolean);

  // UX-025: Apply all filters
  const filteredRecommendations = recommendations.filter((r) => {
    if (brandFilter !== 'all' && selectedBrands.length > 0 && !carMatchesBrand(r.car.make, brandFilter)) return false;
    if (filters.fuelType !== 'all' && r.car.fuelType && r.car.fuelType.toLowerCase() !== filters.fuelType) return false;
    if (filters.transmission !== 'all' && r.car.transmission && r.car.transmission.toLowerCase() !== filters.transmission) return false;
    if (filters.maxMonthlyCost !== 'all') {
      const max = parseInt(filters.maxMonthlyCost);
      if (r.estimatedMonthlyCost > max) return false;
    }
    return true;
  });

  // UX-019: Compute rejected vehicles (over budget)
  const rejectedVehicles = recommendations.length > 0 && budget > 0
    ? recommendations
        .filter((r) => r.estimatedMonthlyCost > budget)
        .map((r) => ({
          ...r,
          reason: `Exceeds budget by ${formatCurrency(r.estimatedMonthlyCost - budget)}/mo`,
        }))
    : [];

  const bestMatchScore = recommendations.length > 0 ? Math.max(...recommendations.map((r) => r.score)) : 0;

  // Vehicles selected for comparison
  const compareRecs = recommendations.filter((r) => compareIds.has(r.id));

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:translate-x-0 md:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#2563eb" />
              <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white" />
              <rect x="6" y="16" width="16" height="4" rx="2" fill="white" />
              <circle cx="10" cy="20.5" r="2" fill="#2563eb" />
              <circle cx="18" cy="20.5" r="2" fill="#2563eb" />
            </svg>
            <span className="text-base font-bold text-gray-900">FirstCar</span>
          </div>
          <p className="text-xs text-gray-400 truncate">{email}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <button
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left w-full ${
              activeView === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.8"/>
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => { setActiveView('profile'); setSidebarOpen(false); }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left w-full ${
              activeView === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" fill="currentColor" opacity="0.8"/>
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8"/>
            </svg>
            User Profile
          </button>
          <button
            onClick={() => { setActiveView('logs'); setSidebarOpen(false); setSearchLog(loadSearchLog()); }}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition-colors text-left w-full ${
              activeView === 'logs' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="3" rx="1" fill="currentColor" opacity="0.7"/>
              <rect x="2" y="6.5" width="12" height="3" rx="1" fill="currentColor" opacity="0.5"/>
              <rect x="2" y="11" width="8" height="3" rx="1" fill="currentColor" opacity="0.35"/>
            </svg>
            History
          </button>
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-gray-100 flex flex-col gap-1">
          {!userId && (
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors text-left w-full"
            >
              Sign Up to Save
            </button>
          )}
          <button
            onClick={() => { sessionStorage.clear(); router.push('/'); }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors text-left w-full"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {userId ? 'Logout' : 'Exit'}
          </button>
          {userId && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left w-full"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete Account
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile top header */}
        <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="14" fill="#2563eb" />
              <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white" />
              <rect x="6" y="16" width="16" height="4" rx="2" fill="white" />
              <circle cx="10" cy="20.5" r="2" fill="#2563eb" />
              <circle cx="18" cy="20.5" r="2" fill="#2563eb" />
            </svg>
            <span className="text-base font-bold text-gray-900">FirstCar</span>
          </div>
          <div className="w-9" />
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 flex flex-col gap-6 md:gap-8 pb-24 md:pb-10">

          {activeView === 'logs' ? (
            /* ── UX-021: Recommendation History view ── */
            <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recommendation History</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Track your recommendation assessments and compare results over time</p>
                </div>
                {searchLog.length > 0 && (
                  <button
                    onClick={() => { localStorage.removeItem('search_log'); setSearchLog([]); }}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {searchLog.length === 0 ? (
                <div className="flex flex-col items-center text-center py-12 gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="2" width="12" height="3" rx="1" fill="#9ca3af"/>
                      <rect x="2" y="6.5" width="12" height="3" rx="1" fill="#9ca3af" opacity="0.6"/>
                      <rect x="2" y="11" width="8" height="3" rx="1" fill="#9ca3af" opacity="0.35"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">No recommendation history yet. Complete the questionnaire to start tracking your recommendations.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {searchLog.map((entry, entryIdx) => {
                    const date = new Date(entry.timestamp);
                    const timeAgo = (() => {
                      const secs = Math.floor((Date.now() - entry.timestamp) / 1000);
                      if (secs < 60) return 'Just now';
                      if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
                      if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
                      return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
                    })();

                    // Compare with previous entry
                    const prevEntry = searchLog[entryIdx + 1];
                    const budgetChange = prevEntry ? entry.budget - prevEntry.budget : 0;
                    const countChange = prevEntry ? entry.resultCount - prevEntry.resultCount : 0;

                    return (
                      <div key={entry.id} className="rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden">
                        <div className="flex items-start gap-4 p-4">
                          <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${entry.source === 'api' ? 'bg-green-500' : 'bg-blue-400'}`}>
                            {entry.source === 'api' ? 'API' : 'AI'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-800">
                                {entry.resultCount} car{entry.resultCount !== 1 ? 's' : ''} found
                                {countChange !== 0 && (
                                  <span className={`ml-2 text-xs font-medium ${countChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    ({countChange > 0 ? '+' : ''}{countChange} vs previous)
                                  </span>
                                )}
                              </p>
                              <span className="text-xs text-gray-400 shrink-0">{timeAgo}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1.5">
                              Budget: <span className="font-medium text-gray-700">{formatCurrency(entry.budget)}/mo</span>
                              {budgetChange !== 0 && (
                                <span className={`ml-1 ${budgetChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  ({budgetChange > 0 ? '+' : ''}{formatCurrency(budgetChange)})
                                </span>
                              )}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(entry.filters).map(([k, v]) =>
                                v && v !== 'Any' ? (
                                  <span key={k} className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 text-xs capitalize">{v}</span>
                                ) : null
                              )}
                              {Object.values(entry.filters).every((v) => !v || v === 'Any') && (
                                <span className="text-xs text-gray-400">No filters applied</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Show top recommendations from this search */}
                        {entry.recommendations && entry.recommendations.length > 0 && (
                          <div className="border-t border-gray-200 bg-white px-4 py-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top vehicles</p>
                            <div className="space-y-1.5">
                              {entry.recommendations.slice(0, 3).map((r, i) => (
                                <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                                  <span className="font-medium text-gray-800">{r.make} {r.model}</span>
                                  <span>{formatCurrency(r.monthlyCost)}/mo &middot; {Math.round(r.score * 100)}% match</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : activeView === 'profile' ? (
            /* ── Profile view ── */
            <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
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

              <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="h-14 w-14 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold select-none">
                    {answers.first_name ? answers.first_name[0].toUpperCase() : email ? email[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {(answers.first_name || answers.last_name) && (
                      <p className="text-lg font-semibold text-gray-900 leading-tight">
                        {[answers.first_name, answers.last_name].filter(Boolean).join(' ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 truncate">{email || '\u2014'}</p>
                    {budget > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Monthly budget (20%): <span className="font-semibold text-blue-600">{formatCurrency(budget)}</span>
                      </p>
                    )}
                  </div>
                </div>
                {creditScore !== null && (() => {
                  const rating = getCreditScoreRating(creditScore);
                  const pct = Math.min(100, Math.max(0, ((creditScore - 300) / (850 - 300)) * 100));
                  return (
                    <div className={`shrink-0 rounded-xl border px-4 py-3 text-center w-full sm:w-auto sm:min-w-[110px] ${rating.bg}`}>
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

              {saveError && <p className="mb-4 text-sm text-red-500">{saveError}</p>}

              {profileFields.length > 0 && (
                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                  {profileFields.map((config) => (
                    <div key={config.key}>
                      <dt className="text-xs text-gray-400 uppercase tracking-wide mb-1">{config.label}</dt>
                      {isEditing && EDITABLE_KEYS.has(config.key) ? (
                        config.type === 'choice' && config.options ? (
                          <select
                            value={editedAnswers[config.key] ?? ''}
                            onChange={(e) => setEditedAnswers((prev) => ({ ...prev, [config.key]: e.target.value }))}
                            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            {config.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editedAnswers[config.key] ?? ''}
                            onChange={(e) => setEditedAnswers((prev) => ({ ...prev, [config.key]: e.target.value }))}
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
          ) : (
            /* ── Dashboard view ── */
            <>
              {/* UX-027: Dashboard Summary Card */}
              {hasSubmittedForm && (
                <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Your Overview</h2>
                    <div className="flex gap-2">
                      {recommendations.length > 0 && (
                        <button
                          onClick={downloadReport}
                          className="flex items-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Download Report
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {/* Credit Score */}
                    <button
                      onClick={() => setShowCreditInfo(!showCreditInfo)}
                      className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors text-left"
                    >
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Credit Score</p>
                      {creditScore !== null ? (
                        <>
                          <p className={`text-2xl font-bold mt-1 ${getCreditScoreRating(creditScore).color}`}>{creditScore}</p>
                          <p className={`text-xs font-semibold ${getCreditScoreRating(creditScore).color}`}>{getCreditScoreRating(creditScore).label}</p>
                        </>
                      ) : (
                        <p className="text-2xl font-bold mt-1 text-gray-300">--</p>
                      )}
                    </button>

                    {/* Monthly Budget */}
                    <button
                      onClick={() => setShowAffordability(!showAffordability)}
                      className="bg-gray-50 rounded-xl p-3 text-center hover:bg-gray-100 transition-colors text-left"
                    >
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Monthly Budget</p>
                      <p className="text-2xl font-bold mt-1 text-blue-600">{budget > 0 ? formatCurrency(budget) : '--'}</p>
                      <p className="text-xs text-gray-400">20% of salary</p>
                    </button>

                    {/* Province */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Province</p>
                      <p className="text-lg font-bold mt-1 text-gray-800 truncate">{answers.location || '--'}</p>
                      {answers.location && PROVINCE_CITY[answers.location] && (
                        <p className="text-xs text-gray-400">{PROVINCE_CITY[answers.location]}</p>
                      )}
                    </div>

                    {/* Recommendations */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Vehicles Found</p>
                      <p className="text-2xl font-bold mt-1 text-gray-800">{recommendations.length}</p>
                      {resultSource && (
                        <p className="text-xs text-gray-400">{resultSource === 'mock' ? 'Mock data' : 'Live'}</p>
                      )}
                    </div>

                    {/* Best Match */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Best Match</p>
                      <p className="text-2xl font-bold mt-1 text-green-600">{bestMatchScore > 0 ? `${Math.round(bestMatchScore * 100)}%` : '--'}</p>
                      <p className="text-xs text-gray-400">Match score</p>
                    </div>
                  </div>

                  {/* UX-016: Credit Score Explanation */}
                  {showCreditInfo && creditScore !== null && (() => {
                    const explanation = getCreditScoreExplanation(creditScore);
                    const rating = getCreditScoreRating(creditScore);
                    const pct = Math.min(100, Math.max(0, ((creditScore - 300) / (850 - 300)) * 100));
                    return (
                      <div className={`mt-4 rounded-xl border p-4 ${rating.bg}`}>
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className={`text-sm font-bold ${rating.color}`}>Credit Score: {creditScore}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${rating.color} bg-white/60`}>
                                {explanation.riskLevel}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{explanation.message}</p>
                            <p className="text-xs text-gray-500">
                              <span className="font-semibold">Impact on your recommendations:</span> {explanation.impact}
                            </p>
                            <div className="mt-3 h-2 w-full rounded-full bg-gray-200 max-w-xs">
                              <div className={`h-2 rounded-full ${rating.bar} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-gray-400 mt-1 max-w-xs">
                              <span>300</span>
                              <span>500</span>
                              <span>650</span>
                              <span>750</span>
                              <span>850</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* UX-017: Affordability Breakdown */}
                  {showAffordability && netSalary > 0 && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <h3 className="text-sm font-bold text-blue-800 mb-3">How your budget was calculated</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Net Monthly Salary</span>
                            <span className="font-bold text-gray-900">{formatCurrency(netSalary)}</span>
                          </div>
                          <hr className="border-blue-100" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Groceries</span>
                            <span className="text-gray-700">- {formatCurrency(expGroceries)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Accounts</span>
                            <span className="text-gray-700">- {formatCurrency(expAccounts)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Loans</span>
                            <span className="text-gray-700">- {formatCurrency(expLoans)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Other Expenses</span>
                            <span className="text-gray-700">- {formatCurrency(expOther)}</span>
                          </div>
                          <hr className="border-blue-100" />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">Total Expenses</span>
                            <span className="font-bold text-red-600">- {formatCurrency(totalExpenses)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 font-medium">Disposable Income</span>
                            <span className="font-bold text-gray-900">{formatCurrency(disposableIncome)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center items-center bg-white rounded-xl p-4 border border-blue-100">
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Car Budget (20% Rule)</p>
                          <p className="text-3xl font-extrabold text-blue-600">{formatCurrency(budget)}</p>
                          <p className="text-xs text-gray-500 mt-1">= {formatCurrency(netSalary)} x 20%</p>
                          <div className="mt-3 w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-blue-500 h-3 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (budget / netSalary) * 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {netSalary > 0 ? `${Math.round((totalExpenses / netSalary) * 100)}% DTI ratio` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Preferred car quick-view banner */}
              {preferredCar && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
                  {preferredCar.car.imageUrl && (
                    <img
                      src={preferredCar.car.imageUrl}
                      alt={`${preferredCar.car.make} ${preferredCar.car.model}`}
                      className="h-16 w-24 rounded-xl object-cover shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-0.5">Your preferred car</p>
                    <p className="text-base font-bold text-gray-900 truncate">{preferredCar.car.make} {preferredCar.car.model}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(preferredCar.estimatedMonthlyCost)}/mo · {(preferredCar.score * 100).toFixed(0)}% match</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => setPreferredCar(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors text-center"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Your car matches</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* UX-023: Compare button */}
                    {compareIds.size >= 2 && (
                      <button
                        onClick={() => setShowCompareModal(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-700 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 3h5v10H2zM9 3h5v10H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                        </svg>
                        Compare ({compareIds.size})
                      </button>
                    )}

                    {/* UX-025: Filter toggle */}
                    {recommendations.length > 0 && (
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${
                          showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                        </svg>
                        Filters
                      </button>
                    )}

                    {resultSource && recommendations.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {resultSource === 'mock' ? 'Mock data' : 'Live recommendations'}
                      </span>
                    )}
                  </div>
                </div>

                {/* UX-025: Filters panel */}
                {showFilters && recommendations.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Fuel Type</label>
                        <select
                          value={filters.fuelType}
                          onChange={(e) => setFilters((f) => ({ ...f, fuelType: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        >
                          <option value="all">All</option>
                          <option value="petrol">Petrol</option>
                          <option value="diesel">Diesel</option>
                          <option value="hybrid">Hybrid</option>
                          <option value="electric">Electric</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Transmission</label>
                        <select
                          value={filters.transmission}
                          onChange={(e) => setFilters((f) => ({ ...f, transmission: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        >
                          <option value="all">All</option>
                          <option value="manual">Manual</option>
                          <option value="automatic">Automatic</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-1">Max Monthly Cost</label>
                        <select
                          value={filters.maxMonthlyCost}
                          onChange={(e) => setFilters((f) => ({ ...f, maxMonthlyCost: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-700 outline-none focus:border-blue-400"
                        >
                          <option value="all">No limit</option>
                          <option value="3000">Under R 3,000</option>
                          <option value="5000">Under R 5,000</option>
                          <option value="7000">Under R 7,000</option>
                          <option value="10000">Under R 10,000</option>
                          <option value="15000">Under R 15,000</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => { setFilters({ fuelType: 'all', transmission: 'all', carType: 'all', maxMonthlyCost: 'all' }); setBrandFilter('all'); }}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          Reset all
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Brand filter chips */}
                {selectedBrands.length > 0 && recommendations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    <button
                      onClick={() => setBrandFilter('all')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        brandFilter === 'all' ? 'bg-blue-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
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
                            brandFilter === brand ? 'bg-blue-500 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
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
                    /* UX-022: Improved empty state */
                    <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50 p-8 sm:p-12 flex flex-col items-center text-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-2xl">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <circle cx="14" cy="14" r="12" stroke="#f59e0b" strokeWidth="2" fill="none"/>
                          <path d="M14 8v6M14 18h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">No vehicles currently match your affordability range</p>
                        <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                          This usually happens when your monthly budget is below the minimum vehicle cost in our database.
                          Here are some steps that might help:
                        </p>
                      </div>
                      <div className="text-left bg-white rounded-xl border border-amber-100 p-4 w-full max-w-md">
                        <ul className="space-y-2.5 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                            <span><strong>Increase your budget</strong> by reviewing your monthly expenses for potential savings</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                            <span><strong>Update your financial information</strong> if your income has changed recently</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                            <span><strong>Explore lower-priced vehicle categories</strong> such as older models or smaller hatchbacks</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="shrink-0 h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                            <span><strong>Improve your credit score</strong> to qualify for better interest rates and lower insurance</span>
                          </li>
                        </ul>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <button
                          onClick={() => setActiveView('profile')}
                          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                        >
                          Update profile
                        </button>
                        <button
                          onClick={() => router.push('/form')}
                          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Retake questionnaire
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 flex flex-col items-center text-center gap-4">
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
                        <p className="mt-1 text-sm text-gray-500">Complete the questionnaire so we can find your perfect car.</p>
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
                    <p className="font-semibold text-gray-900">No cars match your current filters</p>
                    <p className="text-sm text-gray-500">
                      {brandFilter !== 'all' && `No ${getBrandDisplayName(brandFilter)} vehicles found. `}
                      Try adjusting your filter criteria to see more results.
                    </p>
                    <button
                      onClick={() => { setBrandFilter('all'); setFilters({ fuelType: 'all', transmission: 'all', carType: 'all', maxMonthlyCost: 'all' }); }}
                      className="mt-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Reset all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredRecommendations.map((rec, idx) => {
                      const isPreferred = preferredCarId === rec.id;
                      const matchPct = Math.round(rec.score * 100);
                      const matchColor = matchPct >= 85 ? 'bg-green-500' : matchPct >= 70 ? 'bg-amber-500' : 'bg-gray-500';
                      const badges = computeBadges(rec, recommendations, budget);
                      const confidence = computeConfidenceScore(rec, budget, creditScore, answers.years_licenced ?? '');
                      const explanation = getRecommendationExplanation(rec, budget, creditScore);
                      const isComparing = compareIds.has(rec.id);
                      const remainingBudget = budget - rec.estimatedMonthlyCost;

                      return (
                        <article
                          key={rec.id}
                          className={`bg-white rounded-2xl overflow-hidden flex flex-col border transition-all duration-200 ${
                            isPreferred
                              ? 'border-amber-400 shadow-lg shadow-amber-100'
                              : isComparing
                              ? 'border-blue-400 shadow-md shadow-blue-50'
                              : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                          }`}
                        >
                          {/* Image hero */}
                          <div className="relative h-48 bg-gradient-to-br from-slate-200 to-slate-300 shrink-0 overflow-hidden">
                            {rec.car.imageUrl ? (
                              <img
                                src={rec.car.imageUrl}
                                alt={`${rec.car.make} ${rec.car.model}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg width="56" height="40" viewBox="0 0 56 32" fill="none" opacity="0.25">
                                  <path d="M4 20 C5 16 9 13 13 12 L43 12 C47 13 51 16 52 20 Z" fill="#64748b"/>
                                  <rect x="2" y="20" width="52" height="8" rx="4" fill="#64748b"/>
                                  <circle cx="12" cy="28" r="4" fill="#94a3b8"/>
                                  <circle cx="44" cy="28" r="4" fill="#94a3b8"/>
                                </svg>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />

                            {/* Preferred banner */}
                            {isPreferred && (
                              <div className="absolute top-0 inset-x-0 bg-amber-500 text-white text-xs font-bold text-center py-1.5 tracking-wide">
                                YOUR PREFERRED CAR
                              </div>
                            )}

                            {/* Top badges */}
                            <div className={`absolute ${isPreferred ? 'top-9' : 'top-3'} left-3 flex items-center gap-1.5`}>
                              <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                #{idx + 1}
                              </span>
                            </div>

                            {/* UX-023: Compare checkbox */}
                            <button
                              onClick={() => toggleCompare(rec.id)}
                              className={`absolute ${isPreferred ? 'top-9' : 'top-3'} right-3 h-7 w-7 rounded-full flex items-center justify-center transition-colors ${
                                isComparing ? 'bg-blue-500 text-white' : 'bg-black/30 backdrop-blur-sm text-white/70 hover:bg-black/50'
                              }`}
                              title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
                            >
                              {isComparing ? (
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                  <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 3h5v10H2zM9 3h5v10H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
                                </svg>
                              )}
                            </button>

                            {/* Bottom of image: match score badge */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white ${matchColor}`}>
                                <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                                  <path d="M4.5 0l.9 2.8H8.6L6 4.5l.9 2.8L4.5 5.8 2.1 7.3 3 4.5.4 2.8h3.2z"/>
                                </svg>
                                {matchPct}% Match
                              </span>
                            </div>
                          </div>

                          {/* Card body */}
                          <div className="flex flex-col flex-1 p-5">
                            {/* UX-018: Badges */}
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {badges.map((badge) => (
                                  <span key={badge.label} className={`px-2 py-0.5 rounded-md text-xs font-semibold ${badge.color}`}>
                                    {badge.label}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Make / Model / Specs */}
                            <div className="mb-4">
                              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-0.5">{rec.car.make}</p>
                              <h3 className="text-lg font-bold text-gray-900 leading-snug">{rec.car.model}</h3>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {rec.car.year && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">{rec.car.year}</span>}
                                {rec.car.transmission && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium capitalize">{rec.car.transmission}</span>}
                                {rec.car.fuelType && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium capitalize">{rec.car.fuelType}</span>}
                                {rec.car.mileage != null && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">{rec.car.mileage.toLocaleString()} km</span>}
                              </div>
                            </div>

                            {/* UX-028: Recommendation Explanation */}
                            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                              <p className="text-xs font-semibold text-blue-700 mb-0.5">Why recommended</p>
                              <p className="text-xs text-blue-600">{explanation}</p>
                            </div>

                            {/* Price */}
                            <div className="flex items-baseline justify-between pb-4 border-b border-gray-100 mb-4">
                              <span className="text-xs text-gray-400 font-medium">Asking price</span>
                              <span className="text-2xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(rec.car.price)}</span>
                            </div>

                            {/* Monthly costs */}
                            <div className="flex-1 mb-4">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">Monthly breakdown</p>
                              <div className="space-y-2 text-sm">
                                {[
                                  { label: 'Loan repayment', val: rec.loanCost },
                                  { label: 'Insurance', val: rec.insuranceCost },
                                  { label: 'Fuel', val: rec.fuelCost },
                                  { label: 'Maintenance', val: rec.maintenanceCost },
                                ].map(({ label, val }) => (
                                  <div key={label} className="flex justify-between text-gray-600">
                                    <span>{label}</span>
                                    <span className="font-medium text-gray-800">{formatCurrency(val)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                                <span className="text-sm font-bold text-gray-900">Total / month</span>
                                <span className="text-xl font-extrabold text-blue-600">{formatCurrency(rec.estimatedMonthlyCost)}</span>
                              </div>
                              {/* Budget remaining */}
                              {budget > 0 && (
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs text-gray-400">Budget remaining</span>
                                  <span className={`text-xs font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {remainingBudget >= 0 ? '+' : ''}{formatCurrency(remainingBudget)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* UX-020: Confidence Score */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400 font-medium">Confidence Score</span>
                                <span className={`text-xs font-bold ${confidence >= 75 ? 'text-green-600' : confidence >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {confidence}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-gray-100">
                                <div
                                  className={`h-1.5 rounded-full transition-all ${confidence >= 75 ? 'bg-green-500' : confidence >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${confidence}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Based on affordability, credit score, driving experience & preferences
                              </p>
                            </div>

                            {/* Prefer button */}
                            <button
                              onClick={() => isPreferred ? setPreferredCar(null) : setPreferredCar(rec.id)}
                              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                                isPreferred
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              <svg width="15" height="15" viewBox="0 0 16 16" fill={isPreferred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                <path d="M8 14S1.5 10 1.5 5.5a3.5 3.5 0 0 1 6.5-1.8 3.5 3.5 0 0 1 6.5 1.8C14.5 10 8 14 8 14Z"/>
                              </svg>
                              {isPreferred ? 'This is my preferred car' : 'Select as preferred car'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* UX-019: Rejection Reasons */}
              {rejectedVehicles.length > 0 && recommendations.length > 0 && (
                <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <button
                    onClick={() => setShowRejected(!showRejected)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">
                        {rejectedVehicles.length} vehicle{rejectedVehicles.length !== 1 ? 's' : ''} over budget
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">See why some vehicles weren&apos;t a perfect fit</p>
                    </div>
                    <svg
                      width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={`text-gray-400 transition-transform ${showRejected ? 'rotate-180' : ''}`}
                    >
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {showRejected && (
                    <div className="mt-4 space-y-2">
                      {rejectedVehicles.map((rec) => (
                        <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M8 4v4M8 12h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{rec.car.make} {rec.car.model}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(rec.estimatedMonthlyCost)}/mo</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-red-600 shrink-0 ml-2">{rec.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Preferred car + AI advisor chat */}
              {preferredCar && (
                <section ref={carChatRef} className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
                  {/* Car header */}
                  <div className="flex items-center gap-4 px-5 py-4 bg-amber-50 border-b border-amber-100">
                    {preferredCar.car.imageUrl ? (
                      <img src={preferredCar.car.imageUrl} alt={`${preferredCar.car.make} ${preferredCar.car.model}`} className="h-14 w-20 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {preferredCar.car.make.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{preferredCar.car.make} {preferredCar.car.model}</p>
                      <p className="text-sm text-gray-500">{preferredCar.car.year} · {formatCurrency(preferredCar.car.price)} · {formatCurrency(preferredCar.estimatedMonthlyCost)}/mo</p>
                    </div>
                    <button
                      onClick={() => setPreferredCar(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 shrink-0"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Chat */}
                  <div className="flex flex-col h-[28rem]">
                    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-gray-50">
                      {carChatLoading && carChatMessages.length === 0 && (
                        <div className="flex gap-2 items-center text-gray-400 text-sm px-1">
                          <div className="flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          Advisor is thinking...
                        </div>
                      )}
                      {carChatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-blue-600 rounded-br-sm'
                              : 'bg-white border border-gray-200 shadow-sm rounded-bl-sm'
                          }`}>
                            {renderChatMessage(msg.content, msg.role === 'user')}
                          </div>
                        </div>
                      ))}
                      {carChatLoading && carChatMessages.length > 0 && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                            <span className="h-2 w-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggested questions */}
                    {carChatMessages.filter((m) => m.role === 'user').length === 0 && !carChatLoading && (
                      <div className="px-3 pt-2 pb-1 flex gap-2 flex-wrap border-t border-gray-100 bg-white">
                        {[
                          'How much will fuel cost for my daily commute?',
                          'What is the fuel cost for a Johannesburg to Cape Town trip?',
                          'How much deposit do I need?',
                          'Help me cut my expenses to afford this car',
                          'Find cheaper cars in my budget',
                        ].map((q) => (
                          <button
                            key={q}
                            onClick={() => void sendCarChat(q)}
                            disabled={carChatLoading}
                            className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1.5 hover:bg-blue-100 transition-colors disabled:opacity-40"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Input */}
                    <div className="border-t border-gray-100 px-3 py-3 flex gap-2 bg-white">
                      <input
                        type="text"
                        value={carChatInput}
                        onChange={(e) => setCarChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendCarChat(); } }}
                        placeholder="Ask about this car..."
                        disabled={carChatLoading}
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:opacity-50"
                      />
                      <button
                        onClick={() => void sendCarChat()}
                        disabled={carChatLoading || !carChatInput.trim()}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-2 text-white transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M14 8H2M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}

        </main>

        {/* Mobile bottom tab nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex">
          <button
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity={activeView === 'dashboard' ? '1' : '0.5'}/>
              <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity={activeView === 'dashboard' ? '1' : '0.5'}/>
              <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity={activeView === 'dashboard' ? '1' : '0.5'}/>
              <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity={activeView === 'dashboard' ? '1' : '0.5'}/>
            </svg>
            Dashboard
          </button>
          <button
            onClick={() => { setActiveView('profile'); setSidebarOpen(false); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeView === 'profile' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="5" r="3" fill="currentColor" opacity={activeView === 'profile' ? '1' : '0.5'}/>
              <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={activeView === 'profile' ? '1' : '0.5'}/>
            </svg>
            Profile
          </button>
          <button
            onClick={() => { setActiveView('logs'); setSidebarOpen(false); setSearchLog(loadSearchLog()); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              activeView === 'logs' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="3" rx="1" fill="currentColor" opacity={activeView === 'logs' ? '1' : '0.5'}/>
              <rect x="2" y="6.5" width="12" height="3" rx="1" fill="currentColor" opacity={activeView === 'logs' ? '0.7' : '0.35'}/>
              <rect x="2" y="11" width="8" height="3" rx="1" fill="currentColor" opacity={activeView === 'logs' ? '0.5' : '0.25'}/>
            </svg>
            History
          </button>
        </nav>
      </div>

      {/* UX-023: Vehicle Comparison Modal */}
      {showCompareModal && compareRecs.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Vehicle Comparison</h3>
              <button
                onClick={() => setShowCompareModal(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-40">Attribute</th>
                    {compareRecs.map((rec) => (
                      <th key={rec.id} className="text-center px-4 py-3 min-w-[160px]">
                        {rec.car.imageUrl && (
                          <img src={rec.car.imageUrl} alt="" className="h-20 w-full rounded-lg object-cover mb-2" />
                        )}
                        <p className="text-xs text-blue-600 font-bold">{rec.car.make}</p>
                        <p className="text-sm font-bold text-gray-900">{rec.car.model}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Year', get: (r: Recommendation) => String(r.car.year ?? '-') },
                    { label: 'Price', get: (r: Recommendation) => formatCurrency(r.car.price) },
                    { label: 'Fuel Type', get: (r: Recommendation) => r.car.fuelType ?? '-' },
                    { label: 'Transmission', get: (r: Recommendation) => r.car.transmission ?? '-' },
                    { label: 'Mileage', get: (r: Recommendation) => r.car.mileage != null ? `${r.car.mileage.toLocaleString()} km` : '-' },
                    { label: 'Match Score', get: (r: Recommendation) => `${Math.round(r.score * 100)}%` },
                    { label: 'Confidence', get: (r: Recommendation) => `${computeConfidenceScore(r, budget, creditScore, answers.years_licenced ?? '')}%` },
                    { label: 'Loan / mo', get: (r: Recommendation) => formatCurrency(r.loanCost) },
                    { label: 'Insurance / mo', get: (r: Recommendation) => formatCurrency(r.insuranceCost) },
                    { label: 'Fuel / mo', get: (r: Recommendation) => formatCurrency(r.fuelCost) },
                    { label: 'Maintenance / mo', get: (r: Recommendation) => formatCurrency(r.maintenanceCost) },
                    { label: 'Total / mo', get: (r: Recommendation) => formatCurrency(r.estimatedMonthlyCost) },
                    { label: 'Budget Remaining', get: (r: Recommendation) => {
                      const rem = budget - r.estimatedMonthlyCost;
                      return rem >= 0 ? `+${formatCurrency(rem)}` : formatCurrency(rem);
                    }},
                  ].map(({ label, get }) => (
                    <tr key={label} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-500">{label}</td>
                      {compareRecs.map((rec) => {
                        // Highlight best value for certain rows
                        const val = get(rec);
                        const isTotalRow = label === 'Total / mo';
                        const isMatchRow = label === 'Match Score' || label === 'Confidence';
                        let isBest = false;
                        if (isTotalRow) {
                          const minCost = Math.min(...compareRecs.map((r) => r.estimatedMonthlyCost));
                          isBest = rec.estimatedMonthlyCost === minCost;
                        }
                        if (isMatchRow) {
                          const maxScore = Math.max(...compareRecs.map((r) => r.score));
                          isBest = rec.score === maxScore;
                        }
                        return (
                          <td
                            key={rec.id}
                            className={`px-4 py-2.5 text-center capitalize ${
                              isTotalRow ? 'font-bold text-blue-600' : ''
                            } ${isBest ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'}`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => { setCompareIds(new Set()); setShowCompareModal(false); }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear selection
              </button>
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete account</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Permanently delete your account and all associated data?</p>
            {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
