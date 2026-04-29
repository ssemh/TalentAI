"use client";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SkillBadgeProps = {
  label: string;
  className?: string;
  index?: number;
};

export function SkillBadge({ label, className, index = 0 }: SkillBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Badge
        variant="outline"
        className={cn(
          "rounded-lg border-violet-500/25 bg-violet-500/5 px-3 py-1 text-violet-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-200",
          className,
        )}
      >
        {label}
      </Badge>
    </motion.div>
  );
}
