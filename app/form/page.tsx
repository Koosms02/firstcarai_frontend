"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isUsingMockData, submitQuestionnaire, analyzeExpenses, generateAiRecommendations } from "@/lib/recommendations";

// ─── Static data ────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

const SA_PROVINCE_CITIES: Record<string, string[]> = {
  Gauteng: ["Johannesburg", "Pretoria", "Centurion", "Sandton", "Randburg", "Roodepoort", "Soweto", "Benoni", "Boksburg", "Ekurhuleni (East Rand)"],
  "Western Cape": ["Cape Town", "Bellville", "Stellenbosch", "Paarl", "Somerset West", "Worcester", "George", "Knysna", "Mossel Bay"],
  "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Richards Bay", "Newcastle", "Pinetown", "Empangeni", "Ladysmith", "Amanzimtoti"],
  "Eastern Cape": ["Gqeberha (Port Elizabeth)", "East London", "Mthatha", "Queenstown", "Makhanda (Grahamstown)"],
  Limpopo: ["Polokwane", "Tzaneen", "Phalaborwa", "Louis Trichardt", "Mokopane", "Bela-Bela"],
  Mpumalanga: ["Nelspruit (Mbombela)", "Witbank (eMalahleni)", "Secunda", "Middelburg", "Barberton"],
  "North West": ["Mahikeng (Mafikeng)", "Rustenburg", "Klerksdorp", "Potchefstroom", "Brits"],
  "Free State": ["Bloemfontein", "Welkom", "Bethlehem", "Kroonstad", "Phuthaditjhaba"],
  "Northern Cape": ["Kimberley", "Upington", "Springbok", "De Aar", "Kuruman"],
};

const CAR_BRANDS = [
  "Alfa Romeo", "Audi", "BAIC", "Bentley", "BMW", "BYD", "Chery",
  "Chevrolet", "Citroën", "Daihatsu", "Ferrari", "Fiat", "Ford",
  "GWM", "Haval", "Honda", "Hyundai", "Infiniti", "Isuzu", "Jaguar",
  "Jeep", "Kia", "Lamborghini", "Land Rover", "Lexus", "Mahindra",
  "Maserati", "Mazda", "Mercedes-Benz", "MG", "Mini", "Mitsubishi",
  "Nissan", "Opel", "Peugeot", "Porsche", "Renault", "Rolls-Royce",
  "SEAT", "Skoda", "Subaru", "Suzuki", "Tata", "Toyota", "Volkswagen", "Volvo",
];

const QUICK_BRANDS = ["Toyota", "Volkswagen", "Hyundai", "Ford", "BMW", "Mercedes-Benz", "Audi", "Kia", "Nissan"];

const YEARS_LICENSED_MAP: Record<string, number> = {
  "less-than-1": 0, "1-3": 2, "3-5": 4, "5-plus": 6,
};

// ─── Validation ──────────────────────────────────────────────────────────────

function validateSaId(id: string): string | null {
  if (!id) return null;
  if (!/^\d+$/.test(id)) return "Must contain only numbers";
  if (id.length !== 13) return "Must be 13 digits";
  const yy = parseInt(id.substring(0, 2), 10);
  const mm = parseInt(id.substring(2, 4), 10);
  const dd = parseInt(id.substring(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "Invalid date in ID number";
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const date = new Date(year, mm - 1, dd);
  if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd)
    return "Invalid date in ID number";
  let sum = 0;
  let alternate = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let n = parseInt(id[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  if (sum % 10 !== 0) return "Invalid ID number (checksum failed)";
  return null;
}

function extractAgeFromId(id: string): number | null {
  if (!id || id.length < 6) return null;
  const yy = parseInt(id.substring(0, 2), 10);
  const mm = parseInt(id.substring(2, 4), 10);
  const dd = parseInt(id.substring(4, 6), 10);
  const currentYY = new Date().getFullYear() % 100;
  const birthYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const today = new Date();
  const birth = new Date(birthYear, mm - 1, dd);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function extractGenderFromId(id: string): "male" | "female" | null {
  if (!id || id.length < 10) return null;
  const genderDigits = parseInt(id.substring(6, 10), 10);
  if (isNaN(genderDigits)) return null;
  return genderDigits >= 5000 ? "male" : "female";
}

function parseCurrency(value: string): number {
  const numeric = value.replace(/[^\d.]/g, "");
  return numeric ? parseFloat(numeric) : 0;
}

function sanitizeCurrency(value: string): string {
  let result = "";
  let hasDecimal = false;
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") result += ch;
    else if (ch === "." && !hasDecimal) { hasDecimal = true; result += ch; }
  }
  return result;
}

function getBrandDisplayName(value: string): string {
  const match = CAR_BRANDS.find((b) => b.toLowerCase() === value.toLowerCase());
  return match ?? (value.charAt(0).toUpperCase() + value.slice(1));
}

function parseBankStatementExpenses(text: string): {
  groceries: number;
  accounts: number;
  loans: number;
  other: number;
} | null {
  const GROCERY_KEYWORDS = [
    "woolworths", "woolies", "pick n pay", "pnp", "shoprite", "checkers",
    "spar", "food lovers", "food zone", "freshstop", "usave", "boxer",
    "ok foods", "fruit & veg", "fruit and veg",
  ];
  const ACCOUNT_KEYWORDS = [
    "edgars", "truworths", "foschini", "mr price", "mrp", "ackermans",
    "pep store", "legit", "store account", "clothing account", "tfg",
    "queenspark", "markham",
  ];
  const LOAN_KEYWORDS = [
    "loan", "credit card", "home loan", "vehicle finance", "wesbank",
    "repayment", "instalment", "installment", "bond payment", "mortgage",
    "african bank", "bayport", "directaxis", "direct axis",
    "capitec credit", "rcs", "debt repay",
  ];

  const lines = text.split("\n");
  let groceries = 0, accounts = 0, loans = 0;
  let found = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Match amounts that have cents (e.g. 1 250.00 or 1,250.00) — avoids
    // picking up year numbers like "2024" as transaction values.
    const amounts = [...line.matchAll(/\b(\d{1,3}(?:[,\s]\d{3})*\.\d{2})\b/g)]
      .map((m) => parseFloat(m[1].replace(/[,\s]/g, "")))
      .filter((v) => !isNaN(v) && v >= 10 && v <= 100_000);

    if (amounts.length === 0) continue;
    // Take the first matched amount — in most SA bank statement layouts
    // the transaction amount precedes the running balance on the same line.
    const amount = amounts[0];

    if (GROCERY_KEYWORDS.some((k) => lower.includes(k))) {
      groceries += amount; found = true;
    } else if (ACCOUNT_KEYWORDS.some((k) => lower.includes(k))) {
      accounts += amount; found = true;
    } else if (LOAN_KEYWORDS.some((k) => lower.includes(k))) {
      loans += amount; found = true;
    }
  }

  if (!found) return null;

  return {
    groceries: Math.round(groceries),
    accounts: Math.round(accounts),
    loans: Math.round(loans),
    other: 0,
  };
}

function parseSalaryFromText(text: string): number | null {
  const patterns = [
    /nett?\s+pay\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /nett?\s+salary\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /nett?\s+income\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /nett?\s+earnings\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /nett?\s+amount\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /take[- ]?home\s+pay\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /take[- ]?home\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
    /total\s+nett?\b[^\d]*?([\d\s,]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(/[\s,]/g, ""));
      if (!isNaN(val) && val > 500 && val < 10_000_000) return val;
    }
  }
  return null;
}

type Answers = Record<string, string>;
type Errors = Record<string, string>;

function validateAll(answers: Answers): Errors {
  const errors: Errors = {};

  if (!answers.first_name?.trim()) errors.first_name = "Required";
  if (!answers.last_name?.trim()) errors.last_name = "Required";
  if (!answers.gender) errors.gender = "Please select an option";
  if (!answers.location) errors.location = "Please select your province";
  if (!answers.city?.trim()) errors.city = "Please select or enter your city";

  if (!answers.net_salary?.trim()) {
    errors.net_salary = "Please upload your payslip to continue";
  } else {
    const val = parseCurrency(answers.net_salary);
    if (isNaN(val) || val <= 0) errors.net_salary = "Salary could not be read — please try uploading again";
  }

  if (!answers.id_number?.trim()) {
    errors.id_number = "Required";
  } else {
    const idErr = validateSaId(answers.id_number.trim());
    if (idErr) errors.id_number = idErr;
  }

  for (const key of ["expenses_groceries", "expenses_accounts", "expenses_loans"] as const) {
    if (!answers[key]?.trim()) {
      errors[key] = "Required";
    } else {
      const val = parseCurrency(answers[key]);
      if (isNaN(val) || val < 0) errors[key] = "Amount must be R 0 or more";
    }
  }
  if (answers.expenses_other?.trim()) {
    const val = parseCurrency(answers.expenses_other);
    if (isNaN(val) || val < 0) errors.expenses_other = "Amount must be R 0 or more";
  }

  if (!answers.years_licenced) errors.years_licenced = "Please select an option";
  else if (answers.id_number?.trim()) {
    const age = extractAgeFromId(answers.id_number.trim());
    const yrs = YEARS_LICENSED_MAP[answers.years_licenced] ?? 0;
    if (age !== null && yrs > age) errors.years_licenced = "Years licensed exceeds your age";
  }

  return errors;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><span>↳</span>{message}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, error, maxLength, inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:ring-2 focus:ring-gray-900/10 ${
          error ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-gray-400"
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}

function CurrencyInput({
  value, onChange, placeholder, error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <div className={`flex items-center rounded-lg border transition-colors focus-within:ring-2 focus-within:ring-gray-900/10 ${
        error ? "border-red-300 focus-within:border-red-400" : "border-gray-200 focus-within:border-gray-400"
      }`}>
        <span className="pl-3 pr-1.5 text-sm font-medium text-gray-400 select-none">R</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(sanitizeCurrency(e.target.value))}
          placeholder={placeholder ?? "0"}
          className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function ChipGroup({
  options, value, onChange, error,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-150 ${
              value === opt.value
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}

function SelectInput({
  options, value, onChange, placeholder, error, disabled,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-gray-900/10 disabled:opacity-40 disabled:cursor-not-allowed ${
          value ? "text-gray-900" : "text-gray-400"
        } ${error ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-gray-400"}`}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

function BrandMultiSelect({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = value ? value.split(",").filter(Boolean) : [];

  function toggle(brand: string) {
    const lower = brand.toLowerCase();
    const next = selected.includes(lower)
      ? selected.filter((b) => b !== lower)
      : [...selected, lower];
    onChange(next.join(","));
  }

  const filtered = search.trim()
    ? CAR_BRANDS.filter(
        (b) =>
          b.toLowerCase().includes(search.toLowerCase()) &&
          !selected.includes(b.toLowerCase())
      )
    : [];

  const showCustom =
    search.trim().length > 0 &&
    !CAR_BRANDS.some((b) => b.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-3">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
            >
              {getBrandDisplayName(val)}
              <button
                type="button"
                onClick={() => toggle(val)}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${getBrandDisplayName(val)}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Quick-pick chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_BRANDS.filter((b) => !selected.includes(b.toLowerCase())).map((brand) => (
          <button
            key={brand}
            type="button"
            onClick={() => toggle(brand)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            {brand}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => setTimeout(() => setSearch(""), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const trimmed = search.trim();
              if (!trimmed) return;
              const match = CAR_BRANDS.find((b) => b.toLowerCase() === trimmed.toLowerCase());
              const val = (match ?? trimmed).toLowerCase();
              if (!selected.includes(val)) toggle(val);
              setSearch("");
            }
            if (e.key === "Escape") setSearch("");
          }}
          placeholder="Search any brand…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-colors"
        />
        {(filtered.length > 0 || showCustom) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {filtered.map((brand) => (
              <button
                key={brand}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); toggle(brand); setSearch(""); }}
                className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {brand}
              </button>
            ))}
            {showCustom && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const val = search.trim().toLowerCase();
                  if (!selected.includes(val)) toggle(val);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span className="font-bold">+</span> Add &ldquo;{search.trim()}&rdquo;
              </button>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">Optional — select all that apply</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function FormPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const payslipInputRef = useRef<HTMLInputElement>(null);
  const [payslipStatus, setPayslipStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payslipError, setPayslipError] = useState("");
  const bankInputRef = useRef<HTMLInputElement>(null);
  const [bankStatus, setBankStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bankError, setBankError] = useState("");

  function set(key: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "location") next.city = "";
      if (key === "id_number") {
        const gender = extractGenderFromId(value);
        if (gender) next.gender = gender;
      }
      return next;
    });
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  async function handlePayslipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setPayslipStatus("error");
      setPayslipError("Please upload a PDF file.");
      return;
    }
    setPayslipStatus("loading");
    setPayslipError("");
    try {
      const { extractText } = await import("unpdf");
      const buffer = await file.arrayBuffer();
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      const salary = parseSalaryFromText(text);
      if (salary !== null) {
        set("net_salary", String(Math.round(salary)));
        setPayslipStatus("success");
      } else {
        setPayslipStatus("error");
        setPayslipError("Couldn't find net salary in this payslip. Please try a different file.");
      }
    } catch {
      setPayslipStatus("error");
      setPayslipError("Failed to read the PDF. Please try a different file.");
    }
  }

  async function handleBankUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      setBankStatus("error");
      setBankError("Please upload a PDF file.");
      return;
    }
    setBankStatus("loading");
    setBankError("");
    try {
      const { extractText } = await import("unpdf");
      const buffer = await file.arrayBuffer();
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });

      let expenses: { groceries: number; accounts: number; loans: number; other: number } | null = null;

      try {
        expenses = await analyzeExpenses(text);
      } catch {
        // AI unavailable — fall back to regex parsing
        expenses = parseBankStatementExpenses(text);
      }

      if (expenses !== null) {
        set("expenses_groceries", String(expenses.groceries));
        set("expenses_accounts", String(expenses.accounts));
        set("expenses_loans", String(expenses.loans));
        set("expenses_other", String(expenses.other));
        setBankStatus("success");
      } else {
        setBankStatus("error");
        setBankError("Couldn't find expenses in this statement. Please enter them manually.");
      }
    } catch {
      setBankStatus("error");
      setBankError("Failed to read the PDF. Please enter your expenses manually.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validateAll(answers);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      setTimeout(() => {
        const el = document.querySelector("[data-field-error]");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const userId = sessionStorage.getItem("user_id") ?? undefined;
      const email = sessionStorage.getItem("user_email") ?? undefined;

      // Step 1: save profile + credit score (no DB recommendations generated)
      const result = await submitQuestionnaire(answers, userId, email);
      sessionStorage.setItem("form_answers", JSON.stringify(answers));
      sessionStorage.setItem("credit_score", String(result.creditScore));

      // Step 2: AI does a live search and returns recommendations
      // Works for both logged-in users (userId) and guests (raw profile data)
      const resolvedUserId = result.userId ?? userId;
      const aiPayload = resolvedUserId
        ? { userId: resolvedUserId }
        : {
            netSalary: parseCurrency(answers.net_salary ?? "0"),
            creditScore: result.creditScore,
            location: answers.location,
            yearsLicensed: YEARS_LICENSED_MAP[answers.years_licenced] ?? undefined,
          };

      const rawRecs = await generateAiRecommendations(aiPayload);
      // Ensure total always equals sum of components
      const aiRecs = rawRecs.map((r) => {
        const total = r.loanCost + r.insuranceCost + r.fuelCost + r.maintenanceCost;
        return total > 0 ? { ...r, estimatedMonthlyCost: total } : r;
      });
      sessionStorage.setItem("recommendations", JSON.stringify(aiRecs));
      sessionStorage.setItem("result_source", "ai");

      router.push("/dashboard");
    } catch (err) {
      console.error('[Form submit error]', err);
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const citiesForProvince = SA_PROVINCE_CITIES[answers.location ?? ""] ?? [];

  return (
    <div className="min-h-screen bg-white">
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-gray-200 border-t-gray-900 animate-spin" />
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900">Finding your perfect car…</p>
            <p className="mt-0.5 text-xs text-gray-500">Searching the internet for real listings and insurance quotes</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 py-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#111827"/>
            <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
            <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
            <circle cx="10" cy="20.5" r="2" fill="#111827"/>
            <circle cx="18" cy="20.5" r="2" fill="#111827"/>
          </svg>
          <span className="text-sm font-semibold text-gray-900">FirstCar</span>
        </div>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Skip →
        </button>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="mx-auto max-w-2xl px-6 py-12">

          {/* Page heading */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Find your first car</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Tell us about yourself and we&apos;ll match you with cars that fit your budget and lifestyle.
            </p>
            {isUsingMockData() && (
              <span className="mt-3 inline-block rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700">
                Mock data mode
              </span>
            )}
          </div>

          <div className="space-y-12">

            {/* ── About you ── */}
            <section>
              <SectionHeading>About you</SectionHeading>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div data-field-error={errors.first_name ? "" : undefined}>
                    <FieldLabel required>First name</FieldLabel>
                    <TextInput
                      value={answers.first_name ?? ""}
                      onChange={(v) => set("first_name", v)}
                      placeholder="Thabo"
                      error={errors.first_name}
                    />
                  </div>
                  <div data-field-error={errors.last_name ? "" : undefined}>
                    <FieldLabel required>Last name</FieldLabel>
                    <TextInput
                      value={answers.last_name ?? ""}
                      onChange={(v) => set("last_name", v)}
                      placeholder="Nkosi"
                      error={errors.last_name}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Location ── */}
            <section>
              <SectionHeading>Location</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div data-field-error={errors.location ? "" : undefined}>
                  <FieldLabel required>Province</FieldLabel>
                  <SelectInput
                    options={SA_PROVINCES}
                    value={answers.location ?? ""}
                    onChange={(v) => set("location", v)}
                    placeholder="Select province…"
                    error={errors.location}
                  />
                </div>
                <div data-field-error={errors.city ? "" : undefined}>
                  <FieldLabel required>City</FieldLabel>
                  {citiesForProvince.length > 0 ? (
                    <div>
                      <SelectInput
                        options={citiesForProvince}
                        value={citiesForProvince.includes(answers.city ?? "") ? (answers.city ?? "") : ""}
                        onChange={(v) => set("city", v)}
                        placeholder="Select city…"
                        disabled={!answers.location}
                        error={!citiesForProvince.includes(answers.city ?? "") ? undefined : errors.city}
                      />
                      {answers.location && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={citiesForProvince.includes(answers.city ?? "") ? "" : (answers.city ?? "")}
                            onChange={(e) => set("city", e.target.value)}
                            placeholder="Or type your city…"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-900/10 transition-colors"
                          />
                        </div>
                      )}
                      <FieldError message={errors.city} />
                    </div>
                  ) : (
                    <div>
                      <TextInput
                        value={answers.city ?? ""}
                        onChange={(v) => set("city", v)}
                        placeholder={answers.location ? "Type your city…" : "Select province first"}
                        error={errors.city}
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Finances ── */}
            <section>
              <SectionHeading>Finances</SectionHeading>
              <div className="space-y-5">
                <div data-field-error={errors.id_number ? "" : undefined}>
                  <FieldLabel required>South African ID number</FieldLabel>
                  <p className="text-xs text-gray-400 mb-1.5">Used to determine your credit score securely</p>
                  <TextInput
                    value={answers.id_number ?? ""}
                    onChange={(v) => set("id_number", v.replace(/\D/g, "").slice(0, 13))}
                    placeholder="9001015009087"
                    error={errors.id_number}
                    maxLength={13}
                    inputMode="numeric"
                  />
                </div>

                {(answers.id_number ?? "").length >= 10 && answers.gender && (
                  <div data-field-error={errors.gender ? "" : undefined}>
                    <FieldLabel required>Gender</FieldLabel>
                    <ChipGroup
                      options={[
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                      ].filter((opt) => opt.value === answers.gender)}
                      value={answers.gender}
                      onChange={(v) => set("gender", v)}
                      error={errors.gender}
                    />
                  </div>
                )}

                <div data-field-error={errors.net_salary ? "" : undefined}>
                  <FieldLabel required>Monthly net salary</FieldLabel>
                  <p className="text-xs text-gray-400 mb-2">Your take-home pay after tax (20% becomes your car budget)</p>
                  <input
                    ref={payslipInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePayslipUpload}
                  />
                  {payslipStatus === "success" && answers.net_salary ? (
                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-green-600 shrink-0"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span className="text-sm font-semibold text-green-800">
                          R {Number(answers.net_salary).toLocaleString("en-ZA")}
                        </span>
                        <span className="text-xs text-green-600">extracted from payslip</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { set("net_salary", ""); setPayslipStatus("idle"); setPayslipError(""); }}
                        className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => payslipInputRef.current?.click()}
                      disabled={payslipStatus === "loading"}
                      className={`w-full rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        errors.net_salary
                          ? "border-red-300 hover:border-red-400"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {payslipStatus === "loading" ? (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span className="text-sm text-gray-500">Reading payslip…</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-gray-400">
                            <path d="M2 12v2h12v-2M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div>
                            <p className={`text-sm font-medium ${errors.net_salary ? "text-red-500" : "text-gray-600"}`}>
                              Upload your payslip PDF
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">We'll extract your net salary automatically</p>
                          </div>
                        </div>
                      )}
                    </button>
                  )}
                  {payslipStatus === "error" && payslipError && (
                    <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                      <span>↳</span>{payslipError}
                    </p>
                  )}
                  {errors.net_salary && payslipStatus !== "error" && (
                    <FieldError message={errors.net_salary} />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Monthly expenses</p>
                    <button
                      type="button"
                      onClick={() => bankInputRef.current?.click()}
                      disabled={bankStatus === "loading"}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {bankStatus === "loading" ? (
                        <>
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Reading…
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M2 12v2h12v-2M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Upload bank statement
                        </>
                      )}
                    </button>
                    <input
                      ref={bankInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleBankUpload}
                    />
                  </div>

                  {bankStatus === "error" && bankError && (
                    <p className="mb-3 text-xs text-amber-600 flex items-center gap-1">
                      <span>↳</span>{bankError}
                    </p>
                  )}

                  {bankStatus === "success" ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 overflow-hidden">
                      {[
                        { label: "Groceries",          key: "expenses_groceries" },
                        { label: "Accounts",           key: "expenses_accounts" },
                        { label: "Loans / credit cards", key: "expenses_loans" },
                        { label: "Other expenses",     key: "expenses_other" },
                      ].map(({ label, key }, i, arr) => (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-4 py-2.5 ${i < arr.length - 1 ? "border-b border-green-100" : ""}`}
                        >
                          <span className="text-xs text-green-700">{label}</span>
                          <span className="text-sm font-semibold text-green-800">
                            R {Number(answers[key] ?? 0).toLocaleString("en-ZA")}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2 border-t border-green-200 bg-green-100/50">
                        <div className="flex items-center gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-green-600"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className="text-xs text-green-600">Extracted from bank statement</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            set("expenses_groceries", "");
                            set("expenses_accounts", "");
                            set("expenses_loans", "");
                            set("expenses_other", "");
                            setBankStatus("idle");
                            setBankError("");
                          }}
                          className="text-xs text-green-600 hover:text-green-800 underline underline-offset-2 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div data-field-error={errors.expenses_groceries ? "" : undefined}>
                        <FieldLabel required>Groceries</FieldLabel>
                        <CurrencyInput
                          value={answers.expenses_groceries ?? ""}
                          onChange={(v) => set("expenses_groceries", v)}
                          placeholder="3 000"
                          error={errors.expenses_groceries}
                        />
                      </div>
                      <div data-field-error={errors.expenses_accounts ? "" : undefined}>
                        <FieldLabel required>Accounts</FieldLabel>
                        <CurrencyInput
                          value={answers.expenses_accounts ?? ""}
                          onChange={(v) => set("expenses_accounts", v)}
                          placeholder="1 500"
                          error={errors.expenses_accounts}
                        />
                      </div>
                      <div data-field-error={errors.expenses_loans ? "" : undefined}>
                        <FieldLabel required>Loans / credit cards</FieldLabel>
                        <CurrencyInput
                          value={answers.expenses_loans ?? ""}
                          onChange={(v) => set("expenses_loans", v)}
                          placeholder="2 000"
                          error={errors.expenses_loans}
                        />
                      </div>
                      <div data-field-error={errors.expenses_other ? "" : undefined}>
                        <FieldLabel>Other expenses</FieldLabel>
                        <CurrencyInput
                          value={answers.expenses_other ?? ""}
                          onChange={(v) => set("expenses_other", v)}
                          placeholder="500"
                          error={errors.expenses_other}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Driving experience ── */}
            <section>
              <SectionHeading>Driving experience</SectionHeading>
              <div data-field-error={errors.years_licenced ? "" : undefined}>
                <FieldLabel required>How long have you been licensed?</FieldLabel>
                <ChipGroup
                  options={[
                    { value: "less-than-1", label: "Less than 1 year" },
                    { value: "1-3", label: "1 – 3 years" },
                    { value: "3-5", label: "3 – 5 years" },
                    { value: "5-plus", label: "5+ years" },
                  ]}
                  value={answers.years_licenced ?? ""}
                  onChange={(v) => set("years_licenced", v)}
                  error={errors.years_licenced}
                />
              </div>
            </section>


          </div>

          {/* Submit */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            {submitError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {Object.keys(errors).length > 0 && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Please fix the highlighted fields above before continuing.
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 active:bg-gray-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Analysing…" : "Find my cars"}
                {!isSubmitting && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
