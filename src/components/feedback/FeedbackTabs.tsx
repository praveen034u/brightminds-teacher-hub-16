import React, { useEffect, useMemo, useState } from "react";
import type { FeedbackResponse } from "@/types/feedback";

type FeedbackTabsProps = {
  feedback: FeedbackResponse;
  submissionId: string;
};

const tabLabels = ["Strengths", "Improve", "Next Steps"] as const;

export const FeedbackTabs = ({ feedback, submissionId }: FeedbackTabsProps) => {
  const [activeTab, setActiveTab] = useState<(typeof tabLabels)[number]>("Strengths");
  const [nextStepChecks, setNextStepChecks] = useState<boolean[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`next-steps-${submissionId}`);
    if (stored) {
      try {
        setNextStepChecks(JSON.parse(stored));
        return;
      } catch {
        setNextStepChecks([]);
      }
    }
    setNextStepChecks(new Array(feedback.feedback.next_steps.length).fill(false));
  }, [feedback.feedback.next_steps.length, submissionId]);

  useEffect(() => {
    localStorage.setItem(`next-steps-${submissionId}`, JSON.stringify(nextStepChecks));
  }, [nextStepChecks, submissionId]);

  const content = useMemo(() => {
    if (activeTab === "Strengths") return feedback.feedback.strengths;
    if (activeTab === "Improve") return feedback.feedback.improvements;
    return feedback.feedback.next_steps;
  }, [activeTab, feedback]);

  const renderItem = (item: string, index: number) => {
    if (activeTab !== "Next Steps") {
      return (
        <li key={`${item}-${index}`} className="flex gap-2">
          <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
          <span>{item}</span>
        </li>
      );
    }

    return (
      <li key={`${item}-${index}`} className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={nextStepChecks[index] || false}
          onChange={(event) => {
            const updated = [...nextStepChecks];
            updated[index] = event.target.checked;
            setNextStepChecks(updated);
          }}
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <span>{item}</span>
      </li>
    );
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-white/90 p-6 shadow-lg">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabLabels.map((label) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={activeTab === label}
            onClick={() => setActiveTab(label)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeTab === label
                ? "bg-amber-400 text-white"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm text-slate-700">
        {content.length === 0 && <li>No tips yet. Try again soon!</li>}
        {content.map(renderItem)}
      </ul>
    </div>
  );
};
