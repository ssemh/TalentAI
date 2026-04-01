export const mockAnalysis = {
  skills: ["React", "Node.js", "Python", "PostgreSQL"],
  experience_level: "Mid-Level",
  strengths: ["Clean code", "Good project structure"],
  weaknesses: ["Low test coverage"],
  ai_score: 78,
  summary:
    "Solid developer with strong frontend skills and pragmatic backend experience. Repositories show consistent patterns; investing in tests would raise reliability.",
};

export const mockGitHub = {
  repos: 24,
  totalCommits: 1842,
  languages: [
    { name: "TypeScript", percent: 42 },
    { name: "JavaScript", percent: 28 },
    { name: "Python", percent: 18 },
    { name: "Other", percent: 12 },
  ],
  stars: 156,
  codeQualityScore: 82,
};

export const mockCvGithub = {
  cvSkills: ["React", "Node.js", "Docker", "AWS", "MongoDB"],
  repoSkills: ["React", "Node.js", "Python", "PostgreSQL", "TypeScript"],
  matchPercent: 71,
  inconsistencies: [
    "AWS & MongoDB listed on CV but no matching usage in recent public repos",
    "Docker mentioned; only one Dockerfile found across analyzed repositories",
  ],
};

export const mockGhostCoder = {
  originalRatio: 0.76,
  copiedRatio: 0.24,
  suspicionLevel: "low" as const,
  notes:
    "Majority of snippets align with project-specific patterns; a few utility blocks resemble common OSS templates.",
};

export const mockAiUsage = {
  aiUsageScore: 32,
  copyPasteIndex: 28,
  engineeringBehavior: "high" as const,
  narrative:
    "Commit granularity and refactors suggest hands-on engineering; low probability of heavy copy-paste from generative tools in core logic.",
};

export const mockCvExtracted = {
  headline: "Full-stack developer · 4+ years",
  skills: [
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "REST",
    "Agile",
  ],
  githubValidated: [
    { skill: "React", validated: true, confidence: 0.94 },
    { skill: "Next.js", validated: true, confidence: 0.88 },
    { skill: "Node.js", validated: true, confidence: 0.91 },
    { skill: "Kubernetes", validated: false, confidence: 0.22 },
  ],
  aiSummary:
    "CV emphasizes modern frontend and API work; GitHub activity supports React and Node depth. Claimed orchestration experience is not visible in public code.",
};

export const mockInterview = {
  messages: [
    {
      id: "1",
      role: "assistant" as const,
      content:
        "Hi — walk me through how you debug the `commerce-api` project on your GitHub. Keep it concise.",
    },
    {
      id: "2",
      role: "user" as const,
      content:
        "I check logs and metrics first, then reproduce with a minimal scenario.",
    },
    {
      id: "3",
      role: "assistant" as const,
      content:
        "Nice. Your résumé mentions “event-driven” — which repo shows that most concretely?",
    },
  ],
  evaluation: {
    clarity: 86,
    depth: 78,
    consistency: 81,
    notes:
      "Answers are structured; the CV–repo consistency follow-up stayed a bit general — a hiring loop could probe deeper.",
  },
};

export const mockLoadingMessages = [
  "Analyzing GitHub repositories",
  "Parsing PDF resume",
  "Comparing CV with real code",
];
