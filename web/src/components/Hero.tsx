import Link from 'next/link';

export default function Hero() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-32 text-center">
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-black leading-tight">
          The invisible interview coach<br className="hidden sm:block" /> for&nbsp;remote calls
        </h1>
        <p className="mt-8 text-xl text-gray-600 max-w-2xl mx-auto">
          PrepDock streams on-the-fly answers, behavioural stories and reference docs—so you can focus on&nbsp;connecting, not memorising.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup" className="inline-flex items-center justify-center rounded-lg bg-black text-white px-8 py-4 text-base font-semibold hover:bg-neutral-800 transition-colors">
            Get started
          </Link>
          <Link href="#features" className="inline-flex items-center justify-center rounded-lg border border-black px-8 py-4 text-base font-semibold text-black hover:bg-gray-100 transition-colors">
            How it works <span className="ml-2 text-sm font-normal text-gray-500">2&nbsp;min ⟶</span>
          </Link>
        </div>
      </div>
    </section>
  );
} 