import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <main className="flex flex-col items-center text-center gap-8 max-w-xl">
        <div className="flex flex-col items-center gap-4">
          <span className="text-5xl">🚗</span>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Find Your First Car
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">
            We make buying your first car simple and stress-free. Tell us a bit
            about yourself and we'll help you find the perfect match.
          </p>
        </div>

        <Link
          href="/form"
          className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Get Started
        </Link>
      </main>
    </div>
  );
}
