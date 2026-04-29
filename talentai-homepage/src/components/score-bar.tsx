"use client";

import { motion } from "framer-motion";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ScoreBarProps = {
  label: string;
  value: number;
  className?: string;
  suffix?: string;
};

export function ScoreBar({
  label,
  value,
  className,
  suffix = "%",
}: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-[hsl(var(--muted-foreground))]">{label}</span>
        <motion.span
          key={clamped}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="font-mono text-violet-300"
        >
          {clamped}
          {suffix}
        </motion.span>
      </div>
      <Progress value={clamped} className="h-2.5" />
    </div>
  );
}
