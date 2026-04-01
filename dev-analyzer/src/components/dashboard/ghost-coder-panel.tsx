"use client";

import { Ghost, Scale } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { ScoreBar } from "@/components/score-bar";
import { Badge } from "@/components/ui/badge";
import { mockGhostCoder } from "@/lib/mock-data";

const levelStyles = {
  low: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  high: "border-rose-500/40 bg-rose-500/10 text-rose-200",
};

export function GhostCoderPanel() {
  const suspicion = mockGhostCoder.suspicionLevel;
  const suspicionLabel =
    suspicion === "low"
      ? "Low"
      : suspicion === "medium"
        ? "Medium"
        : "High";
  return (
    <ResultCard
      title="Ghost coder signal"
      description="Original vs template-like code (mock)"
      className="mt-6"
      delay={0.06}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          className={levelStyles[suspicion]}
          variant="outline"
        >
          <Ghost className="mr-1 h-3.5 w-3.5" />
          Suspicion: {suspicionLabel}
        </Badge>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ScoreBar
          label="Original code"
          value={Math.round(mockGhostCoder.originalRatio * 100)}
        />
        <ScoreBar
          label="Template / similar blocks"
          value={Math.round(mockGhostCoder.copiedRatio * 100)}
        />
      </div>
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {mockGhostCoder.notes}
        </p>
      </div>
    </ResultCard>
  );
}
