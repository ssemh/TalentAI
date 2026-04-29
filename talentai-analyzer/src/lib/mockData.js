export const mockDashboardData = {
  matchScore: 74,
  trustScore: 81,
  cv: {
    extractedSkills: ["React", "Node.js", "Docker", "AWS", "MongoDB", "PostgreSQL"],
    technologies: ["React", "Next.js", "TypeScript", "Node.js", "Docker", "AWS"],
    projects: [
      { name: "E-commerce Platform", stack: ["React", "Node.js", "PostgreSQL"] },
      { name: "Realtime Chat", stack: ["React", "WebSocket", "Redis"] },
    ],
  },
  github: {
    detectedTech: ["React", "Node.js", "TypeScript", "Python", "PostgreSQL"],
    commitFrequency: "Steady (weekly)",
    activity: [
      { date: "2026-03-01", commits: 4 },
      { date: "2026-03-08", commits: 9 },
      { date: "2026-03-15", commits: 6 },
      { date: "2026-03-22", commits: 12 },
      { date: "2026-03-29", commits: 7 },
      { date: "2026-04-05", commits: 10 },
    ],
  },
  comparison: {
    verifiedSkills: ["React", "Node.js", "PostgreSQL"],
    unverifiedClaims: ["AWS", "MongoDB", "Docker"],
    inconsistencies: [
      "AWS mentioned in CV, but no clear usage in recent public repos",
      "MongoDB listed, but repositories show PostgreSQL usage instead",
    ],
    aiSummary:
      "CV emphasizes full‑stack delivery; GitHub supports strong React + Node depth. A few claims (AWS/MongoDB) are weakly evidenced in public repos.",
  },
  ghostCoder: 24,
  codeQuality: 82,
  complexity: 67,
  skills: {
    React: 92,
    "Node.js": 74,
    TypeScript: 88,
    Python: 61,
    PostgreSQL: 58,
    Docker: 46,
  },
  repos: [
    { name: "talentai-ui", stars: 54, commits: 312, language: "TypeScript" },
    { name: "api-gateway", stars: 18, commits: 147, language: "JavaScript" },
    { name: "data-pipelines", stars: 31, commits: 203, language: "Python" },
    { name: "infra", stars: 9, commits: 88, language: "HCL" },
  ],
  activity: [
    { date: "2026-03-01", commits: 4 },
    { date: "2026-03-08", commits: 9 },
    { date: "2026-03-15", commits: 6 },
    { date: "2026-03-22", commits: 12 },
    { date: "2026-03-29", commits: 7 },
    { date: "2026-04-05", commits: 10 },
  ],
};

