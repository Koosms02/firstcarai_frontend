"use client";

import { useState, useEffect, useRef } from "react";

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
    id: "name",
    number: 1,
    label: "What's your full name?",
    type: "text",
    placeholder: "Jane Dlamini",
    required: true,
  },
  {
    id: "email",
    number: 2,
    label: "What's your email address?",
    description: "We'll only use this to send you relevant updates.",
    type: "email",
    placeholder: "jane@example.co.za",
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
    label: "What city are you based in?",
    type: "text",
    placeholder: "Cape Town",
    required: true,
  },
  {
    id: "net_salary",
    number: 5,
    label: "What is your monthly net salary?",
    description: "This helps us recommend cars within your affordability range.",
    type: "text",
    placeholder: "R 25,000",
    required: true,
  },
  {
    id: "credit_score",
    number: 6,
    label: "What is your credit score range?",
    type: "choice",
    required: true,
    options: [
      { value: "below-600", label: "Below 600 (Poor)", key: "A" },
      { value: "600-699", label: "600 – 699 (Fair)", key: "B" },
      { value: "700-749", label: "700 – 749 (Good)", key: "C" },
      { value: "750-plus", label: "750+ (Excellent)", key: "D" },
    ],
  },
  {
    id: "years_licenced",
    number: 7,
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
    number: 8,
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
    number: 9,
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
    number: 10,
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
    number: 11,
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
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");
  const [direction, setDirection] = useState<Direction>("forward");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const question = questions[step];
  const isAnimating = phase !== "visible";
  const progress = (step / questions.length) * 100;

  // Keep a stable ref to selectChoice for use in the keydown effect
  const selectChoiceRef = useRef<(value: string) => void>(() => {});

  // Auto-focus text inputs when a question becomes visible
  useEffect(() => {
    if (phase !== "visible") return;
    if (question.type === "text" || question.type === "email" || question.type === "tel") {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    if (question.type === "textarea") {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [step, phase, question.type]);

  // Keyboard shortcuts for choice questions
  useEffect(() => {
    if (question.type !== "choice" || isAnimating) return;
    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept keys while user is typing in a text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!question.options) return;
      const match = question.options.find((o) => o.key === e.key.toUpperCase());
      if (match) selectChoiceRef.current(match.value);
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

  function goNext() {
    if (isAnimating) return;
    const answer = answers[question.id] ?? "";
    if (question.required && !answer.trim()) {
      setError("Please fill in this field to continue.");
      return;
    }
    setError("");
    if (step === questions.length - 1) {
      setSubmitted(true);
      return;
    }
    animateTo(step + 1, "forward");
  }

  function goBack() {
    if (isAnimating || step === 0) return;
    setError("");
    animateTo(step - 1, "back");
  }

  function selectChoice(value: string) {
    if (isAnimating) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setError("");
    if (step < questions.length - 1) {
      setTimeout(() => animateTo(step + 1, "forward"), 350);
    } else {
      setTimeout(() => setSubmitted(true), 350);
    }
  }
  selectChoiceRef.current = selectChoice;

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (question.type === "textarea") {
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        goNext();
      }
    } else {
      if (e.key === "Enter") {
        e.preventDefault();
        goNext();
      }
    }
  }

  function getStyle(): React.CSSProperties {
    const fwd = direction === "forward";
    switch (phase) {
      case "visible":
        return { transform: "translateY(0)", opacity: 1, transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease" };
      case "exiting":
        return { transform: fwd ? "translateY(-55px)" : "translateY(55px)", opacity: 0, transition: "transform 0.25s ease-in, opacity 0.25s ease-in", pointerEvents: "none" };
      case "pre-enter":
        return { transform: fwd ? "translateY(55px)" : "translateY(-55px)", opacity: 0, transition: "none", pointerEvents: "none" };
      case "entering":
        return { transform: "translateY(0)", opacity: 1, transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1), opacity 0.3s ease", pointerEvents: "none" };
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <span className="text-6xl">🎉</span>
          <h2 className="text-3xl font-bold text-white">All done!</h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Thanks for sharing. We'll reach out soon.
          </p>
          <a
            href="/"
            className="mt-2 text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-300 transition-colors"
          >
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-zinc-800">
        <div
          className="h-full bg-blue-400 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Centered question */}
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-xl" style={getStyle()}>
          {/* Step indicator */}
          <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-zinc-500">
            <span>{question.number}</span>
            <span className="text-zinc-700">→</span>
          </p>

          {/* Label */}
          <h2 className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
            {question.label}
            {question.required && <span className="ml-1 text-blue-400">*</span>}
          </h2>

          {question.description && (
            <p className="mt-2 text-zinc-400">{question.description}</p>
          )}

          {/* Input */}
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
                          ? "border-blue-400 bg-blue-400/10 text-white"
                          : "border-zinc-700 bg-zinc-900/50 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors ${
                          selected
                            ? "border-blue-400 bg-blue-400 text-zinc-950"
                            : "border-zinc-600 text-zinc-400"
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
                    <label className="text-xs text-zinc-500">Or type your own</label>
                    <input
                      ref={otherInputRef}
                      type="text"
                      placeholder="e.g. BMW, Audi, Mercedes..."
                      value={
                        question.options.some((o) => o.value === answers[question.id])
                          ? ""
                          : (answers[question.id] ?? "")
                      }
                      onChange={(e) => {
                        setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                        if (error) setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          goNext();
                        }
                      }}
                      className="w-full border-b-2 border-zinc-700 bg-transparent py-2 text-base text-white placeholder:text-zinc-600 outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                )}
              </div>
            ) : question.type === "textarea" ? (
              <textarea
                ref={textareaRef}
                value={answers[question.id] ?? ""}
                onChange={(e) => {
                  setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                  if (error) setError("");
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={question.placeholder}
                rows={4}
                className="w-full resize-none border-b-2 border-zinc-700 bg-transparent py-3 text-xl text-white placeholder:text-zinc-600 outline-none focus:border-blue-400 transition-colors"
              />
            ) : (
              <input
                ref={inputRef}
                type={question.type}
                value={answers[question.id] ?? ""}
                onChange={(e) => {
                  setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                  if (error) setError("");
                }}
                onKeyDown={handleInputKeyDown}
                placeholder={question.placeholder}
                className="w-full border-b-2 border-zinc-700 bg-transparent py-3 text-xl text-white placeholder:text-zinc-600 outline-none focus:border-blue-400 transition-colors"
              />
            )}

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-red-400">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          {/* OK button + hint */}
          {(question.type !== "choice" ||
            (question.allowOther &&
              !question.options?.some((o) => o.value === answers[question.id]) &&
              (answers[question.id] ?? "").trim() !== "")) && (
            <div className="mt-7 flex items-center gap-4">
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-400 active:bg-blue-600"
              >
                {step === questions.length - 1 ? "Submit" : "OK"}
                {step < questions.length - 1 && <span>✓</span>}
              </button>
              <span className="text-xs text-zinc-500">
                press{" "}
                <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-zinc-400">
                  {question.type === "textarea" ? "Ctrl+Enter" : "Enter ↵"}
                </kbd>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step counter */}
      <div className="fixed bottom-6 left-6 text-xs text-zinc-600">
        {step + 1} / {questions.length}
      </div>

      {/* Up / Down nav arrows */}
      <div className="fixed bottom-6 right-6 flex gap-2">
        <button
          onClick={goBack}
          disabled={step === 0 || isAnimating}
          aria-label="Previous question"
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↑
        </button>
        <button
          onClick={goNext}
          disabled={isAnimating}
          aria-label="Next question"
          className="flex h-9 w-9 items-center justify-center rounded border border-zinc-700 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↓
        </button>
      </div>
    </div>
  );
}
