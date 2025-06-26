"use client";
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';

export default function NavBar() {
  const user = useUser();

  return (
    <header className="sticky top-0 z-10 bg-white/60 backdrop-blur dark:bg-black/40 border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          PrepDock
        </Link>
        <nav className="hidden md:flex gap-8 text-sm">
          <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
          <Link href="/download" className="hover:text-blue-600 transition-colors">Download</Link>
        </nav>
        {user ? (
          <div className="flex gap-4">
            <Link href="/dashboard" className="rounded-full bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">Start&nbsp;Tuning</Link>
            <Link href="/settings" className="rounded-full border border-black px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors">Settings</Link>
          </div>
        ) : (
          <Link href="/signup" className="ml-6 rounded-full border border-black px-4 py-2 text-sm font-medium hover:bg-gray-100 transition-colors">
            Log&nbsp;in&nbsp;/&nbsp;Sign&nbsp;up
          </Link>
        )}
      </div>
    </header>
  );
} 