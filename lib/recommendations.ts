export type RecommendationCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  price: number | null;
  fuelType: string | null;
  transmission: string | null;
  mileage: number | null;
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

const CREDIT_SCORE_MAP: Record<string, number> = {
  'below-600': 580,
  '600-699': 650,
  '700-749': 720,
  '750-plus': 770,
};

const YEARS_LICENSED_MAP: Record<string, number> = {
  'less-than-1': 0,
  '1-3': 2,
  '3-5': 4,
  '5-plus': 6,
};

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'mock-vw-polo',
    estimatedMonthlyCost: 5420,
    insuranceCost: 980,
    loanCost: 3140,
    maintenanceCost: 700,
    fuelCost: 600,
    score: 0.91,
    car: {
      id: 'car-vw-polo',
      make: 'Volkswagen',
      model: 'Polo 1.0 TSI Life',
      year: 2021,
      price: 214900,
      fuelType: 'petrol',
      transmission: 'automatic',
      mileage: 48200,
    },
  },
  {
    id: 'mock-toyota-starlet',
    estimatedMonthlyCost: 4985,
    insuranceCost: 910,
    loanCost: 2875,
    maintenanceCost: 650,
    fuelCost: 550,
    score: 0.88,
    car: {
      id: 'car-toyota-starlet',
      make: 'Toyota',
      model: 'Starlet XR',
      year: 2022,
      price: 196500,
      fuelType: 'petrol',
      transmission: 'manual',
      mileage: 35100,
    },
  },
  {
    id: 'mock-hyundai-i20',
    estimatedMonthlyCost: 5210,
    insuranceCost: 950,
    loanCost: 3010,
    maintenanceCost: 650,
    fuelCost: 600,
    score: 0.84,
    car: {
      id: 'car-hyundai-i20',
      make: 'Hyundai',
      model: 'i20 Fluid',
      year: 2021,
      price: 205000,
      fuelType: 'petrol',
      transmission: 'automatic',
      mileage: 42800,
    },
  },
];

function parseCurrency(value: string) {
  const numeric = value.replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(numeric);

  if (Number.isNaN(parsed)) {
    throw new Error('Monthly net salary must be a valid number.');
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
): UpsertUserPayload {
  return {
    email,
    netSalary: parseCurrency(answers.net_salary),
    creditScore: CREDIT_SCORE_MAP[answers.credit_score] ?? 650,
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

function getMockRecommendations(answers: QuestionnaireAnswers) {
  const preferredBrand = answers.preferred_brand?.toLowerCase();
  const transmission = answers.transmission?.toLowerCase();
  const fuelType = answers.fuel_type?.toLowerCase();

  return [...MOCK_RECOMMENDATIONS]
    .map((recommendation) => {
      let score = recommendation.score;

      if (
        preferredBrand &&
        recommendation.car.make.toLowerCase().includes(preferredBrand)
      ) {
        score += 0.04;
      }

      if (
        transmission &&
        recommendation.car.transmission?.toLowerCase() === transmission
      ) {
        score += 0.03;
      }

      if (fuelType && recommendation.car.fuelType?.toLowerCase() === fuelType) {
        score += 0.02;
      }

      return {
        ...recommendation,
        score: Number(score.toFixed(2)),
      };
    })
    .sort((left, right) => right.score - left.score);
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

export async function submitQuestionnaire(
  answers: QuestionnaireAnswers,
  _userId: string,
  email: string,
) {
  if (USE_MOCK_DATA) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      source: 'mock' as const,
      recommendations: getMockRecommendations(answers),
    };
  }

  const upsertPayload = buildUpsertUserPayload(email, answers);
  const preferencesPayload = buildPreferencesPayload(answers);

  const user = await request<CreatedUser>('/users', {
    method: 'POST',
    body: JSON.stringify(upsertPayload),
  });

  await request(`/users/${user.id}/preferences`, {
    method: 'POST',
    body: JSON.stringify(preferencesPayload),
  });

  const recommendations = await request<
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
  >('/recommendations/generate', {
    method: 'POST',
    body: JSON.stringify({ userId: user.id }),
  });

  return {
    source: 'api' as const,
    recommendations: recommendations.map(toRecommendation),
  };
}

export type User = {
  id: string;
  email: string;
  netSalary?: number | null;
  creditScore?: number | null;
  yearsLicensed?: number | null;
  gender?: string | null;
  location?: string | null;
  createdAt?: string | null;
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
    return { id: userId, email: 'mock@example.com' };
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

export function isUsingMockData() {
  return USE_MOCK_DATA;
}
