"use client";

import { motion } from "framer-motion";
import { MessageSquare, Send } from "lucide-react";

import { ResultCard } from "@/components/result-card";
import { ScoreBar } from "@/components/score-bar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { mockInterview } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function InterviewSimulation() {
  return (
    <ResultCard
      title="AI interview simulation"
      description="Questions grounded in GitHub + résumé (mock chat)"
      className="mt-6"
      delay={0.09}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
            <MessageSquare className="h-4 w-4 text-violet-400" />
            Chat
          </div>
          <ScrollArea className="mt-3 h-[320px] rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="space-y-4 pr-3">
              {mockInterview.messages.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
                    m.role === "assistant"
                      ? "ml-0 mr-auto border border-violet-500/20 bg-violet-500/10 text-violet-100"
                      : "ml-auto mr-0 border border-cyan-500/20 bg-cyan-500/5 text-cyan-50",
                  )}
                >
                  {m.content}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
              Message composer — UI only (no backend)
            </div>
            <Button size="icon" variant="outline" className="shrink-0" disabled>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className="text-sm font-medium text-white">Evaluation panel</p>
          <Separator className="my-3" />
          <div className="space-y-4">
            <ScoreBar label="Clarity" value={mockInterview.evaluation.clarity} />
            <ScoreBar label="Depth" value={mockInterview.evaluation.depth} />
            <ScoreBar
              label="CV vs repos consistency"
              value={mockInterview.evaluation.consistency}
            />
          </div>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            {mockInterview.evaluation.notes}
          </p>
        </div>
      </div>
    </ResultCard>
  );
}
