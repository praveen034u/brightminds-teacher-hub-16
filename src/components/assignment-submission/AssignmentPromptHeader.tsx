import React from "react";
import type { Assignment } from "@/types/assignment";

export const AssignmentPromptHeader = ({ assignment }: { assignment: Assignment }) => {
  const dueLabel = assignment.dueDate
    ? new Date(assignment.dueDate).toLocaleDateString()
    : "No due date";

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-amber-100 px-4 py-1 text-sm font-bold uppercase text-amber-700">
          {assignment.type}
        </span>
        <span className="rounded-full bg-teal-100 px-4 py-1 text-sm font-semibold text-teal-700">
          Due: {dueLabel}
        </span>
        {assignment.gradeLevel && (
          <span className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">
            Grade {assignment.gradeLevel}
          </span>
        )}
      </div>
      <h2 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">
        {assignment.title}
      </h2>
      <p className="mt-3 text-base text-slate-700 sm:text-lg">{assignment.prompt}</p>
    </div>
  );
};
