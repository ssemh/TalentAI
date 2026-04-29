"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Orbit } from "lucide-react";

import { cn } from "@/lib/utils";

type NavbarProps = {
  className?: string;
};

export function Navbar({ className }: NavbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "sticky top-0 z-50 border-b border-white/10 bg-[hsl(var(--background))]/70 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-glow-sm">
            <Orbit className="h-5 w-5 text-white" />
          </span>
          <span className="text-gradient">TalentAI</span>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/#features"
            className="text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-violet-300"
          >
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-2" />
      </div>
    </motion.header>
  );
}
