"use client";
import { supabase } from '@/lib/supabaseClient';
import { useState } from 'react';
import { z } from 'zod';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const emailSchema = z.string().email({ message: 'Enter a valid email' });

  const sendLink = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0].message);
      return;
    }
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSent(true);
    }
  };

  const googleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-3xl font-bold text-center text-black">Join PrepDock</h1>
        <p className="text-center text-gray-600">7-day free trial · no card required</p>
        {sent ? (
          <p className="text-green-600 text-center">Check your inbox for a magic link.</p>
        ) : (
          <div className="space-y-4">
            <input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none placeholder-gray-400 text-gray-900" />
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <button onClick={sendLink} className="w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-neutral-800">Send magic link</button>
            <button onClick={googleLogin} className="w-full rounded-lg border border-gray-300 py-3 font-medium hover:bg-gray-100 flex items-center justify-center gap-2 text-gray-900">
              <img src="/google.svg" alt="Google" className="h-5 w-5" /> Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 