"use client";

import { Brain, Radar, ShieldCheck } from "lucide-react";

import { FeatureCard } from "@/components/feature-card";

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="mx-auto mt-20 grid max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6"
    >
      <FeatureCard
        title="Code analysis"
        description="Repo structure, languages, and commit rhythm as quality signals."
        icon={Brain}
        delay={0}
      />
      <FeatureCard
        title="AI detection"
        description="Model-backed signals and a readable candidate brief."
        icon={Radar}
        delay={0.08}
      />
      <FeatureCard
        title="CV validation"
        description="Match PDF-extracted skills against what repositories show."
        icon={ShieldCheck}
        delay={0.16}
      />
    </section>
  );
}
