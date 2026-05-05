"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  isUsingMockData,
  submitQuestionnaire,
  type Recommendation,
} from "@/lib/recommendations";

type QuestionType = "text" | "email" | "tel" | "textarea" | "choice" | "select" | "multi-select";

interface ChoiceOption {
  value: string;
  label: string;
  key: string;
}

interface SelectOption {
  value: string;
  label: string;
}

interface Question {
  id: string;
  number: number;
  label: string;
  description?: string;
  type: QuestionType;
  placeholder?: string;
  required: boolean;
  options?: ChoiceOption[];
  selectOptions?: SelectOption[];
  allowOther?: boolean;
}

const SA_PROVINCES: SelectOption[] = [
  { value: "Gauteng", label: "Gauteng" },
  { value: "Western Cape", label: "Western Cape" },
  { value: "KwaZulu-Natal", label: "KwaZulu-Natal" },
  { value: "Eastern Cape", label: "Eastern Cape" },
  { value: "Limpopo", label: "Limpopo" },
  { value: "Mpumalanga", label: "Mpumalanga" },
  { value: "North West", label: "North West" },
  { value: "Free State", label: "Free State" },
  { value: "Northern Cape", label: "Northern Cape" },
];

const SA_PROVINCE_CITIES: Record<string, SelectOption[]> = {
  Gauteng: [
    { value: "Johannesburg", label: "Johannesburg" },
    { value: "Pretoria", label: "Pretoria" },
    { value: "Centurion", label: "Centurion" },
    { value: "Sandton", label: "Sandton" },
    { value: "Randburg", label: "Randburg" },
    { value: "Roodepoort", label: "Roodepoort" },
    { value: "Soweto", label: "Soweto" },
    { value: "Benoni", label: "Benoni" },
    { value: "Boksburg", label: "Boksburg" },
    { value: "Ekurhuleni", label: "Ekurhuleni (East Rand)" },
  ],
  "Western Cape": [
    { value: "Cape Town", label: "Cape Town" },
    { value: "Bellville", label: "Bellville" },
    { value: "Stellenbosch", label: "Stellenbosch" },
    { value: "Paarl", label: "Paarl" },
    { value: "Somerset West", label: "Somerset West" },
    { value: "Worcester", label: "Worcester" },
    { value: "George", label: "George" },
    { value: "Knysna", label: "Knysna" },
    { value: "Mossel Bay", label: "Mossel Bay" },
  ],
  "KwaZulu-Natal": [
    { value: "Durban", label: "Durban" },
    { value: "Pietermaritzburg", label: "Pietermaritzburg" },
    { value: "Richards Bay", label: "Richards Bay" },
    { value: "Newcastle", label: "Newcastle" },
    { value: "Pinetown", label: "Pinetown" },
    { value: "Empangeni", label: "Empangeni" },
    { value: "Ladysmith", label: "Ladysmith" },
    { value: "Amanzimtoti", label: "Amanzimtoti" },
  ],
  "Eastern Cape": [
    { value: "Gqeberha", label: "Gqeberha (Port Elizabeth)" },
    { value: "East London", label: "East London" },
    { value: "Mthatha", label: "Mthatha" },
    { value: "Queenstown", label: "Queenstown" },
    { value: "Makhanda", label: "Makhanda (Grahamstown)" },
  ],
  Limpopo: [
    { value: "Polokwane", label: "Polokwane" },
    { value: "Tzaneen", label: "Tzaneen" },
    { value: "Phalaborwa", label: "Phalaborwa" },
    { value: "Louis Trichardt", label: "Louis Trichardt" },
    { value: "Mokopane", label: "Mokopane" },
    { value: "Bela-Bela", label: "Bela-Bela" },
  ],
  Mpumalanga: [
    { value: "Nelspruit", label: "Nelspruit (Mbombela)" },
    { value: "Witbank", label: "Witbank (eMalahleni)" },
    { value: "Secunda", label: "Secunda" },
    { value: "Middelburg", label: "Middelburg" },
    { value: "Barberton", label: "Barberton" },
  ],
  "North West": [
    { value: "Mahikeng", label: "Mahikeng (Mafikeng)" },
    { value: "Rustenburg", label: "Rustenburg" },
    { value: "Klerksdorp", label: "Klerksdorp" },
    { value: "Potchefstroom", label: "Potchefstroom" },
    { value: "Brits", label: "Brits" },
  ],
  "Free State": [
    { value: "Bloemfontein", label: "Bloemfontein" },
    { value: "Welkom", label: "Welkom" },
    { value: "Bethlehem", label: "Bethlehem" },
    { value: "Kroonstad", label: "Kroonstad" },
    { value: "Phuthaditjhaba", label: "Phuthaditjhaba" },
  ],
  "Northern Cape": [
    { value: "Kimberley", label: "Kimberley" },
    { value: "Upington", label: "Upington" },
    { value: "Springbok", label: "Springbok" },
    { value: "De Aar", label: "De Aar" },
    { value: "Kuruman", label: "Kuruman" },
  ],
};

const CAR_BRANDS = [
  'Alfa Romeo', 'Audi', 'BAIC', 'Bentley', 'BMW', 'BYD', 'Chery',
  'Chevrolet', 'Citroën', 'Daihatsu', 'Ferrari', 'Fiat', 'Ford',
  'GWM', 'Haval', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu', 'Jaguar',
  'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'Lexus', 'Mahindra',
  'Maserati', 'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
  'Nissan', 'Opel', 'Peugeot', 'Porsche', 'Renault', 'Rolls-Royce',
  'SEAT', 'Skoda', 'Subaru', 'Suzuki', 'Tata', 'Toyota',
  'Volkswagen', 'Volvo',
];

function getBrandLabel(value: string, options?: { value: string; label: string }[]): string {
  const opt = options?.find((o) => o.value === value);
  if (opt) return opt.label;
  const brand = CAR_BRANDS.find((b) => b.toLowerCase() === value.toLowerCase());
  if (brand) return brand;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// SA ID validation utilities
function validateSaId(id: string): string | null {
  if (!id) return null;
  if (!/^\d+$/.test(id)) return "ID number must contain only numbers";
  if (id.length !== 13) return "ID number must be 13 digits";

  const yy = parseInt(id.substring(0, 2), 10);
  const mm = parseInt(id.substring(2, 4), 10);
  const dd = parseInt(id.substring(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "Invalid date in ID number";
  const currentYY = new Date().getFullYear() % 100;
  const year = yy <= currentYY ? 2000 + yy : 1900 + yy;
  const date = new Date(year, mm - 1, dd);
  if (date.getFullYear() !== year || date.getMonth() !== mm - 1 || date.getDate() !== dd) {
    return "Invalid date in ID number";
  }

  // Luhn checksum
  let sum = 0;
  let alternate = false;
  for (let i = id.length - 1; i >= 0; i--) {
    let n = parseInt(id[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  if (sum % 10 !== 0) return "Invalid ID number";

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

const YEARS_LICENSED_NUM: Record<string, number> = {
  "less-than-1": 0,
  "1-3": 2,
  "3-5": 4,
  "5-plus": 6,
};

const questions: Question[] = [
  {
    id: "first_name",
    number: 1,
    label: "What's your first name?",
    type: "text",
    placeholder: "e.g. Thabo",
    required: true,
  },
  {
    id: "last_name",
    number: 2,
    label: "And your last name?",
    type: "text",
    placeholder: "e.g. Nkosi",
    required: true,
  },
  {
    id: "gender",
    number: 3,
    label: "What's your gender?",
    type: "choice",
    required: true,
    options: [
      { value: "male", label: "Male", key: "A" },
      { value: "female", label: "Female", key: "B" },
      { value: "non-binary", label: "Non-binary", key: "C" },
      { value: "prefer-not-to-say", label: "Prefer not to say", key: "D" },
    ],
  },
  {
    id: "location",
    number: 4,
    label: "Which province are you based in?",
    description: "Select your province from the list.",
    type: "select",
    required: true,
    selectOptions: SA_PROVINCES,
  },
  {
    id: "city",
    number: 5,
    label: "Which city are you in?",
    description: "Select your city within the selected province.",
    type: "select",
    required: true,
    selectOptions: [],
  },
  {
    id: "net_salary",
    number: 6,
    label: "What is your monthly net salary?",
    description: "This helps us recommend cars within your affordability range.",
    type: "text",
    placeholder: "R 25,000",
    required: true,
  },
  {
    id: "id_number",
    number: 7,
    label: "What is your South African ID number?",
    description: "We use this to determine your credit score securely.",
    type: "text",
    placeholder: "e.g. 9001015009087",
    required: true,
  },
  {
    id: "expenses_groceries",
    number: 8,
    label: "How much do you spend on groceries monthly?",
    type: "text",
    placeholder: "R 3,000",
    required: true,
  },
  {
    id: "expenses_accounts",
    number: 9,
    label: "How much do you spend on accounts (clothing, etc) monthly?",
    type: "text",
    placeholder: "R 1,500",
    required: true,
  },
  {
    id: "expenses_loans",
    number: 10,
    label: "How much do you spend on loans/credit cards monthly?",
    type: "text",
    placeholder: "R 2,000",
    required: true,
  },
  {
    id: "expenses_other",
    number: 11,
    label: "Any other monthly expenses?",
    type: "text",
    placeholder: "R 500",
    required: false,
  },
  {
    id: "years_licenced",
    number: 12,
    label: "How long have you been licenced?",
    type: "choice",
    required: true,
    options: [
      { value: "less-than-1", label: "Less than 1 year", key: "A" },
      { value: "1-3", label: "1 – 3 years", key: "B" },
      { value: "3-5", label: "3 – 5 years", key: "C" },
      { value: "5-plus", label: "5+ years", key: "D" },
    ],
  },
  {
    id: "preferred_brand",
    number: 13,
    label: "Which car brands do you prefer?",
    description: "Select one or more brands. This is optional.",
    type: "multi-select",
    required: false,
    options: [
      { value: "toyota", label: "Toyota", key: "A" },
      { value: "volkswagen", label: "Volkswagen", key: "B" },
      { value: "hyundai", label: "Hyundai", key: "C" },
      { value: "ford", label: "Ford", key: "D" },
      { value: "bmw", label: "BMW", key: "E" },
      { value: "mercedes", label: "Mercedes-Benz", key: "F" },
      { value: "audi", label: "Audi", key: "G" },
      { value: "kia", label: "Kia", key: "H" },
      { value: "nissan", label: "Nissan", key: "I" },
    ],
  },
  {
    id: "car_type",
    number: 14,
    label: "What type of car are you looking for?",
    type: "choice",
    required: true,
    options: [
      { value: "hatchback", label: "Hatchback", key: "A" },
      { value: "sedan", label: "Sedan", key: "B" },
      { value: "suv", label: "SUV", key: "C" },
      { value: "bakkie", label: "Bakkie", key: "D" },
    ],
  },
  {
    id: "fuel_type",
    number: 15,
    label: "What fuel type do you prefer?",
    type: "choice",
    required: true,
    options: [
      { value: "petrol", label: "Petrol", key: "A" },
      { value: "diesel", label: "Diesel", key: "B" },
      { value: "hybrid", label: "Hybrid", key: "C" },
      { value: "electric", label: "Electric", key: "D" },
    ],
  },
  {
    id: "transmission",
    number: 16,
    label: "Do you prefer manual or automatic?",
    type: "choice",
    required: true,
    options: [
      { value: "manual", label: "Manual", key: "A" },
      { value: "automatic", label: "Automatic", key: "B" },
    ],
  },
];

type Phase = "visible" | "exiting" | "pre-enter" | "entering";
type Direction = "forward" | "back";

const REVIEW_FIELDS: {
  id: string;
  label: string;
  format: (v: string) => string;
}[] = [
  { id: "first_name", label: "First name", format: (v) => v },
  { id: "last_name", label: "Last name", format: (v) => v },
  { id: "gender", label: "Gender", format: (v) => ({ male: "Male", female: "Female", "non-binary": "Non-binary", "prefer-not-to-say": "Prefer not to say" }[v] ?? v) },
  { id: "location", label: "Province", format: (v) => v },
  { id: "city", label: "City", format: (v) => v },
  { id: "net_salary", label: "Monthly salary", format: (v) => v ? `R ${Math.round(parseFloat(v.replace(/[^\d.]/g, ""))).toLocaleString()}` : "—" },
  { id: "id_number", label: "ID number", format: (v) => v ? `••••••••• ${v.slice(-4)}` : "—" },
  { id: "expenses_groceries", label: "Groceries (monthly)", format: (v) => v ? `R ${Math.round(parseFloat(v.replace(/[^\d.]/g, ""))).toLocaleString()}` : "—" },
  { id: "expenses_accounts", label: "Accounts (monthly)", format: (v) => v ? `R ${Math.round(parseFloat(v.replace(/[^\d.]/g, ""))).toLocaleString()}` : "—" },
  { id: "expenses_loans", label: "Loans / credit cards", format: (v) => v ? `R ${Math.round(parseFloat(v.replace(/[^\d.]/g, ""))).toLocaleString()}` : "—" },
  { id: "expenses_other", label: "Other expenses", format: (v) => v ? `R ${Math.round(parseFloat(v.replace(/[^\d.]/g, ""))).toLocaleString()}` : "None" },
  { id: "years_licenced", label: "Years licensed", format: (v) => ({ "less-than-1": "Less than 1 year", "1-3": "1–3 years", "3-5": "3–5 years", "5-plus": "5+ years" }[v] ?? v) },
  { id: "preferred_brand", label: "Preferred brands", format: (v) => v ? v.split(",").map((b) => b.trim().charAt(0).toUpperCase() + b.trim().slice(1)).join(", ") : "None selected" },
  { id: "car_type", label: "Car type", format: (v) => ({ hatchback: "Hatchback", sedan: "Sedan", suv: "SUV", bakkie: "Bakkie" }[v] ?? v) },
  { id: "fuel_type", label: "Fuel type", format: (v) => ({ petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric" }[v] ?? v) },
  { id: "transmission", label: "Transmission", format: (v) => ({ manual: "Manual", automatic: "Automatic" }[v] ?? v) },
];

const CURRENCY_FIELDS = new Set([
  "net_salary",
  "expenses_groceries",
  "expenses_accounts",
  "expenses_loans",
  "expenses_other",
]);

function sanitizeCurrencyInput(value: string): string {
  // Allow digits and at most one decimal point, strip everything else
  let result = "";
  let hasDecimal = false;
  for (const ch of value) {
    if (ch >= "0" && ch <= "9") {
      result += ch;
    } else if (ch === "." && !hasDecimal) {
      hasDecimal = true;
      result += ch;
    }
  }
  return result;
}

function parseCurrencyValue(value: string): number {
  const numeric = value.replace(/[^\d.]/g, "");
  return numeric ? parseFloat(numeric) : 0;
}

function validateStep(question: Question, answer: string, answers: Record<string, string>): string {
  if (question.required && !answer.trim()) {
    if (question.id === "location") return "Please select your province";
    if (question.id === "city") return "Please select your city";
    if (question.id === "net_salary") return "Salary is required";
    if (question.id === "id_number") return "Please fill in this field to continue.";
    return "Please fill in this field to continue.";
  }

  if (question.id === "net_salary" && answer.trim()) {
    const val = parseCurrencyValue(answer);
    if (isNaN(val) || val <= 0) return "Please enter a valid salary greater than R 0";
  }

  if (CURRENCY_FIELDS.has(question.id) && question.id !== "net_salary" && answer.trim()) {
    const val = parseCurrencyValue(answer);
    if (isNaN(val) || val < 0) return "Amount must be R 0 or more";
  }

  if (question.id === "id_number" && answer.trim()) {
    const err = validateSaId(answer.trim());
    if (err) return err;
  }

  if (question.id === "years_licenced" && answer) {
    const idNumber = answers["id_number"] ?? "";
    const age = extractAgeFromId(idNumber);
    const yearsLicensed = YEARS_LICENSED_NUM[answer] ?? 0;
    if (age !== null && yearsLicensed > age) {
      return "Years licensed exceeds possible limit";
    }
  }

  return "";
}

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");
  const [direction, setDirection] = useState<Direction>("forward");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [brandSearch, setBrandSearch] = useState('');

  const question = questions[step];
  const isAnimating = phase !== "visible";
  const progress = (step / questions.length) * 100;

  const selectChoiceRef = useRef<(value: string) => void>(() => {});

  useEffect(() => {
    if (phase !== "visible") return;

    if (
      question.type === "text" ||
      question.type === "email" ||
      question.type === "tel"
    ) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timeoutId);
    }

    if (question.type === "textarea") {
      const timeoutId = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(timeoutId);
    }
  }, [step, phase, question.type]);

  useEffect(() => {
    if (question.type !== "choice" || isAnimating) return;

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!question.options) return;

      const match = question.options.find(
        (option) => option.key === event.key.toUpperCase(),
      );

      if (match) {
        selectChoiceRef.current(match.value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, isAnimating]);

  // Stamp the initial history entry so the browser back button has a state to pop to
  useEffect(() => {
    window.history.replaceState({ formStep: 0 }, "");
  }, []);

  // Handle browser back button — pop state triggers backward animation
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const targetStep = typeof event.state?.formStep === "number" ? event.state.formStep : null;
      if (targetStep === null || isAnimating || isSubmitting) return;

      setError("");
      setDirection("back");
      setPhase("exiting");

      setTimeout(() => {
        setStep(targetStep);
        setPhase("pre-enter");

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("entering");
            setTimeout(() => setPhase("visible"), 420);
          });
        });
      }, 260);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isAnimating, isSubmitting]);

  function animateTo(nextStep: number, dir: Direction) {
    if (isAnimating) return;

    if (dir === "forward") {
      window.history.pushState({ formStep: nextStep }, "");
    }

    setDirection(dir);
    setPhase("exiting");

    setTimeout(() => {
      setStep(nextStep);
      setPhase("pre-enter");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase("entering");
          setTimeout(() => setPhase("visible"), 420);
        });
      });
    }, 260);
  }

  async function goNext(overrideAnswer?: string) {
    if (isAnimating || isSubmitting) return;

    const answer = overrideAnswer ?? answers[question.id] ?? "";
    const validationError = validateStep(question, answer, answers);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");

    if (step === questions.length - 1) {
      setShowReview(true);
      return;
    }

    animateTo(step + 1, "forward");
  }

  function goBack() {
    if (isAnimating || isSubmitting || step === 0) return;
    setError("");
    window.history.back();
  }

  async function handleSubmit() {
    setSubmissionError("");
    setIsSubmitting(true);
    try {
      const userId = sessionStorage.getItem("user_id") ?? undefined;
      const email = sessionStorage.getItem("user_email") ?? undefined;
      const result = await submitQuestionnaire(answers, userId, email);
      sessionStorage.setItem("recommendations", JSON.stringify(result.recommendations));
      sessionStorage.setItem("result_source", result.source);
      sessionStorage.setItem("form_answers", JSON.stringify(answers));
      sessionStorage.setItem("credit_score", String(result.creditScore));
      router.push("/dashboard");
    } catch (err) {
      setSubmissionError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectChoice(value: string) {
    if (isAnimating || isSubmitting) return;

    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setError("");

    if (step < questions.length - 1) {
      setTimeout(() => animateTo(step + 1, "forward"), 350);
      return;
    }

    setTimeout(() => {
      void goNext(value);
    }, 350);
  }

  selectChoiceRef.current = selectChoice;

  function toggleMultiSelect(questionId: string, value: string) {
    setAnswers((prev) => {
      const current = (prev[questionId] ?? "").split(",").filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: next.join(",") };
    });
    if (error) setError("");
  }

  function handleInputKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (question.type === "textarea") {
      if (event.key === "Enter" && event.ctrlKey) {
        event.preventDefault();
        void goNext();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void goNext();
    }
  }

  function getStyle(): React.CSSProperties {
    const isMovingForward = direction === "forward";

    switch (phase) {
      case "visible":
        return {
          transform: "translateY(0)",
          opacity: 1,
          transition:
            "transform 0.4s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease",
        };
      case "exiting":
        return {
          transform: isMovingForward
            ? "translateY(-55px)"
            : "translateY(55px)",
          opacity: 0,
          transition: "transform 0.25s ease-in, opacity 0.25s ease-in",
          pointerEvents: "none",
        };
      case "pre-enter":
        return {
          transform: isMovingForward
            ? "translateY(55px)"
            : "translateY(-55px)",
          opacity: 0,
          transition: "none",
          pointerEvents: "none",
        };
      case "entering":
        return {
          transform: "translateY(0)",
          opacity: 1,
          transition:
            "transform 0.4s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease",
          pointerEvents: "none",
        };
    }
  }

  const showContinueButton =
    question.type !== "choice" ||
    (question.allowOther &&
      !question.options?.some((o) => o.value === answers[question.id]) &&
      (answers[question.id] ?? "").trim() !== "");

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-gray-900">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: showReview ? "100%" : `${progress}%` }}
        />
      </div>

      {/* Full-screen loading overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm gap-5">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
          <div className="text-center">
            <p className="text-base font-semibold text-gray-800">Analysing your profile…</p>
            <p className="mt-1 text-sm text-gray-500">Finding the best cars for your budget</p>
          </div>
        </div>
      )}

      {showReview ? (
        /* ── Review screen ── */
        <div className="flex flex-1 items-start justify-center px-6 py-16">
          <div className="w-full max-w-xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-500">
              Almost done
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
              Review your answers
            </h2>
            <p className="mt-2 text-gray-500">
              Make sure everything looks correct before we find your best cars.
            </p>

            <dl className="mt-8 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {REVIEW_FIELDS.map(({ id, label, format }) => {
                const raw = answers[id] ?? "";
                if (!raw && id !== "preferred_brand") return null;
                return (
                  <div key={id} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                    <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right">{format(raw)}</dd>
                  </div>
                );
              })}
            </dl>

            {submissionError && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {submissionError}
              </p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => { setShowReview(false); setSubmissionError(""); }}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                ← Edit answers
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting…" : "Confirm & submit"}
                {!isSubmitting && <span>→</span>}
              </button>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              {isUsingMockData() ? "Mock data mode is enabled." : "Submitting to the live backend."}
            </p>
          </div>
        </div>
      ) : (

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-xl" style={getStyle()}>
          <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-400">
            <span>{question.number}</span>
            <span className="text-gray-300">→</span>
          </p>

          <h2 className="text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
            {question.label}
            {question.required && <span className="ml-1 text-blue-500">*</span>}
          </h2>

          {question.description && (
            <p className="mt-2 text-gray-500">{question.description}</p>
          )}

          <div className="mt-8">
            {question.type === "select" ? (
              <div className="flex flex-col gap-3">
                {question.id === "city" && !answers.location && (
                  <p className="text-sm text-amber-600">Please go back and select your province first.</p>
                )}
                <select
                  value={
                    question.id === "city" &&
                    !(SA_PROVINCE_CITIES[answers.location ?? ""] ?? []).some(
                      (o) => o.value === answers.city
                    )
                      ? ""
                      : answers[question.id] ?? ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setAnswers((prev) => {
                      const next = { ...prev, [question.id]: val };
                      // clear city if province changes
                      if (question.id === "location") next.city = "";
                      return next;
                    });
                    if (error) setError("");
                  }}
                  disabled={question.id === "city" && !answers.location}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {question.id === "city" ? "Select your city..." : "Select your province..."}
                  </option>
                  {(question.id === "city"
                    ? SA_PROVINCE_CITIES[answers.location ?? ""] ?? []
                    : question.selectOptions ?? []
                  ).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {question.id === "city" && answers.location && (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-400">
                      Can&apos;t find your city? Type it below.
                    </p>
                    <input
                      type="text"
                      placeholder="e.g. Alberton, Midrand, Soweto..."
                      value={
                        (SA_PROVINCE_CITIES[answers.location ?? ""] ?? []).some(
                          (o) => o.value === answers.city
                        )
                          ? ""
                          : (answers.city ?? "")
                      }
                      onChange={(e) => {
                        setAnswers((prev) => ({ ...prev, city: e.target.value }));
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void goNext();
                        }
                      }}
                      className="w-full border-b-2 border-gray-300 bg-transparent py-2 text-base text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : question.type === "multi-select" && question.options ? (
              <div className="flex flex-col gap-4">
                {/* Selected brand tags */}
                {(answers[question.id] ?? "").split(",").filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(answers[question.id] ?? "").split(",").filter(Boolean).map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                      >
                        {getBrandLabel(val, question.options)}
                        <button
                          type="button"
                          onClick={() => toggleMultiSelect(question.id, val)}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 transition-colors text-xs"
                          aria-label={`Remove ${getBrandLabel(val, question.options)}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick-select grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {question.options.map((option) => {
                    const isSelected = (answers[question.id] ?? "").split(",").filter(Boolean).includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMultiSelect(question.id, option.value)}
                        className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                            isSelected
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-gray-300 text-gray-400"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search / custom brand input */}
                <div className="relative">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    onBlur={() => setTimeout(() => setBrandSearch(""), 150)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = brandSearch.trim();
                        if (!trimmed) return;
                        const match = CAR_BRANDS.find(
                          (b) => b.toLowerCase() === trimmed.toLowerCase(),
                        );
                        const val = (match ?? trimmed).toLowerCase();
                        if (!(answers[question.id] ?? "").split(",").filter(Boolean).includes(val)) {
                          toggleMultiSelect(question.id, val);
                        }
                        setBrandSearch("");
                      }
                      if (e.key === "Escape") setBrandSearch("");
                    }}
                    placeholder="Search or type any brand..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {brandSearch.trim() && (() => {
                    const alreadySelected = (answers[question.id] ?? "").split(",").filter(Boolean);
                    const filtered = CAR_BRANDS.filter(
                      (b) =>
                        b.toLowerCase().includes(brandSearch.toLowerCase()) &&
                        !alreadySelected.includes(b.toLowerCase()),
                    );
                    const showCustom =
                      brandSearch.trim().length > 0 &&
                      !CAR_BRANDS.some(
                        (b) => b.toLowerCase() === brandSearch.trim().toLowerCase(),
                      );

                    if (!filtered.length && !showCustom) return null;

                    return (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                        {filtered.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              toggleMultiSelect(question.id, brand.toLowerCase());
                              setBrandSearch("");
                            }}
                            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            {brand}
                          </button>
                        ))}
                        {showCustom && (
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const val = brandSearch.trim().toLowerCase();
                              if (!alreadySelected.includes(val)) {
                                toggleMultiSelect(question.id, val);
                              }
                              setBrandSearch("");
                            }}
                            className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-2.5 text-left text-sm text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <span className="font-bold">+</span> Add &ldquo;{brandSearch.trim()}&rdquo;
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <p className="text-xs text-gray-400">
                  Optional — select all that apply, or skip to continue
                </p>
              </div>
            ) : question.type === "choice" && question.options ? (
              <div className="flex flex-col gap-2.5">
                {question.options.map((option) => {
                  const selected = answers[question.id] === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => selectChoice(option.value)}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all duration-150 ${
                        selected
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                          selected
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300 text-gray-400"
                        }`}
                      >
                        {option.key}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}

                {question.allowOther && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <label className="text-xs text-gray-400">
                      Or type your own
                    </label>
                    <input
                      ref={otherInputRef}
                      type="text"
                      placeholder="e.g. BMW, Audi, Mercedes..."
                      value={
                        question.options.some(
                          (option) => option.value === answers[question.id],
                        )
                          ? ""
                          : (answers[question.id] ?? "")
                      }
                      onChange={(event) => {
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: event.target.value,
                        }));
                        if (error) setError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void goNext();
                        }
                      }}
                      className="w-full border-b-2 border-gray-300 bg-transparent py-2 text-base text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            ) : question.type === "textarea" ? (
              <textarea
                ref={textareaRef}
                value={answers[question.id] ?? ""}
                onChange={(event) => {
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: event.target.value,
                  }));
                  if (error) setError("");
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={question.placeholder}
                rows={4}
                className="w-full resize-none border-b-2 border-gray-300 bg-transparent py-3 text-xl text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500"
              />
            ) : (
              <div className={CURRENCY_FIELDS.has(question.id) ? "flex items-baseline gap-1" : undefined}>
                {CURRENCY_FIELDS.has(question.id) && (
                  <span className="text-xl font-medium text-gray-400 select-none">R</span>
                )}
                <input
                  ref={inputRef}
                  type={question.type}
                  inputMode={CURRENCY_FIELDS.has(question.id) ? "decimal" : undefined}
                  value={answers[question.id] ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    const cleaned = CURRENCY_FIELDS.has(question.id)
                      ? sanitizeCurrencyInput(raw)
                      : raw;
                    setAnswers((prev) => ({ ...prev, [question.id]: cleaned }));
                    if (error) setError("");
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder={CURRENCY_FIELDS.has(question.id) ? question.placeholder?.replace(/^R\s?/, "") : question.placeholder}
                  maxLength={question.id === "id_number" ? 13 : undefined}
                  className="w-full border-b-2 border-gray-300 bg-transparent py-3 text-xl text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500"
                />
              </div>
            )}

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                <span>⚠</span> {error}
              </p>
            )}

          </div>

          {(showContinueButton || question.type === "select") && (
            <div className="mt-7 flex items-center gap-4">
              <button
                onClick={() => void goNext()}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {step === questions.length - 1 ? "Review →" : "OK"}
                {step < questions.length - 1 && <span>✓</span>}
              </button>
              <span className="text-xs text-gray-400">
                press{" "}
                <kbd className="rounded border border-gray-300 px-1.5 py-0.5 font-mono text-gray-500">
                  {question.type === "textarea" ? "Ctrl+Enter" : "Enter ↵"}
                </kbd>
              </span>
            </div>
          )}
        </div>
      </div>

      )} {/* end review/question conditional */}

      {!showReview && (
        <>
          <div className="fixed bottom-6 left-6 flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {step + 1} / {questions.length}
            </span>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 transition-colors"
            >
              Go to dashboard
            </button>
          </div>

          <div className="fixed bottom-6 right-6 flex gap-2">
            <button
              onClick={goBack}
              disabled={step === 0 || isAnimating || isSubmitting}
              aria-label="Previous question"
              className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => void goNext()}
              disabled={isAnimating || isSubmitting}
              aria-label="Next question"
              className="flex h-9 w-9 items-center justify-center rounded border border-gray-300 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </>
      )}
    </div>
  );
}
