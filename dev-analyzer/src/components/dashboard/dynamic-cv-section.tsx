"use client";

import { FileText, Github } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { SkillBadge } from "@/components/skill-badge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { mockCvExtracted } from "@/lib/mock-data";

export function DynamicCvSection() {
  return (
    <ResultCard
      title="Dynamic résumé"
      description="PDF-extracted skills & GitHub validation"
      className="mt-6"
      delay={0.08}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="h-5 w-5 text-violet-400" />
        <span className="font-medium text-white">{mockCvExtracted.headline}</span>
      </div>
      <Separator className="my-4" />
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        Extracted skills
      </p>
      <div className="flex flex-wrap gap-2">
        {mockCvExtracted.skills.map((s, i) => (
          <SkillBadge key={s} label={s} index={i} />
        ))}
      </div>
      <Separator className="my-4" />
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        <Github className="h-4 w-4" />
        GitHub validation
      </p>
      <ul className="space-y-2">
        {mockCvExtracted.githubValidated.map((row) => (
          <li
            key={row.skill}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
          >
            <span>{row.skill}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                %{Math.round(row.confidence * 100)}
              </span>
              <Badge variant={row.validated ? "success" : "destructive"}>
                {row.validated ? "Verified" : "Weak evidence"}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
        {mockCvExtracted.aiSummary}
      </p>
    </ResultCard>
  );
}
