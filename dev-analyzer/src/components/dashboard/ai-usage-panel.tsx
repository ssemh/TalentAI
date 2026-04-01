"use client";

import { Bot, ClipboardPaste, Wrench } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { ScoreBar } from "@/components/score-bar";
import { Badge } from "@/components/ui/badge";
import { mockAiUsage } from "@/lib/mock-data";

export function AiUsagePanel() {
  const eng = mockAiUsage.engineeringBehavior;
  const engLabel =
    eng === "high"
      ? "Strong engineering"
      : eng === "medium"
        ? "Balanced"
        : "Low signal";

  return (
    <ResultCard
      title="AI usage intelligence"
      description="Copy-paste vs engineering behavior"
      className="mt-6"
      delay={0.07}
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 border-violet-500/30">
          <Bot className="h-3.5 w-3.5" />
          AI usage score: {mockAiUsage.aiUsageScore}%
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Wrench className="h-3.5 w-3.5" />
          {engLabel}
        </Badge>
      </div>
      <div className="mt-6 space-y-4">
        <ScoreBar
          label="Estimated AI / copy-paste index"
          value={mockAiUsage.copyPasteIndex}
        />
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <ClipboardPaste className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {mockAiUsage.narrative}
          </p>
        </div>
      </div>
    </ResultCard>
  );
}
