import React from "react";
import type { FeedbackResponse } from "@/types/feedback";
import { badgeFromScore } from "@/utils/feedbackUtils";

export const ScoreHero = ({ feedback }: { feedback: FeedbackResponse }) => {
  const score = feedback.assessment.overall_score;
  const maxScore = feedback.assessment.max_score;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const badge = badgeFromScore(pct);

  return (
    <div className="rounded-[32px] bg-white/90 p-6 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Overall Score</p>
          <p className="text-4xl font-extrabold text-slate-900">
            {score} / {maxScore}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {badge.emoji} {badge.label}
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="h-3 w-full rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">{pct}%</div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          ✅ Readable: {feedback.readability.readability_score}/100
        </span>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
          🧠 Confidence: {Math.round(feedback.readability.confidence * 100)}%
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          ⚠️ Fix-It Tips: {feedback.readability.issues.length}
        </span>
      </div>
    </div>
  );
};
