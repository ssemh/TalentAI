export const mockCandidate = {
  name: "Zeynep Kaya",
  role: "Frontend Engineer",
  level: "Mid",
  location: "Remote",
};

export const mockCv = {
  summary:
    "Product-minded frontend engineer with experience building data-heavy dashboards, design systems, and reliable CI workflows.",
  skills: [
    "React",
    "TypeScript",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Testing",
    "CI/CD",
    "System Design",
  ],
  technologies: ["Tailwind", "Vite", "React Router", "Recharts", "Jest", "Playwright"],
  projects: [
    {
      title: "FinOps Dashboard",
      highlights: ["Role-based analytics", "Charting performance tuning", "Design system"],
    },
    {
      title: "Talent Intelligence Platform",
      highlights: ["CV parsing UI", "GitHub validation views", "Interview simulation"],
    },
  ],
};

export const mockGitHub = {
  overview: {
    repos: 24,
    stars: 156,
    commits90d: 312,
    topLanguages: [
      { name: "TypeScript", pct: 44 },
      { name: "JavaScript", pct: 22 },
      { name: "Python", pct: 18 },
      { name: "Other", pct: 16 },
    ],
    activityNote: "Steady weekly cadence, occasional refactor bursts.",
  },
  repos: [
    { name: "devanalyzer-ui", lang: "TypeScript", stars: 54, recent: "2d ago" },
    { name: "chart-kit", lang: "TypeScript", stars: 31, recent: "5d ago" },
    { name: "etl-pipelines", lang: "Python", stars: 18, recent: "1w ago" },
    { name: "infra-scripts", lang: "Shell", stars: 9, recent: "2w ago" },
  ],
  activity: [
    { date: "Mar 01", commits: 4 },
    { date: "Mar 08", commits: 9 },
    { date: "Mar 15", commits: 6 },
    { date: "Mar 22", commits: 12 },
    { date: "Mar 29", commits: 7 },
    { date: "Apr 05", commits: 10 },
    { date: "Apr 12", commits: 5 },
    { date: "Apr 19", commits: 11 },
  ],
};

export const mockScores = {
  technicalFit: 86,
  ghostCode: 14,
  skillMatch: 78,
  performance: 82,
  insights: [
    { tone: "positive", text: "Explains trade-offs clearly; good decomposition." },
    { tone: "warning", text: "Testing depth is inconsistent across projects." },
    { tone: "neutral", text: "Asks clarifying questions before implementing." },
  ],
};

export const mockStar = {
  situation: { done: true, note: "Described a production incident context." },
  task: { done: true, note: "Defined measurable reliability goals." },
  action: { done: false, note: "Needs more concrete implementation details." },
  result: { done: false, note: "Outcome metrics not stated yet." },
};

export const mockChat = [
  {
    id: "m1",
    role: "ai",
    time: "19:02",
    text: "Welcome. We’ll run a short technical interview while I validate your CV against GitHub signals. Ready?",
  },
  {
    id: "m2",
    role: "user",
    time: "19:02",
    text: "Yes — let's start.",
  },
  {
    id: "m3",
    role: "ai",
    time: "19:03",
    text: "In your repos, I see multiple dashboards. How do you keep charts performant when data grows 10×?",
  },
  {
    id: "m4",
    role: "user",
    time: "19:04",
    text: "I’d profile renders, memoize selectors, and virtualize heavy lists. For charts, I’d downsample and avoid re-mounting components.",
  },
];

