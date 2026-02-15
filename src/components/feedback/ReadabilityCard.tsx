import React from "react";
import type { FeedbackResponse } from "@/types/feedback";

export const ReadabilityCard = ({
  feedback,
  onShow,
}: {
  feedback: FeedbackResponse;
  onShow?: () => void;
}) => {
  return (
    <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-emerald-700">Readability</h3>
          <p className="text-sm text-slate-600">
            {feedback.readability.readable ? "Readable and clear" : "Needs a little polish"}
          </p>
        </div>
        <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
          {feedback.readability.readability_score}/100
        </div>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {feedback.readability.issues.length === 0 && (
          <li className="text-emerald-600">All clear! Nice work.</li>
        )}
        {feedback.readability.issues.map((issue, index) => (
          <li key={`${issue}-${index}`} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
            <span>{issue}</span>
          </li>
        ))}
      </ul>
      {onShow && (
        <button
          type="button"
          onClick={onShow}
          className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700"
        >
          Show me where
        </button>
      )}
    </div>
  );
};
