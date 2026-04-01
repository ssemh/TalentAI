"use client";

import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ResultCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function ResultCard({
  title,
  description,
  children,
  className,
  delay = 0,
}: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay }}
    >
      <Card
        className={cn(
          "glass h-full transition-all duration-300 hover:border-white/15 hover:shadow-glow-sm",
          className,
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
