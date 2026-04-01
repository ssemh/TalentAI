import { HeroSection } from "@/components/hero-section";
import { LandingFeatures } from "@/components/landing-features";
import { Navbar } from "@/components/navbar";
import { UploadCard } from "@/components/upload-card";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative pb-24 pt-10 sm:pt-14">
        <HeroSection />
        <div className="mx-auto mt-12 max-w-6xl">
          <UploadCard />
        </div>
        <LandingFeatures />
      </main>
    </>
  );
}
