"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200"
      >
        AI-powered talent intelligence
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
      >
        <span className="text-gradient">DevAnalyzer</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.2 }}
        className="mt-4 text-lg text-[hsl(var(--muted-foreground))] sm:text-xl"
      >
        AI-powered developer analysis from GitHub and CVs — fast, visual,
        data-driven.
      </motion.p>
    </div>
  );
}
