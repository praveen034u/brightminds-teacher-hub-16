import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAssignmentsByTeacher } from "@/api/subjectiveAssignmentsApi";
import type { Assignment } from "@/types/assignment";
import { PageShell } from "@/components/shared/PageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

const currentUser = { role: "teacher" as const, id: "teacher-001" };

const TeacherAssignmentsListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-assignments", currentUser.id],
    queryFn: () => listAssignmentsByTeacher(currentUser.id),
  });

  const handleCopy = (assignment: Assignment) => {
    const link = `${window.location.origin}/student/assignments/${assignment.id}/submit`;
    navigator.clipboard.writeText(link);
  };

  return (
    <PageShell
      title="Your Writing Assignments"
      subtitle="Manage your essay and story prompts."
      actions={
        <button
          type="button"
          onClick={() => navigate("/teacher/assignments/new")}
          className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
        >
          New assignment
        </button>
      }
    >
      {isLoading && <LoadingState message="Loading assignments..." />}
      {isError && (
        <ErrorState
          message="We could not load assignments right now."
          action={
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Try again
            </button>
          }
        />
      )}
      {!isLoading && !isError && (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((assignment) => (
            <div key={assignment.id} className="rounded-3xl bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">{assignment.title}</h3>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {assignment.type}
                </span>
              </div>
              <p className="mt-2 max-h-12 overflow-hidden text-sm text-slate-600">
                {assignment.prompt}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "Flexible"}</span>
                <span>Created: {new Date(assignment.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleCopy(assignment)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Copy student link
                </button>
              </div>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="rounded-3xl bg-white/90 p-6 text-center text-sm text-slate-600">
              No assignments yet. Create your first one!
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default TeacherAssignmentsListPage;
