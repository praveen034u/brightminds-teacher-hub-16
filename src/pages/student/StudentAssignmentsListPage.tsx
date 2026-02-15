import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listAssignmentsForStudent } from "@/api/subjectiveAssignmentsApi";
import { PageShell } from "@/components/shared/PageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

const currentUser = { role: "student" as const, id: "student-001" };

const StudentAssignmentsListPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-assignments", currentUser.id],
    queryFn: () => listAssignmentsForStudent(currentUser.id),
  });

  return (
    <PageShell title="Your Writing Missions" subtitle="Pick a story or essay to start writing!">
      {isLoading && <LoadingState message="Finding your assignments..." />}
      {isError && <ErrorState message="We could not load your assignments." />}
      {!isLoading && !isError && (
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((assignment) => (
            <div key={assignment.id} className="rounded-3xl bg-white/90 p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">{assignment.title}</h3>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
                  {assignment.type}
                </span>
              </div>
              <p className="mt-2 max-h-12 overflow-hidden text-sm text-slate-600">
                {assignment.prompt}
              </p>
              <div className="mt-4 text-xs font-semibold text-slate-500">
                Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : "Anytime"}
              </div>
              <button
                type="button"
                onClick={() => navigate(`/student/assignments/${assignment.id}/submit`)}
                className="mt-4 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Start
              </button>
            </div>
          ))}
          {data?.length === 0 && (
            <div className="rounded-3xl bg-white/90 p-6 text-center text-sm text-slate-600">
              No assignments yet. Check back soon!
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
};

export default StudentAssignmentsListPage;
