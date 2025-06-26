export default function Features() {
  const items = [
    {
      title: 'Real-time transcript',
      desc: 'Live AssemblyAI captioning with smart punctuation and speaker labels.'
    },
    {
      title: 'Behavioural story booster',
      desc: 'Generate STAR-style answers sourced from your past projects and uploaded PDFs.'
    },
    {
      title: 'On-screen OCR',
      desc: 'Instantly capture any interviewer prompt or coding exercise and feed it to GPT-4o.'
    },
  ];
  return (
    <section id="features" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-black">Features</h2>
        <div className="mt-16 grid sm:grid-cols-3 gap-12">
          {items.map((f) => (
            <div key={f.title} className="text-left">
              <h3 className="text-xl font-semibold text-black mb-2">{f.title}</h3>
              <p className="text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 