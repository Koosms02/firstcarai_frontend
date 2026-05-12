export type RecommendationCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  price: number | null;
  fuelType: string | null;
  transmission: string | null;
  mileage: number | null;
  imageUrl: string | null;
};

export type RecommendationDealer = {
  name: string;
  location: string;
  reputationNote: string;
};

export type Recommendation = {
  id: string;
  estimatedMonthlyCost: number;
  insuranceCost: number;
  loanCost: number;
  maintenanceCost: number;
  fuelCost: number;
  score: number;
  car: RecommendationCar;
  dealer?: RecommendationDealer | null;
};

export type QuestionnaireAnswers = Record<string, string>;

type SignupPayload = {
  email: string;
  password: string;
};

type UpsertUserPayload = {
  email: string;
  netSalary: number;
  creditScore: number;
  fullName?: string;
  idNumber?: string;
  yearsLicensed?: number;
  gender?: string;
  location?: string;
};

type CreatePreferencesPayload = {
  preferredBrand?: string;
  carType?: string;
  fuelType?: string;
  transmission?: string;
};

type CreatedUser = {
  id: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
  'http://localhost:3001';

const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

const YEARS_LICENSED_MAP: Record<string, number> = {
  'less-than-1': 0,
  '1-3': 2,
  '3-5': 4,
  '5-plus': 6,
};


function parseCurrency(value: string) {
  if (!value) return 0;
  const numeric = value.replace(/[^\d.]/g, '');
  if (!numeric) return 0;
  const parsed = Number.parseFloat(numeric);

  if (Number.isNaN(parsed)) {
    throw new Error('Must be a valid number.');
  }

  return parsed;
}

function decodeJwtPayload(token: string): { sub: string; email: string } {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64)) as { sub: string; email: string };
}

function toRecommendation(raw: {
  id: string;
  estimatedMonthlyCost: number | string | null;
  insuranceCost: number | string | null;
  loanCost: number | string | null;
  maintenanceCost: number | string | null;
  fuelCost: number | string | null;
  score: number | string | null;
  car: RecommendationCar;
}): Recommendation {
  return {
    id: raw.id,
    estimatedMonthlyCost: Number(raw.estimatedMonthlyCost ?? 0),
    insuranceCost: Number(raw.insuranceCost ?? 0),
    loanCost: Number(raw.loanCost ?? 0),
    maintenanceCost: Number(raw.maintenanceCost ?? 0),
    fuelCost: Number(raw.fuelCost ?? 0),
    score: Number(raw.score ?? 0),
    car: raw.car,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let message = `Request failed with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function buildUpsertUserPayload(
  email: string,
  answers: QuestionnaireAnswers,
  creditScore: number,
): UpsertUserPayload {
  const nameParts = [answers.first_name, answers.last_name].filter(Boolean);
  return {
    email,
    netSalary: parseCurrency(answers.net_salary),
    creditScore,
    fullName: nameParts.length > 0 ? nameParts.join(' ') : undefined,
    idNumber: answers.id_number || undefined,
    yearsLicensed: YEARS_LICENSED_MAP[answers.years_licenced],
    gender: answers.gender || undefined,
    location: answers.location || undefined,
  };
}

function buildPreferencesPayload(
  answers: QuestionnaireAnswers,
): CreatePreferencesPayload {
  return {
    preferredBrand: answers.preferred_brand || undefined,
    carType: answers.car_type || undefined,
    fuelType: answers.fuel_type || undefined,
    transmission: answers.transmission || undefined,
  };
}


export async function signup(payload: SignupPayload): Promise<{ id: string; email: string }> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { id: 'mock-user-id', email: payload.email };
  }

  const { access_token } = await request<{ access_token: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const { sub, email } = decodeJwtPayload(access_token);
  return { id: sub, email };
}

export async function login(payload: SignupPayload): Promise<{ id: string; email: string }> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { id: 'mock-user-id', email: payload.email };
  }

  const { access_token } = await request<{ access_token: string }>('/auth/signin', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const { sub, email } = decodeJwtPayload(access_token);
  return { id: sub, email };
}

export async function submitQuestionnaire(
  answers: QuestionnaireAnswers,
  userId?: string,
  email?: string,
) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const income = parseCurrency(answers.net_salary || '0');
    const totalExpenses =
      parseCurrency(answers.expenses_groceries || '0') +
      parseCurrency(answers.expenses_accounts || '0') +
      parseCurrency(answers.expenses_loans || '0') +
      parseCurrency(answers.expenses_other || '0');

    const dti = income > 0 ? totalExpenses / income : 1;
    let mockCreditScore = 650;
    if (dti < 0.2) mockCreditScore = 750;
    else if (dti < 0.4) mockCreditScore = 700;
    else if (dti < 0.6) mockCreditScore = 650;
    else if (dti < 0.8) mockCreditScore = 600;
    else mockCreditScore = 500;

    return {
      source: 'mock' as const,
      recommendations: [] as Recommendation[],
      creditScore: mockCreditScore,
      userId: undefined as string | undefined,
    };
  }

  // Calculate mock credit score based on user input
  const creditScoreRes = await request<{ creditScore: number }>('/credit-score/check', {
    method: 'POST',
    body: JSON.stringify({
      idNumber: answers.id_number || '0000000000000',
      income: parseCurrency(answers.net_salary),
      expenses: {
        groceries: parseCurrency(answers.expenses_groceries || '0'),
        accounts: parseCurrency(answers.expenses_accounts || '0'),
        loans: parseCurrency(answers.expenses_loans || '0'),
        other: parseCurrency(answers.expenses_other || '0'),
      },
    }),
  });

  const creditScore = creditScoreRes.creditScore;
  let finalUserId = userId;

  if (email) {
    const upsertPayload = buildUpsertUserPayload(email, answers, creditScore);
    const preferencesPayload = buildPreferencesPayload(answers);

    const user = await request<CreatedUser>('/users', {
      method: 'POST',
      body: JSON.stringify(upsertPayload),
    });

    finalUserId = user.id;

    await request(`/users/${user.id}/preferences`, {
      method: 'POST',
      body: JSON.stringify(preferencesPayload),
    });
  }

  return {
    source: 'api' as const,
    recommendations: [] as Recommendation[],
    creditScore,
    userId: finalUserId,
  };
}

export type User = {
  id: string;
  email: string;
  fullName?: string | null;
  netSalary?: number | null;
  creditScore?: number | null;
  yearsLicensed?: number | null;
  gender?: string | null;
  location?: string | null;
  idNumber?: string | null;
  createdAt?: string | null;
  preferences?: Array<{
    preferredBrand?: string | null;
    carType?: string | null;
    fuelType?: string | null;
    transmission?: string | null;
  }>;
};

export async function getUsers(): Promise<User[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [
      { id: 'mock-user-1', email: 'alice@example.com', gender: 'female', location: 'Cape Town', netSalary: 25000, creditScore: 720, yearsLicensed: 3 },
      { id: 'mock-user-2', email: 'bob@example.com', gender: 'male', location: 'Johannesburg', netSalary: 18000, creditScore: 650, yearsLicensed: 1 },
      { id: 'mock-user-3', email: 'charlie@example.com', gender: 'male', location: 'Durban', netSalary: 32000, creditScore: 770, yearsLicensed: 6 },
    ];
  }

  return request<User[]>('/users');
}

export async function getUser(userId: string): Promise<User | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    // In mock mode, return null so the login flow correctly sends new users to the form.
    // The dashboard sets hasSubmittedForm from sessionStorage instead.
    return null;
  }

  try {
    return await request<User>(`/users/${userId}`);
  } catch {
    return null;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  await request(`/users/${userId}`, { method: 'DELETE' });
}



export async function forgotPassword(email: string): Promise<{ resetPath: string | null }> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const mockToken = 'mock-uuid-1234-5678-abcd-efgh';
    return { resetPath: `/r/${encodeURIComponent(email)}/${mockToken}` };
  }
  return request<{ resetPath: string | null }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (token !== 'mock-uuid-1234-5678-abcd-efgh') throw new Error('Invalid or expired reset link.');
    return;
  }
  await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, token, newPassword }),
  });
}

type AiRecommendationPayload =
  | { userId: string }
  | { netSalary: number; creditScore: number; location?: string; yearsLicensed?: number };

export async function generateAiRecommendations(payload: AiRecommendationPayload): Promise<Recommendation[]> {
  try {
    const raw = await request<
      Array<{
        id: string;
        estimatedMonthlyCost: number | string | null;
        insuranceCost: number | string | null;
        loanCost: number | string | null;
        maintenanceCost: number | string | null;
        fuelCost: number | string | null;
        score: number | string | null;
        car: RecommendationCar;
      }>
    >('/ai-recommendations/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return raw.map(toRecommendation);
  } catch (err) {
    const original = err instanceof Error ? err.message : String(err);
    if (original.includes('404') || original.toLowerCase().includes('not found')) {
      throw new Error(
        'The AI recommendations service is not available yet (POST /ai-recommendations/generate returned 404). ' +
        'This endpoint needs to be implemented in the backend API.'
      );
    }
    if (original.includes('fetch') || original.includes('NetworkError') || original.includes('Failed to fetch')) {
      throw new Error(
        `Cannot reach the backend at ${API_BASE_URL}. Make sure the API server is running.`
      );
    }
    throw new Error(`AI recommendations failed: ${original}`);
  }
}

export async function analyzeExpenses(text: string): Promise<{
  groceries: number;
  accounts: number;
  loans: number;
  other: number;
}> {
  return request<{ groceries: number; accounts: number; loans: number; other: number }>(
    '/analyze-expenses',
    { method: 'POST', body: JSON.stringify({ text }) },
  );
}

export function isUsingMockData() {
  return USE_MOCK_DATA;
}
