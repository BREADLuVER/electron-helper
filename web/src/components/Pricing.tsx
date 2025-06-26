export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      perks: ['3 reference files', '50 MB storage', '10 minutes / day'],
      cta: '/signup',
    },
    {
      name: 'Pro',
      price: '$15',
      perks: ['20 reference files', '300 MB storage', 'Unlimited minutes'],
      cta: '/signup?plan=pro',
    },
    {
      name: 'Team',
      price: '$49',
      perks: ['Pooled 2 GB storage', 'Shared prompts / docs', 'Role-based access'],
      cta: '/signup?plan=team',
    },
  ];
  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Pricing</h2>
        <p className="mt-4 text-gray-700">Simple plans, 7-day free trial on every tier.</p>
        <div className="mt-16 grid sm:grid-cols-3 gap-8">
          {plans.map((p) => (
            <div key={p.name} className="border border-gray-200 rounded-xl p-8 flex flex-col items-center">
              <h3 className="text-xl font-semibold text-black">{p.name}</h3>
              <p className="mt-2 text-4xl font-extrabold text-black">{p.price}<span className="text-base font-medium text-gray-500">/mo</span></p>
              <ul className="mt-6 space-y-2 text-gray-700 text-sm text-left">
                {p.perks.map((perk) => <li key={perk}>✓ {perk}</li>)}
              </ul>
              <button onClick={async()=>{
                const res = await fetch('/api/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ plan: p.name.toLowerCase()})});
                const { url } = await res.json();
                if(url) window.location.href = url;
              }} className="mt-8 inline-flex justify-center rounded-lg bg-black text-white px-6 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors w-full">Start trial</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 