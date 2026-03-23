# FirstCar — Frontend

A modern, Typeform-style onboarding form for first-time car buyers in South Africa. Users land on a clean landing page and are guided through an interactive, one-question-at-a-time form that collects the information needed to match them with the right car.

---

## Features

- **Landing page** with a single call-to-action to start the form
- **Typeform-style interactive form** — one question per screen with smooth slide animations
- **Keyboard-first navigation** — press `Enter` to advance, `A`–`D` for choice shortcuts
- **Auto-advance** on multiple-choice questions
- **Custom brand input** — type any brand not listed in the choices
- **Progress bar** tracking completion across all 11 questions
- **Back/forward navigation** arrows
- **Confirmation screen** on submission

---

## Form Fields Collected

| Field | Type | Description |
|---|---|---|
| `name` | Text | Full name |
| `email` | Email | Email address |
| `gender` | Choice | Male / Female / Non-binary / Prefer not to say |
| `location` | Text | City |
| `net_salary` | Text | Monthly net salary (ZAR) |
| `credit_score` | Choice | Score range (Below 600 → 750+) |
| `years_licenced` | Choice | How long they've held a licence |
| `preferred_brand` | Choice + Text | Toyota, VW, Hyundai, Ford, or custom input |
| `car_type` | Choice | Hatchback / Sedan / SUV / Bakkie |
| `fuel_type` | Choice | Petrol / Diesel / Hybrid / Electric |
| `transmission` | Choice | Manual / Automatic |

---

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | 16.1.7 | React framework (App Router) |
| [React](https://react.dev) | 19.2.3 | UI library |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [Base UI React](https://base-ui.com) | 1.3.0 | Headless UI primitives |
| [shadcn/ui](https://ui.shadcn.com) | 4.0.8 | Component system |
| [Lucide React](https://lucide.dev) | 0.577.0 | Icons |

---

## Project Structure

```
firstcar_frontend/
├── app/
│   ├── layout.tsx        # Root layout (fonts, metadata)
│   ├── page.tsx          # Landing page
│   ├── globals.css       # Global styles and Tailwind theme
│   └── form/
│       └── page.tsx      # Interactive form (all 11 questions)
├── components/
│   └── ui/
│       └── button.tsx    # Reusable Button component
├── lib/
│   └── utils.ts          # cn() utility (clsx + tailwind-merge)
├── public/               # Static assets
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Prerequisites

Make sure you have the following installed before running the project:

- **Node.js** v18 or higher — [Download](https://nodejs.org)
- **npm** v9 or higher (comes with Node.js)

To verify your versions:

```bash
node -v
npm -v
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd firstcar_frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app will be running at [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| Development | `npm run dev` | Starts the dev server with hot reload at `localhost:3000` |
| Build | `npm run build` | Compiles the app for production |
| Start | `npm run start` | Runs the production build (requires `build` first) |
| Lint | `npm run lint` | Runs ESLint to check for code issues |

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with "Get Started" CTA |
| `/form` | Interactive multi-step form |

---

## How the Form Works

1. Open `/form` — the first question slides into view and the input is auto-focused.
2. **Text / Email / Tel questions** — type your answer and press `Enter` to advance.
3. **Choice questions** — click an option or press its keyboard shortcut (`A`, `B`, `C`, `D`) to select and auto-advance.
4. **Brand question** — either click a predefined brand to auto-advance, or type a custom brand in the text field and press `Enter` or click **OK**.
5. **Textarea questions** — type your answer and press `Ctrl+Enter` to advance.
6. Use the **↑ / ↓ arrows** at the bottom-right to navigate back and forward.
7. On the last question, click **Submit** to complete the form.
8. A confirmation screen is shown after submission.
