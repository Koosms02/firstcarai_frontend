'use client';

import { useRouter } from 'next/navigation';
import { AuthLeftPanel, MobileLogo } from '@/components/ui/auth-layout';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      {/* Right panel — landing */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        <MobileLogo />

        <div className="w-96 max-md:w-full flex flex-col items-center gap-8 text-center">
          <div>
            <h1 className="font-bold text-4xl text-neutral-800 leading-tight">
              Welcome to FirstCar
            </h1>
            <p className="mt-3 text-sm text-neutral-500 max-w-xs mx-auto">
              Get personalised car recommendations based on your budget and lifestyle.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push('/register')}
              className="h-11 w-full rounded-md bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Register Now
            </button>
            <button
              onClick={() => router.push('/login')}
              className="h-11 w-full rounded-md border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
