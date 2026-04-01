"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Github, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function UploadCard() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setFileName(f.name);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback(() => setDragActive(false), []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  const start = () => {
    setSubmitting(true);
    router.push("/analyzing");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.25 }}
      className="mx-auto w-full max-w-lg px-4 sm:px-0"
    >
      <Card className="glass-strong overflow-hidden transition-shadow duration-300 hover:shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Start analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              <Github className="h-4 w-4" />
              GitHub profile or repo URL
            </label>
            <Input
              placeholder="https://github.com/kullanici"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Resume (PDF, optional)
            </label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  document.getElementById("cv-upload")?.click();
                }
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-6 text-center transition-all duration-300",
                dragActive &&
                  "border-violet-400/60 bg-violet-500/10 shadow-glow-sm scale-[1.01]",
              )}
              onClick={() => document.getElementById("cv-upload")?.click()}
            >
              <FileUp className="mb-2 h-8 w-8 text-violet-400/80" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Drag & drop a PDF or click to browse
              </p>
              {fileName && (
                <p className="mt-2 truncate text-xs text-cyan-300">{fileName}</p>
              )}
              <input
                id="cv-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onFileInput}
              />
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!githubUrl.trim() || submitting}
            onClick={start}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                Redirecting…
              </>
            ) : (
              <>
                Start Analysis
                <Sparkles className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
