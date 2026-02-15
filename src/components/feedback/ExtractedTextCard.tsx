import React from "react";
import type { FeedbackResponse } from "@/types/feedback";
import { highlightExtractedText } from "@/utils/feedbackUtils";

type ExtractedTextCardProps = {
  feedback: FeedbackResponse;
  onShow?: () => void;
  onReadAloud?: () => void;
};

export const ExtractedTextCard = ({ feedback, onShow, onReadAloud }: ExtractedTextCardProps) => {
  const tokens = highlightExtractedText(feedback.extracted_text || "");

  return (
    <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-800">Extracted Text</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onShow}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            🔎 Show me where
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(feedback.extracted_text || "")}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            📋 Copy text
          </button>
          {onReadAloud && (
            <button
              type="button"
              onClick={onReadAloud}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              🔊 Read aloud
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 max-h-48 overflow-y-auto rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
        {tokens.map((token, index) => (
          <span
            key={`${token.text}-${index}`}
            className={
              token.type === "unclear"
                ? "rounded bg-rose-100 px-1 text-rose-600"
                : token.type === "punctuation"
                  ? "rounded bg-amber-100 px-1 text-amber-700"
                  : ""
            }
          >
            {token.text}
          </span>
        ))}
      </div>
    </div>
  );
};
