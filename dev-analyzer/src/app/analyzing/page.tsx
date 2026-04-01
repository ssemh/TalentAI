"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { mockLoadingMessages } from "@/lib/mock-data";

export default function AnalyzingPage() {
  const router = useRouter();
  const [progress, setProgress] = useState(8);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(100, p + Math.random() * 12 + 4));
    }, 450);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const i = window.setInterval(() => {
      setMsgIndex((m) => (m + 1) % mockLoadingMessages.length);
    }, 2200);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (progress < 100) return;
    const t = window.setTimeout(() => router.replace("/results"), 500);
    return () => clearTimeout(t);
  }, [progress, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-strong w-full max-w-md rounded-3xl p-10 text-center shadow-glow"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-glow">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <p className="text-lg font-medium text-[hsl(var(--foreground))]">
          Analyzing developer profile...
        </p>
        <div className="mt-6 space-y-3">
          <Progress value={Math.round(progress)} className="h-3" />
          <p className="font-mono text-sm text-violet-300">
            {Math.round(progress)}%
          </p>
        </div>
        <div className="mt-6 min-h-[3rem]">
          <AnimatePresence mode="wait">
            <motion.p
              key={mockLoadingMessages[msgIndex]}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="text-sm text-[hsl(var(--muted-foreground))]"
            >
              {mockLoadingMessages[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
