"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  isUsingMockData,
  submitQuestionnaire,
  type Recommendation,
} from "@/lib/recommendations";

type QuestionType = "text" | "email" | "tel" | "textarea" | "choice";

interface ChoiceOption {
  value: string;
  label: string;
  key: string;
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
  allowOther?: boolean;
}

const questions: Question[] = [
  {
    id: "gender",
    number: 1,
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
    number: 2,
    label: "What city are you based in?",
    type: "text",
    placeholder: "Cape Town",
    required: true,
  },
  {
    id: "net_salary",
    number: 3,
    label: "What is your monthly net salary?",
    description: "This helps us recommend cars within your affordability range.",
    type: "text",
    placeholder: "R 25,000",
    required: true,
  },
  {
    id: "credit_score",
    number: 4,
    label: "What is your credit score range?",
    type: "choice",
    required: true,
    options: [
      { value: "below-600", label: "Below 600 (Poor)", key: "A" },
      { value: "600-699", label: "600 - 699 (Fair)", key: "B" },
      { value: "700-749", label: "700 - 749 (Good)", key: "C" },
      { value: "750-plus", label: "750+ (Excellent)", key: "D" },
    ],
  },
  {
    id: "years_licenced",
    number: 5,
    label: "How long have you been licenced?",
    type: "choice",
    required: true,
    options: [
      { value: "less-than-1", label: "Less than 1 year", key: "A" },
      { value: "1-3", label: "1 - 3 years", key: "B" },
      { value: "3-5", label: "3 - 5 years", key: "C" },
      { value: "5-plus", label: "5+ years", key: "D" },
    ],
  },
  {
    id: "preferred_brand",
    number: 6,
    label: "Which car brand do you prefer?",
    type: "choice",
    required: false,
    allowOther: true,
    options: [
      { value: "toyota", label: "Toyota", key: "A" },
      { value: "volkswagen", label: "Volkswagen", key: "B" },
      { value: "hyundai", label: "Hyundai", key: "C" },
      { value: "ford", label: "Ford", key: "D" },
    ],
  },
  {
    id: "car_type",
    number: 7,
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
    number: 8,
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
    number: 9,
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

export default function FormPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");
  const [direction, setDirection] = useState<Direction>("forward");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

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

  function animateTo(nextStep: number, dir: Direction) {
    if (isAnimating) return;

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

    if (question.required && !answer.trim()) {
      setError("Please fill in this field to continue.");
      return;
    }

    setError("");

    if (step === questions.length - 1) {
      setSubmissionError("");
      setIsSubmitting(true);

      try {
        const userId = sessionStorage.getItem("user_id") ?? "";
        const email = sessionStorage.getItem("user_email") ?? "";
        const result = await submitQuestionnaire(answers, userId, email);

        sessionStorage.setItem("recommendations", JSON.stringify(result.recommendations));
        sessionStorage.setItem("result_source", result.source);
        sessionStorage.setItem("form_answers", JSON.stringify(answers));

        router.push("/dashboard");
      } catch (err) {
        setSubmissionError(
          err instanceof Error
            ? err.message
            : "Something went wrong while submitting your answers.",
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    animateTo(step + 1, "forward");
  }

  function goBack() {
    if (isAnimating || isSubmitting || step === 0) return;

    setError("");
    animateTo(step - 1, "back");
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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-gray-900">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

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
            {question.type === "choice" && question.options ? (
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
              <input
                ref={inputRef}
                type={question.type}
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
                className="w-full border-b-2 border-gray-300 bg-transparent py-3 text-xl text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-blue-500"
              />
            )}

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                <span>⚠</span> {error}
              </p>
            )}

            {submissionError && step === questions.length - 1 && (
              <p className="mt-3 text-sm text-red-500">{submissionError}</p>
            )}

            {step === questions.length - 1 && (
              <p className="mt-3 text-xs text-gray-400">
                {isUsingMockData()
                  ? "Mock data mode is enabled."
                  : "Submitting to the live backend and database."}
              </p>
            )}
          </div>

          {(question.type !== "choice" ||
            (question.allowOther &&
              !question.options?.some(
                (option) => option.value === answers[question.id],
              ) &&
              (answers[question.id] ?? "").trim() !== "")) && (
            <div className="mt-7 flex items-center gap-4">
              <button
                onClick={() => void goNext()}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {step === questions.length - 1
                  ? isSubmitting
                    ? "Submitting..."
                    : "Submit"
                  : "OK"}
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
    </div>
  );
}
