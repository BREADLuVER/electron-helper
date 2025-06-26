"use client";
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href).then(() => {
      router.replace('/dashboard');
    });
  }, []);
  return <p className="p-8">Signing you in…</p>;
} 