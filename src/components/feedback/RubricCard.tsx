import React from "react";
import type { FeedbackResponse } from "@/types/feedback";
import { starsFromPct } from "@/utils/feedbackUtils";

export const RubricCard = ({ feedback }: { feedback: FeedbackResponse }) => {
  return (
    <div className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-indigo-700">Rubric Breakdown</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {feedback.assessment.rubric_breakdown.map((item, index) => {
          const pct = item.max > 0 ? (item.score / item.max) * 100 : 0;
          const stars = starsFromPct(pct);
          return (
            <div key={`${item.criterion}-${index}`} className="rounded-2xl bg-indigo-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-indigo-800">{item.criterion}</p>
                <p className="text-xs font-semibold text-indigo-600">
                  {item.score}/{item.max}
                </p>
              </div>
              <div className="mt-2 text-lg">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <span key={starIndex}>{starIndex < stars ? "⭐" : "☆"}</span>
                ))}
              </div>
              <p className="mt-2 text-xs text-indigo-700">{item.notes}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
