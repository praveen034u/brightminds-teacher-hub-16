import React from "react";
import type { FeedbackResponse } from "@/types/feedback";

type CoachTipCardProps = {
  feedback: FeedbackResponse;
  onUseSentence?: (sentence: string) => void;
};

export const CoachTipCard = ({ feedback, onUseSentence }: CoachTipCardProps) => {
  const tip = feedback.feedback.model_answer_suggestion;

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-sky-700">Coach Tip</h3>
      <blockquote className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-slate-700">
        {tip}
      </blockquote>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(tip)}
          className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold text-sky-700"
        >
          📋 Copy tip
        </button>
        <button
          type="button"
          onClick={() => onUseSentence?.(tip)}
          className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
        >
          ➕ Use this sentence
        </button>
      </div>
    </div>
  );
};
