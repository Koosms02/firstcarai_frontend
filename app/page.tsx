'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { signup, login } from '@/lib/recommendations';
import { AnimatedForm } from '@/components/ui/auth-components';

const GOLF_R_URL =
  'https://images.unsplash.com/photo-1718629879998-ee8cfc09df39?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dnclMjBnb2xmJTIwcnxlbnwwfHwwfHx8MA%3D%3D';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fields, setFields] = useState({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carImgError, setCarImgError] = useState(false);

  function handleChange(id: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFields((prev) => ({ ...prev, [id]: e.target.value }));
    };
  }

  function switchMode(next: 'signup' | 'login') {
    setMode(next);
    setServerError('');
    setFields({ email: '', password: '' });
  }

  async function handleSubmit(_e: React.SyntheticEvent<HTMLFormElement>) {
    setIsSubmitting(true);
    setServerError('');
    try {
      const user =
        mode === 'signup'
          ? await signup({ email: fields.email.trim(), password: fields.password })
          : await login({ email: fields.email.trim(), password: fields.password });

      sessionStorage.setItem('user_id', user.id);
      sessionStorage.setItem('user_email', user.email);

      if (mode === 'login') {
        router.push('/dashboard');
      } else {
        router.push('/form');
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — car background */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden">
        {carImgError ? (
          <div className="absolute inset-0 bg-blue-600">
            <div className="absolute w-[500px] h-[500px] rounded-full bg-blue-500 opacity-40 -bottom-24 -left-24" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-blue-700 opacity-30 top-10 right-10" />
            <Image src="/car.svg" alt="Car illustration" fill className="object-cover opacity-30" priority />
          </div>
        ) : (
          <Image
            src={GOLF_R_URL}
            alt="Volkswagen Golf R"
            fill
            className="object-cover"
            priority
            onError={() => setCarImgError(true)}
          />
        )}

        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-10 text-center">
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="14" fill="white" fillOpacity="0.2"/>
              <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
              <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
              <circle cx="10" cy="20.5" r="2" fill="#2563eb"/>
              <circle cx="18" cy="20.5" r="2" fill="#2563eb"/>
            </svg>
            <span className="text-2xl font-bold text-white">FirstCar</span>
          </div>

          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Find Your
              <br />
              Perfect First Car
            </h2>
            <p className="mt-3 text-blue-100 text-base max-w-xs">
              Smart recommendations tailored to your budget and lifestyle.
            </p>
          </div>

          <div className="flex gap-4 mt-2">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">500+</p>
              <p className="text-blue-100 text-xs">Car Models</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">10K+</p>
              <p className="text-blue-100 text-xs">Happy Buyers</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <p className="text-white font-bold text-lg">Free</p>
              <p className="text-blue-100 text-xs">No Hidden Fees</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-8 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#2563eb"/>
            <path d="M7 16 C7.5 13 9 11.5 11 11 L17 11 C19 11.5 20.5 13 21 16 Z" fill="white"/>
            <rect x="6" y="16" width="16" height="4" rx="2" fill="white"/>
            <circle cx="10" cy="20.5" r="2" fill="#2563eb"/>
            <circle cx="18" cy="20.5" r="2" fill="#2563eb"/>
          </svg>
          <span className="text-xl font-bold text-gray-900">FirstCar</span>
        </div>

        <AnimatedForm
          key={mode}
          header={isLogin ? 'Welcome back' : 'Create your account'}
          subHeader={
            isLogin
              ? 'Sign in to see your car recommendations.'
              : 'Sign up to get personalised car recommendations.'
          }
          fields={[
            {
              label: 'Email',
              required: true,
              type: 'email',
              placeholder: 'jane@example.co.za',
              onChange: handleChange('email'),
            },
            {
              label: 'Password',
              required: true,
              type: 'password',
              placeholder: isLogin ? 'Your password' : 'At least 8 characters',
              onChange: handleChange('password'),
            },
          ]}
          submitButton={isLogin ? 'Sign in' : 'Create account'}
          isLoading={isSubmitting}
          textVariantButton={
            isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'
          }
          errorField={serverError}
          onSubmit={handleSubmit}
          goTo={() => switchMode(isLogin ? 'signup' : 'login')}
          showTerms={!isLogin}
        />
      </div>
    </div>
  );
}
