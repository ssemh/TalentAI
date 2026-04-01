"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  delay?: number;
  className?: string;
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  delay = 0,
  className,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "glass h-full transition-all duration-300 hover:border-violet-500/30 hover:shadow-glow",
          className,
        )}
      >
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-blue-600/40 text-violet-200">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-semibold text-gradient">
            {title}
          </CardTitle>
          <CardDescription className="pb-6 text-[hsl(var(--muted-foreground))]">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}
