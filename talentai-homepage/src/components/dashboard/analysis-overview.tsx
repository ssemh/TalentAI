"use client";

import { BarChart3, GitCommit, Star, Workflow } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { ScoreBar } from "@/components/score-bar";
import { SkillBadge } from "@/components/skill-badge";
import { Separator } from "@/components/ui/separator";
import {
  mockAnalysis,
  mockGitHub,
} from "@/lib/mock-data";

export function AnalysisOverview() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ResultCard
        title="Summary"
        description={mockAnalysis.experience_level}
        className="lg:col-span-2"
        delay={0}
      >
        <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {mockAnalysis.summary}
        </p>
        <Separator className="my-4 bg-white/10" />
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {mockAnalysis.skills.map((s, i) => (
              <SkillBadge key={s} label={s} index={i} />
            ))}
          </div>
        </div>
      </ResultCard>
      <ResultCard title="AI score" delay={0.05}>
        <ScoreBar label="Overall profile fit" value={mockAnalysis.ai_score} />
        <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]">
          Mock data — a real app would show live model output.
        </p>
      </ResultCard>
      <ResultCard title="Code quality" delay={0.08}>
        <ScoreBar
          label="Code quality score"
          value={mockGitHub.codeQualityScore}
        />
      </ResultCard>
      <ResultCard
        title="GitHub snapshot"
        description="Mock analytics"
        className="lg:col-span-2"
        delay={0.1}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Workflow className="h-8 w-8 text-violet-400" />
            <div>
              <p className="text-2xl font-semibold text-white">{mockGitHub.repos}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Repo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <GitCommit className="h-8 w-8 text-cyan-400" />
            <div>
              <p className="text-2xl font-semibold text-white">
                {mockGitHub.totalCommits.toLocaleString()}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Commit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Star className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-2xl font-semibold text-white">
                {mockGitHub.stars}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Stars
              </p>
            </div>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <BarChart3 className="h-4 w-4" />
          Language mix
        </div>
        <ul className="mt-3 space-y-2">
          {mockGitHub.languages.map((lang) => (
            <li key={lang.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{lang.name}</span>
                <span className="text-[hsl(var(--muted-foreground))]">
                  %{lang.percent}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                  style={{ width: `${lang.percent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </ResultCard>
      <ResultCard title="Strengths" delay={0.12}>
        <ul className="space-y-2 text-sm text-emerald-200/90">
          {mockAnalysis.strengths.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </ResultCard>
      <ResultCard title="Growth areas" delay={0.14}>
        <ul className="space-y-2 text-sm text-rose-200/90">
          {mockAnalysis.weaknesses.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-rose-400">!</span>
              {s}
            </li>
          ))}
        </ul>
      </ResultCard>
      <ResultCard
        title="AI insights"
        description="Model notes"
        className="lg:col-span-3"
        delay={0.16}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <p className="text-xs uppercase text-violet-300">Activity</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Steady weekly commit cadence; feature branches used consistently.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs uppercase text-blue-300">Architecture</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Service boundaries and module edges are clear across most repos.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-xs uppercase text-cyan-300">Risk</p>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
              Test coverage is low — production defects may get expensive.
            </p>
          </div>
        </div>
      </ResultCard>
    </div>
  );
}
