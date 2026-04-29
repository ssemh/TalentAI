import Header from "./Header.jsx";
import LeftContextPanel from "./LeftContextPanel.jsx";
import ChatPanel from "./ChatPanel.jsx";
import RightEvaluationPanel from "./RightEvaluationPanel.jsx";

import {
  mockCandidate,
  mockChat,
  mockCv,
  mockGitHub,
  mockScores,
  mockStar,
} from "../lib/mock-interview-data.js";

export default function InterviewPage() {
  return (
    <div className="min-h-screen">
      <Header candidateName={mockCandidate.name} status="In Progress" />

      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr_380px]">
          <div className="hidden lg:block">
            <LeftContextPanel cv={mockCv} github={mockGitHub} />
          </div>

          <div className="min-h-[72vh]">
            <ChatPanel initialMessages={mockChat} />
          </div>

          <div className="hidden lg:block">
            <RightEvaluationPanel scores={mockScores} star={mockStar} />
          </div>
        </div>

        {/* Mobile / tablet panels */}
        <div className="mt-4 grid gap-4 lg:hidden">
          <details className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Context (CV + GitHub)
            </summary>
            <div className="mt-4">
              <LeftContextPanel cv={mockCv} github={mockGitHub} />
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
            <summary className="cursor-pointer text-sm font-semibold text-white">
              Evaluation (Live)
            </summary>
            <div className="mt-4">
              <RightEvaluationPanel scores={mockScores} star={mockStar} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

