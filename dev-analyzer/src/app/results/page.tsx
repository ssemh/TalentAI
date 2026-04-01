import { Navbar } from "@/components/navbar";
import { AnalysisOverview } from "@/components/dashboard/analysis-overview";
import { AiUsagePanel } from "@/components/dashboard/ai-usage-panel";
import { CvGithubComparison } from "@/components/dashboard/cv-github-comparison";
import { DynamicCvSection } from "@/components/dashboard/dynamic-cv-section";
import { GhostCoderPanel } from "@/components/dashboard/ghost-coder-panel";
import { InterviewSimulation } from "@/components/dashboard/interview-simulation";

export default function ResultsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
            Results
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient">Analysis dashboard</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
            All data is mock — no backend. Component structure is ready for a real
            API integration.
          </p>
        </header>
        <AnalysisOverview />
        <CvGithubComparison />
        <GhostCoderPanel />
        <AiUsagePanel />
        <DynamicCvSection />
        <InterviewSimulation />
      </main>
    </>
  );
}
