import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        {/* TODO: other sections: features, testimonials, pricing, footer */}
      </main>
    </>
  );
}
