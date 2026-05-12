# FirstCar — Technical Documentation

**Last updated:** 2026-05-12
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Anthropic Claude SDK
**Repository layout:** Frontend only. The backend is a separate service expected at `http://localhost:3001`.

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│   ┌──────────┐   sessionStorage   ┌──────────────────────────┐  │
│   │  /form   │ ─────────────────► │       /dashboard         │  │
│   │ (16 Qs)  │                    │  recommendations · profile│  │
│   └──────────┘                    │  AI advisor · logs        │  │
│        │                          └──────────┬───────────────┘  │
│        │                                     │                   │
│        │           localStorage              │                   │
│        │       preferred_car_id ◄────────────┘                   │
│        │       preferred_car_snapshot                            │
│        │       search_log                                        │
└────────┼────────────────────────────────────────────────────────┘
         │ HTTP / fetch
         ▼
┌─────────────────────────────────────────────────────────────────┐
│               NEXT.JS API ROUTES (same origin)                  │
│                                                                 │
│   POST /api/ai-advisor  →  Anthropic Claude claude-sonnet-4-6   │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
         ┌─────────────────────────┘
         │ HTTP / fetch
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND  (localhost:3001)                       │
│                                                                 │
│  /auth/signup          /auth/signin        /auth/forgot-password│
│  /auth/reset-password                                           │
│  /users  (POST/GET/DELETE)                                      │
│  /users/:id/preferences (POST)                                  │
│  /credit-score/check  (POST)                                    │
│  /recommendations/user/:id  (GET)                               │
│  /recommendations/generate  (POST)                              │
│  /ai-recommendations/generate  (POST)                           │
│  /analyze-expenses  (POST)                                      │
│                                                                 │
│              ┌──────────────────────────────┐                   │
│              │         DATABASE             │                   │
│              │  users · preferences ·       │                   │
│              │  recommendations · insurance │                   │
│              └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend File Map

```
firstcar_frontend/
├── app/
│   ├── page.tsx                     Auth entry (signup · login · forgot-password)
│   ├── form/page.tsx                16-question questionnaire
│   ├── dashboard/page.tsx           Main user dashboard
│   ├── admin/page.tsx               Admin user table
│   ├── r/[email]/[uuid]/page.tsx    Password reset page (token in URL)
│   └── api/
│       └── ai-advisor/route.ts      Next.js API route → Anthropic Claude
├── lib/
│   └── recommendations.ts           All API calls, types, mock data
├── components/
│   └── ui/
│       ├── auth-components.tsx      AnimatedForm, Input, Label
│       └── button.tsx               Base button
└── .env.local                       NEXT_PUBLIC_API_BASE_URL · NEXT_PUBLIC_USE_MOCK_DATA · ANTHROPIC_API_KEY
```

---

## 3. Route-by-Route Breakdown

### `app/page.tsx` — Auth Entry Point

Single component handling three modes via local state (`mode: 'signup' | 'login' | 'forgot-password'`).

**Signup flow:**
1. Calls `signup({ email, password })` → `POST /auth/signup`
2. Backend creates an auth record only (no user profile row yet)
3. Switches UI to login mode — profile is written later during questionnaire submission

**Login flow:**
1. Calls `login({ email, password })` → `POST /auth/signin`
2. Receives a JWT; decodes it client-side with `decodeJwtPayload()` to extract `{ sub, email }`
3. Stores `user_id` and `user_email` in `sessionStorage`
4. Calls `getUser(userId)` → `GET /users/:id`
5. **Branch A — profile exists** (`netSalary != null`):
   - Reconstructs `form_answers` from DB fields (reverse-maps `yearsLicensed → years_licenced`, etc.)
   - Calls `generateAiRecommendations({ userId })` → `POST /ai-recommendations/generate`
   - Stores results in `sessionStorage`
   - Redirects to `/dashboard`
6. **Branch B — no profile yet**:
   - Checks `sessionStorage` for guest answers from a previous questionnaire session
   - If found: calls `submitQuestionnaire(answers, userId, email)` to persist them
   - If not found: redirects to `/form`

**Forgot-password flow:**
1. Calls `forgotPassword(email)` → `POST /auth/forgot-password`
2. Backend returns a `resetPath` (e.g. `/r/jane%40example.co.za/uuid-token`)
3. Frontend constructs the full URL and shows it on-screen (in production this would be emailed)

---

### `app/form/page.tsx` — 16-Question Questionnaire

All 16 questions are rendered in a single scrollable page divided into sections. State is a flat `Record<string, string>` called `answers`.

**Questions collected:**

| Key | Type | Notes |
|-----|------|-------|
| `first_name` | text | |
| `last_name` | text | |
| `gender` | chip | auto-filled from SA ID digits 6-9 |
| `location` | select | SA province |
| `city` | select | filtered by `location` |
| `net_salary` | currency | auto-filled from payslip PDF/text upload |
| `id_number` | text | Luhn checksum + date validated client-side |
| `expenses_groceries` | currency | auto-filled from bank statement upload |
| `expenses_accounts` | currency | auto-filled from bank statement |
| `expenses_loans` | currency | auto-filled from bank statement |
| `expenses_other` | currency | optional |
| `years_licenced` | chip | `less-than-1 / 1-3 / 3-5 / 5-plus` |
| `preferred_brand` | multi-select | comma-separated lowercase values |
| `car_type` | chip | `hatchback / sedan / suv / bakkie` |
| `fuel_type` | chip | `petrol / diesel / hybrid / electric` |
| `transmission` | chip | `manual / automatic` |

**Document parsing (client-side):**
- **Payslip** (PDF or text): `parseSalaryFromText()` uses regex patterns to find "nett pay", "take-home pay", "net salary", etc. Fills `net_salary`.
- **Bank statement** (PDF or text): `parseBankStatementExpenses()` scans each line for SA-specific merchant keywords:
  - Groceries: Woolworths, Pick n Pay, Shoprite, Checkers, SPAR, etc.
  - Accounts: Edgars, Truworths, Foschini, Mr Price, Ackermans, etc.
  - Loans: Wesbank, DirectAxis, Capitec Credit, bond payment, etc.
  - Amounts extracted with regex `/\b(\d{1,3}(?:[,\s]\d{3})*\.\d{2})\b/g` (requires cents to avoid picking up years)

**SA ID auto-fill:**
- `extractAgeFromId()` → validates age vs years-licensed
- `extractGenderFromId()` → digits 6-9 ≥ 5000 = male, otherwise female; pre-fills the gender chip

**On submit:**
1. Runs `validateAll(answers)` — returns field-level error map
2. Calls `submitQuestionnaire(answers, userId?, email?)` from `lib/recommendations.ts`
3. Stores results in `sessionStorage`
4. Redirects to `/dashboard`

---

### `app/dashboard/page.tsx` — Main Dashboard

Three views controlled by `activeView: 'dashboard' | 'profile' | 'logs'`.

**On mount (`useEffect`):**
1. Reads `user_id` from `sessionStorage` — if absent and no `form_answers`, redirects home
2. Calls `getUser(userId)` (live mode) to confirm the profile still exists in the DB
3. Calls `loadDataFromStorage()` which reads:
   - `recommendations` — `Recommendation[]` JSON
   - `result_source` — `'api' | 'mock'`
   - `form_answers` — `Record<string, string>`
   - `preferred_car_id` — from `sessionStorage` first, falls back to `localStorage`
   - `credit_score` — number
4. Appends a `SearchLogEntry` to `localStorage['search_log']` if fresh results were found

**Dashboard view:**
- Preferred car amber banner (if set) — image, monthly cost, match score, trip calc shortcut
- Brand filter tabs (only when `preferred_brand` has multiple values)
- Recommendation cards grid (1 → 2 → 3 columns)
- Preferred car trip planner section (when a preferred car is selected)

**Profile view:**
- Avatar, name, email, monthly budget (20% of salary), credit score badge
- Field grid — read-only by default; Edit button activates inline editing
- **Editable fields only:** `first_name`, `last_name`, `net_salary`, `expenses_*`, `years_licenced`
- Save triggers `submitQuestionnaire(editedAnswers, userId, email)` → re-generates recommendations

**Logs view:**
- Reads `localStorage['search_log']` (up to 50 entries)
- Each entry: timestamp, source (mock/api), result count, budget, filters applied
- "Clear all" wipes the log

**AI Advisor chat:**
- Floating button (bottom-right corner) toggles the chat panel
- On first open: sends a welcome message with the user's car budget pre-calculated
- Each user message is sent to `POST /api/ai-advisor` with the full financial context
- Quick-prompt chips for common questions

---

### `app/api/ai-advisor/route.ts` — AI Advisor API Route

Accepts POST with:
```ts
{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  financialContext: {
    netSalary: number;
    expenses: { groceries, accounts, loans, other: number };
    totalExpenses: number;
    disposableIncome: number;
    carBudget: number;        // netSalary * 0.20
    dtiRatio: number;         // totalExpenses / netSalary
    creditScore: number | null;
    location: string;
  };
}
```

Builds a system prompt embedding the user's exact financial numbers, then calls:
```
model: claude-sonnet-4-6
max_tokens: 1024
```

Returns `{ reply: string }`. The conversation history (`messages`) is passed on every call so Claude has full context of the thread.

---

### `app/admin/page.tsx` — Admin Panel

- Calls `getUsers()` → `GET /users` on mount
- Displays a table: email, location, gender, salary, credit score
- Delete button with inline confirmation row → `DELETE /users/:id`
- No authentication guard in the frontend (backend should protect this endpoint)

---

### `app/r/[email]/[uuid]/page.tsx` — Password Reset

- URL params: `email` (URL-encoded), `uuid` (reset token)
- Calls `resetPassword(email, token, newPassword)` → `POST /auth/reset-password`
- In mock mode: only the hardcoded token `mock-uuid-1234-5678-abcd-efgh` succeeds

---

## 4. `lib/recommendations.ts` — API Layer

This is the single file that handles all backend communication. It checks `USE_MOCK_DATA` first on every exported function and short-circuits with local data when true.

### Environment toggle

```
NEXT_PUBLIC_USE_MOCK_DATA=true   →  all API calls replaced with mock data
NEXT_PUBLIC_USE_MOCK_DATA=false  →  live backend required at NEXT_PUBLIC_API_BASE_URL
```

### Key exported functions

| Function | Method | Endpoint | Purpose |
|----------|--------|----------|---------|
| `signup` | POST | `/auth/signup` | Creates auth credentials only |
| `login` | POST | `/auth/signin` | Returns JWT; decoded client-side |
| `submitQuestionnaire` | orchestrates 4 calls | see below | Full profile + recommendation pipeline |
| `getUser` | GET | `/users/:id` | Fetch profile to check form completion |
| `getUsers` | GET | `/users` | Admin: list all users |
| `deleteUser` | DELETE | `/users/:id` | Admin + self-delete |
| `getUserRecommendations` | GET | `/recommendations/user/:id` | Fetch saved recs |
| `generateRecommendations` | POST | `/recommendations/generate` | Regenerate recs |
| `generateAiRecommendations` | POST | `/ai-recommendations/generate` | AI-powered rec generation |
| `forgotPassword` | POST | `/auth/forgot-password` | Returns reset path |
| `resetPassword` | POST | `/auth/reset-password` | Validates token + updates password |
| `analyzeExpenses` | POST | `/analyze-expenses` | NLP expense parsing (backend AI) |

---

## 5. `submitQuestionnaire` — The Core Pipeline

This is the most important function. It orchestrates the entire data-write sequence when a user completes the form.

```
submitQuestionnaire(answers, userId?, email?)
          │
          ├── [MOCK MODE]
          │     Calculates mock credit score from DTI ratio
          │     Returns getMockRecommendations(answers)
          │
          └── [LIVE MODE]
                │
                ├─ 1. POST /credit-score/check
                │       Body: { idNumber, income, expenses: { groceries, accounts, loans, other } }
                │       Returns: { creditScore: number }
                │
                ├─ 2. POST /users  (only if email provided)
                │       Body: buildUpsertUserPayload(email, answers, creditScore)
                │         → { email, netSalary, creditScore, fullName, idNumber,
                │              yearsLicensed, gender, location }
                │       Returns: { id: string }  ← the user's DB id
                │
                ├─ 3. POST /users/:id/preferences
                │       Body: buildPreferencesPayload(answers)
                │         → { preferredBrand, carType, fuelType, transmission }
                │
                └─ 4. Returns { source: 'api', recommendations: [], creditScore, userId }
                       (recommendations come separately via generateAiRecommendations on login)
```

**Key mapping — form answers → API payload:**

| Form key | API field | Transformation |
|----------|-----------|---------------|
| `first_name` + `last_name` | `fullName` | joined with space |
| `net_salary` | `netSalary` | `parseCurrency()` strips `R `, commas |
| `years_licenced` | `yearsLicensed` | `{ less-than-1→0, 1-3→2, 3-5→4, 5-plus→6 }` |
| `id_number` | `idNumber` | passed as-is |
| `preferred_brand` | `preferredBrand` | comma-separated string |
| `car_type` | `carType` | |
| `fuel_type` | `fuelType` | |
| `transmission` | `transmission` | |

---

## 6. Database Entities (Inferred from API Contracts)

The backend database is not in this repository, but its schema can be inferred from the API payloads.

### `users` table

| Column | Type | Source |
|--------|------|--------|
| `id` | UUID (PK) | Generated by backend |
| `email` | string | signup payload |
| `password_hash` | string | hashed by backend |
| `full_name` | string \| null | `submitQuestionnaire` |
| `net_salary` | number \| null | `submitQuestionnaire` |
| `credit_score` | number \| null | `/credit-score/check` result |
| `id_number` | string \| null | form |
| `years_licensed` | number \| null | mapped from `years_licenced` |
| `gender` | string \| null | form |
| `location` | string \| null | SA province |
| `created_at` | timestamp | backend |

**Sentinel for "has completed form":** `netSalary != null`. The login flow uses this to branch between sending a returning user to `/dashboard` vs sending a new user to `/form`.

### `preferences` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → users) | |
| `preferred_brand` | string \| null | comma-separated |
| `car_type` | string \| null | hatchback/sedan/suv/bakkie |
| `fuel_type` | string \| null | petrol/diesel/hybrid/electric |
| `transmission` | string \| null | manual/automatic |

A user can have multiple preference rows; the frontend uses `preferences?.[0]` (most recent).

### `recommendations` table (inferred)

| Column | Type |
|--------|------|
| `id` | UUID (PK) |
| `user_id` | UUID (FK) |
| `estimated_monthly_cost` | decimal |
| `insurance_cost` | decimal |
| `loan_cost` | decimal |
| `maintenance_cost` | decimal |
| `fuel_cost` | decimal |
| `score` | decimal (0–1) |
| `car` | JSON / FK → cars |

### `cars` table (inferred)

| Column | Type |
|--------|------|
| `id` | UUID (PK) |
| `make` | string |
| `model` | string |
| `year` | number \| null |
| `price` | decimal \| null |
| `fuel_type` | string \| null |
| `transmission` | string \| null |
| `mileage` | number \| null |
| `image_url` | string \| null |

---

## 7. Credit Score Calculation

### Mock mode (client-side)

Calculated from the **debt-to-income (DTI) ratio**:

```
totalExpenses = groceries + accounts + loans + other
dti = totalExpenses / netSalary

dti < 0.20  →  creditScore = 750  (Excellent)
dti < 0.40  →  creditScore = 700  (Very Good)
dti < 0.60  →  creditScore = 650  (Good)
dti < 0.80  →  creditScore = 600  (Fair)
dti ≥ 0.80  →  creditScore = 500  (Poor)
```

### Live mode (backend)

`POST /credit-score/check` receives:
```json
{
  "idNumber": "9001015009087",
  "income": 25000,
  "expenses": {
    "groceries": 3000,
    "accounts": 500,
    "loans": 2000,
    "other": 800
  }
}
```
The backend uses the SA ID number alongside the DTI to compute a score, likely cross-referencing a credit bureau integration (Experian, TransUnion) or an internal scoring model.

**Score ranges displayed in UI:**

| Score | Label | Colour |
|-------|-------|--------|
| ≥ 750 | Excellent | Green |
| ≥ 700 | Very Good | Blue |
| ≥ 650 | Good | Teal |
| ≥ 600 | Fair | Amber |
| < 600 | Poor | Red |

---

## 8. How Recommendations Are Generated

### Mock mode

`getMockRecommendations(answers)` takes the 6 hardcoded mock cars and adjusts their base scores:

```
score += 0.04  if car.make matches any preferred_brand
score += 0.03  if car.transmission matches answers.transmission
score += 0.02  if car.fuelType matches answers.fuel_type
```

Results are sorted descending by adjusted score.

### Live mode — `/recommendations/generate`

The backend generates recommendations using the stored user profile and preferences. The frontend calls this via `generateRecommendations(userId)`.

### Live mode — `/ai-recommendations/generate`

The primary path used after login for returning users. The backend AI engine:

1. **Pulls from DB:** `users` row (salary, credit score, location, years licensed) + `preferences` row
2. **Calculates budget:** `netSalary × 0.20` = maximum monthly car cost
3. **Scores cars from inventory** against:
   - Monthly affordability (`loanCost + insuranceCost + fuelCost + maintenanceCost ≤ budget`)
   - Brand preference match
   - Car type, fuel type, transmission match
   - Risk factor from credit score (lower score → prefers cheaper cars)
   - Location-based insurance rate factors
4. **Returns ranked list** of `Recommendation[]` with full cost breakdowns

The payload accepted by the endpoint:
```ts
// Option A — by userId (uses stored profile)
{ userId: string }

// Option B — anonymous (uses inline values)
{ netSalary: number; creditScore: number; location?: string; yearsLicensed?: number }
```

---

## 9. Client-Side State Management

There is no global state management library. All cross-page state uses browser storage.

### `sessionStorage` keys

| Key | Written by | Read by | Value |
|-----|-----------|---------|-------|
| `user_id` | `app/page.tsx` on login | dashboard, form | string |
| `user_email` | `app/page.tsx` on login | dashboard | string |
| `form_answers` | `app/form/page.tsx` on submit | dashboard, ai-advisor | `Record<string, string>` JSON |
| `recommendations` | form page + login flow | dashboard | `Recommendation[]` JSON |
| `result_source` | form page + login | dashboard | `'api' \| 'mock'` |
| `credit_score` | form page + login | dashboard | number string |
| `preferred_car_id` | dashboard | dashboard | string |

**Cleared on:** logout, account deletion.

### `localStorage` keys

| Key | Written by | Read by | Persists across |
|-----|-----------|---------|----------------|
| `preferred_car_id` | dashboard `setPreferredCar()` | dashboard on mount | Tab close / session end |
| `preferred_car_snapshot` | dashboard `setPreferredCar()` | (reserved) | Tab close |
| `search_log` | `loadDataFromStorage()` | Logs view | All sessions (max 50 entries) |

---

## 10. Guest Mode Flow

Users can complete the questionnaire without logging in:

```
/ (no account)
  └─ "Continue as guest" button
       └─ /form
            └─ submitQuestionnaire(answers, undefined, undefined)
                 → mock mode: returns recommendations immediately
                 → live mode: skips user upsert, calls credit-score only
            └─ /dashboard (guest session)
                 → userId = '' (empty)
                 → "Sign Up to Save" button visible

Later: user clicks "Sign Up to Save" → /
  └─ signup → login
       └─ login detects form_answers in sessionStorage
            └─ submitQuestionnaire(answers, userId, email)  ← now persists to DB
```

---

## 11. Password Reset Flow

```
/ (login mode)
  └─ "Forgot your password?" link
       └─ mode = 'forgot-password'
            └─ POST /auth/forgot-password  { email }
                 ← { resetPath: '/r/jane%40example.co.za/uuid-token' }
            └─ UI shows full URL: https://domain/r/jane%40example.co.za/uuid-token

User opens the link:
/r/[email]/[uuid]
  └─ Form: new password + confirm
       └─ POST /auth/reset-password  { email, token: uuid, newPassword }
            ← 200 OK or error
       └─ Success → redirect to /
```

In the current implementation the reset link is shown in the UI rather than sent by email. The backend is designed to send it by email in production.

---

## 12. AI Advisor — Data Flow

```
User types message in chat panel
        │
        ▼
sendAiMessage()   [dashboard/page.tsx]
  - Reads answers from component state (form_answers already loaded)
  - Computes: totalExpenses, disposableIncome, carBudget (salary × 0.20), dtiRatio
  - POST /api/ai-advisor
      {
        messages: [...conversationHistory, newUserMessage],
        financialContext: {
          netSalary, expenses, totalExpenses,
          disposableIncome, carBudget, dtiRatio,
          creditScore, location
        }
      }
        │
        ▼
app/api/ai-advisor/route.ts   [server-side, keeps API key secret]
  - Builds system prompt with user's real numbers embedded
  - Calls Anthropic Claude claude-sonnet-4-6 (max_tokens: 1024)
  - Returns { reply: string }
        │
        ▼
Chat panel renders assistant message
```

**The AI does not store anything.** Each request includes the full conversation history so Claude has context, but nothing is persisted to the backend database. Conversation state lives only in `aiMessages` React state — it is lost on page refresh.

**Required environment variable:**
```
ANTHROPIC_API_KEY=sk-ant-...
```
Add to `firstcar_frontend/.env.local`. Without it the chat will return a 500 error.

---

## 13. Mock Data Reference

Six mock cars are defined in `lib/recommendations.ts`:

| ID | Make | Model | Year | Price | Score | Monthly cost |
|----|------|-------|------|-------|-------|-------------|
| `mock-vw-polo` | Volkswagen | Polo 1.0 TSI Life | 2022 | R 214,900 | 0.91 | R 5,420 |
| `mock-toyota-starlet` | Toyota | Starlet 1.4 XS | 2023 | R 196,500 | 0.88 | R 4,985 |
| `mock-hyundai-i20` | Hyundai | i20 1.2 Fluid | 2022 | R 205,000 | 0.84 | R 5,210 |
| `mock-suzuki-swift` | Suzuki | Swift 1.2 GL | 2022 | R 182,900 | 0.82 | R 4,620 |
| `mock-nissan-magnite` | Nissan | Magnite 1.0T Acenta | 2023 | R 234,900 | 0.79 | R 5,890 |
| `mock-kia-picanto` | Kia | Picanto 1.0 Street | 2022 | R 169,900 | 0.77 | R 4,280 |

Score adjustments in mock mode:
- `+0.04` for preferred brand match
- `+0.03` for transmission match
- `+0.02` for fuel type match

---

## 14. Budget Rule

The 20% rule is applied consistently throughout the app:

```
monthlyCarBudget = netSalary × 0.20
```

This covers: **loan repayment + insurance + fuel + maintenance**

The **affordability percentage** on each card is:
```
affordPct = max(0, min(100, (1 − estimatedMonthlyCost / budget) × 100))
```

A higher number means more headroom. Green ≥ 60%, Amber ≥ 30%, Red < 30%.

---

## 15. Form Validation Rules

| Field | Rule |
|-------|------|
| `first_name`, `last_name` | Required, non-empty |
| `gender`, `location`, `years_licenced` | Required selection |
| `city` | Required (populated from province selection) |
| `net_salary` | Required; must parse to `> 0` |
| `id_number` | 13 digits; valid date in positions 0-5; Luhn checksum passes |
| `expenses_groceries`, `expenses_accounts`, `expenses_loans` | Required; `>= 0` |
| `expenses_other` | Optional; if present must be `>= 0` |
| `years_licenced` vs `id_number` | Cross-validation: licensed years must not exceed age derived from ID |

---

## 16. Running the Application

```bash
# 1. Create environment file
cat > firstcar_frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_USE_MOCK_DATA=true
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
EOF

# 2. Install and run
cd firstcar_frontend
npm install
npm run dev          # http://localhost:3000

# 3. (Optional) run with live backend
#    Set NEXT_PUBLIC_USE_MOCK_DATA=false and ensure backend is running on :3001
```

**Mock mode checklist:** With `USE_MOCK_DATA=true`, the entire backend is bypassed. Auth always succeeds, credit score is calculated client-side from DTI, and the 6 mock cars are returned. The AI Advisor still requires `ANTHROPIC_API_KEY` as it calls the Anthropic API directly regardless of mock mode.
