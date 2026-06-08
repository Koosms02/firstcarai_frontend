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
  isPreferred?: boolean;
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
  firstName: string;
  lastName: string;
  idNumber: string;
};

type UpsertUserPayload = {
  email: string;
  netSalary: number;
  creditScore: number;
  yearsLicensed?: number;
  location?: string;
  city?: string;
  preferredBrand?: string;
  carType?: string;
  fuelType?: string;
  transmission?: string;
  expensesGroceries?: number;
  expensesAccounts?: number;
  expensesLoans?: number;
  expensesOther?: number;
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

/** Convert AI response shape (nested car/dealer) to Recommendation */
function toRecommendation(raw: {
  id: string;
  isPreferred?: boolean;
  estimatedMonthlyCost: number | string | null;
  insuranceCost: number | string | null;
  loanCost: number | string | null;
  maintenanceCost: number | string | null;
  fuelCost: number | string | null;
  score: number | string | null;
  car: RecommendationCar;
  dealer?: RecommendationDealer | null;
}): Recommendation {
  return {
    id: raw.id,
    isPreferred: raw.isPreferred ?? false,
    estimatedMonthlyCost: Number(raw.estimatedMonthlyCost ?? 0),
    insuranceCost: Number(raw.insuranceCost ?? 0),
    loanCost: Number(raw.loanCost ?? 0),
    maintenanceCost: Number(raw.maintenanceCost ?? 0),
    fuelCost: Number(raw.fuelCost ?? 0),
    score: Number(raw.score ?? 0),
    car: raw.car,
    dealer: raw.dealer ?? null,
  };
}

/** Convert flat DB row (inline car fields) to Recommendation */
function dbRowToRecommendation(row: {
  id: string;
  isPreferred?: boolean;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  price?: number | string | null;
  carFuelType?: string | null;
  transmission?: string | null;
  mileage?: number | null;
  imageUrl?: string | null;
  dealerName?: string | null;
  dealerLocation?: string | null;
  dealerReputationNote?: string | null;
  estimatedMonthlyCost?: number | string | null;
  insuranceCost?: number | string | null;
  loanCost?: number | string | null;
  maintenanceCost?: number | string | null;
  fuelCost?: number | string | null;
  score?: number | string | null;
}): Recommendation {
  return {
    id: row.id,
    isPreferred: row.isPreferred ?? false,
    estimatedMonthlyCost: Number(row.estimatedMonthlyCost ?? 0),
    insuranceCost: Number(row.insuranceCost ?? 0),
    loanCost: Number(row.loanCost ?? 0),
    maintenanceCost: Number(row.maintenanceCost ?? 0),
    fuelCost: Number(row.fuelCost ?? 0),
    score: Number(row.score ?? 0),
    car: {
      id: row.id,
      make: row.make ?? '',
      model: row.model ?? '',
      year: row.year ?? null,
      price: row.price != null ? Number(row.price) : null,
      fuelType: row.carFuelType ?? null,
      transmission: row.transmission ?? null,
      mileage: row.mileage ?? null,
      imageUrl: row.imageUrl ?? null,
    },
    dealer: row.dealerName
      ? {
          name: row.dealerName,
          location: row.dealerLocation ?? '',
          reputationNote: row.dealerReputationNote ?? '',
        }
      : null,
  };
}

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : '';

  if (err instanceof TypeError || /failed to fetch|network/i.test(msg)) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }
  if (/timeout/i.test(msg)) {
    return 'The request is taking longer than expected. Please try again.';
  }
  if (/invalid credentials/i.test(msg)) {
    return 'Incorrect email or password. Please try again.';
  }
  if (/email already in use/i.test(msg)) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (/unauthorized|401/i.test(msg)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/user not logged in/i.test(msg)) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/invalid reset code/i.test(msg)) {
    return 'This reset link is invalid or has expired. Please request a new one.';
  }
  // Pass through already-friendly reset password messages
  if (/no password reset was requested|reset code has expired/i.test(msg)) {
    return msg;
  }
  if (/internal server error|500|prisma|database|column/i.test(msg)) {
    return 'Something went wrong on our end. Please try again later.';
  }
  if (/502|503|504/i.test(msg)) {
    return 'The service is temporarily unavailable. Please try again in a moment.';
  }
  if (!msg) return 'Something went wrong. Please try again.';
  return msg;
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
  return {
    email,
    netSalary: parseCurrency(answers.net_salary),
    creditScore,
    yearsLicensed: YEARS_LICENSED_MAP[answers.years_licenced],
    location: answers.location || undefined,
    city: answers.city || undefined,
    preferredBrand: answers.preferred_brand || undefined,
    carType: answers.car_type || undefined,
    fuelType: answers.fuel_type || undefined,
    transmission: answers.transmission || undefined,
    expensesGroceries: answers.expenses_groceries ? parseCurrency(answers.expenses_groceries) : undefined,
    expensesAccounts: answers.expenses_accounts ? parseCurrency(answers.expenses_accounts) : undefined,
    expensesLoans: answers.expenses_loans ? parseCurrency(answers.expenses_loans) : undefined,
    expensesOther: answers.expenses_other ? parseCurrency(answers.expenses_other) : undefined,
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

export async function login(payload: { email: string; password: string }): Promise<{ id: string; email: string }> {
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

    const user = await request<CreatedUser>('/users', {
      method: 'POST',
      body: JSON.stringify(upsertPayload),
    });

    finalUserId = user.id;
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
  firstName?: string | null;
  lastName?: string | null;
  idNumber?: string | null;
  gender?: string | null;
  netSalary?: number | null;
  creditScore?: number | null;
  yearsLicensed?: number | null;
  location?: string | null;
  city?: string | null;
  preferredBrand?: string | null;
  carType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  expensesGroceries?: number | null;
  expensesAccounts?: number | null;
  expensesLoans?: number | null;
  expensesOther?: number | null;
  createdAt?: string | null;
};

export async function getUsers(): Promise<User[]> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [
      { id: 'mock-user-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith', gender: 'female', location: 'Western Cape', city: 'Cape Town', netSalary: 25000, creditScore: 720, yearsLicensed: 3 },
      { id: 'mock-user-2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Jones', gender: 'male', location: 'Gauteng', city: 'Johannesburg', netSalary: 18000, creditScore: 650, yearsLicensed: 1 },
      { id: 'mock-user-3', email: 'charlie@example.com', firstName: 'Charlie', lastName: 'Brown', gender: 'male', location: 'KwaZulu-Natal', city: 'Durban', netSalary: 32000, creditScore: 770, yearsLicensed: 6 },
    ];
  }

  return request<User[]>('/users');
}

export async function getUser(userId: string): Promise<User | null> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 100));
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

export async function getUserRecommendations(userId: string): Promise<Recommendation[]> {
  if (USE_MOCK_DATA) {
    return [];
  }
  const rows = await request<Parameters<typeof dbRowToRecommendation>[0][]>(
    `/recommendations/user/${userId}`,
  );
  return rows.map(dbRowToRecommendation);
}

export async function setPreferredCar(recommendationId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    return;
  }
  await request(`/recommendations/${recommendationId}/prefer`, { method: 'PATCH' });
}

export async function saveDocument(payload: {
  userId: string;
  documentType: 'PAYSLIP' | 'BANK_STATEMENT' | 'UTILITY_BILL';
  fileName: string;
  extractedData?: Record<string, unknown>;
}): Promise<void> {
  if (USE_MOCK_DATA) {
    return;
  }
  await request('/documents', { method: 'POST', body: JSON.stringify(payload) });
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
        dealer?: RecommendationDealer | null;
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

export async function analyzeDocument(
  text: string,
  documentType: 'PAYSLIP' | 'BANK_STATEMENT' | 'UTILITY_BILL',
): Promise<
  | { groceries: number; accounts: number; loans: number; other: number }
  | { province: string | null; city: string | null }
  | { netSalary: number | null }
> {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (documentType === 'BANK_STATEMENT') {
      return { groceries: 3200, accounts: 800, loans: 1500, other: 600 };
    } else if (documentType === 'UTILITY_BILL') {
      return { province: 'Gauteng', city: 'Johannesburg' };
    } else {
      return { netSalary: 25000 };
    }
  }
  return request('/analyze-document', {
    method: 'POST',
    body: JSON.stringify({ text, documentType }),
  });
}

/** @deprecated Use analyzeDocument instead */
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
