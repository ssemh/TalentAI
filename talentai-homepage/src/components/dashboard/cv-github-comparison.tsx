"use client";

import { AlertTriangle, GitCompareArrows } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { SkillBadge } from "@/components/skill-badge";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockCvGithub } from "@/lib/mock-data";

export function CvGithubComparison() {
  return (
    <ResultCard
      title="CV vs GitHub"
      description="Skill overlap & inconsistencies (mock)"
      className="mt-10"
      delay={0.05}
    >
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
          <GitCompareArrows className="h-5 w-5 text-violet-400" />
          Match score
        </div>
        <div className="w-full max-w-xs space-y-2 sm:w-48">
          <div className="flex justify-between text-xs">
            <span>Alignment</span>
            <span className="font-mono text-cyan-300">
              %{mockCvGithub.matchPercent}
            </span>
          </div>
          <Progress value={mockCvGithub.matchPercent} className="h-3" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Listed on CV
          </p>
          <div className="flex flex-wrap gap-2">
            {mockCvGithub.cvSkills.map((s, i) => (
              <SkillBadge key={s} label={s} index={i} />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Detected in repos
          </p>
          <div className="flex flex-wrap gap-2">
            {mockCvGithub.repoSkills.map((s, i) => (
              <Badge key={s} variant="secondary" className="rounded-lg">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          Inconsistencies
        </p>
        <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
          {mockCvGithub.inconsistencies.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-amber-400">•</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </ResultCard>
  );
}
