import { HeroSection } from "@/components/hero-section";
import { LandingFeatures } from "@/components/landing-features";
import { Navbar } from "@/components/navbar";

export const metadata = {
  title: "TalentAI Homepage",
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative pb-24 pt-10 sm:pt-14">
        <HeroSection />
        <LandingFeatures />
      </main>
    </>
  );
}
