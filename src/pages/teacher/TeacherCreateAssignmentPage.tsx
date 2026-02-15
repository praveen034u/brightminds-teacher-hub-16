import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createAssignment } from "@/api/subjectiveAssignmentsApi";
import { PageShell } from "@/components/shared/PageShell";
import { Toast } from "@/components/shared/Toast";
import { LoadingState } from "@/components/shared/LoadingState";

const gradeOptions = ["K", "1", "2", "3", "4", "5", "6", "7", "8"];

const currentUser = { role: "teacher" as const, id: "teacher-001" };

const TeacherCreateAssignmentPage = () => {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    title: "",
    type: "essay" as "essay" | "story",
    prompt: "",
    gradeLevel: "",
    dueDate: "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      createAssignment({
        title: formState.title,
        type: formState.type,
        prompt: formState.prompt,
        gradeLevel: formState.gradeLevel || undefined,
        dueDate: formState.dueDate || undefined,
      }),
    onSuccess: () => {
      setToastMessage("Assignment created! Ready for your students.");
      setTimeout(() => navigate("/teacher/assignments"), 600);
    },
  });

  const isDisabled = !formState.title.trim() || !formState.prompt.trim();

  return (
    <PageShell
      title="Create a New Assignment"
      subtitle="Design a fun writing mission for your students."
      actions={
        <button
          type="button"
          className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={() => navigate("/teacher/assignments")}
        >
          Back to list
        </button>
      }
    >
      <div className="rounded-3xl bg-white/90 p-6 shadow-2xl">
        <p className="text-sm font-semibold text-slate-500">Logged in as {currentUser.id}</p>
        <div className="mt-6 grid gap-5">
          <label className="text-sm font-semibold text-slate-700">
            Title *
            <input
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-base"
              placeholder="The Magical Day"
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Type
            <select
              value={formState.type}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, type: event.target.value as "essay" | "story" }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-base"
            >
              <option value="essay">Essay</option>
              <option value="story">Story</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Prompt *
            <textarea
              value={formState.prompt}
              onChange={(event) => setFormState((prev) => ({ ...prev, prompt: event.target.value }))}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-base"
              placeholder="Tell a story about a brave explorer..."
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Grade level
              <select
                value={formState.gradeLevel}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, gradeLevel: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-base"
              >
                <option value="">Select grade</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Due date
              <input
                type="date"
                value={formState.dueDate}
                onChange={(event) => setFormState((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 p-3 text-base"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={isDisabled || mutation.isPending}
            onClick={() => mutation.mutate()}
            className="rounded-full bg-teal-500 px-6 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "Creating..." : "Create Assignment"}
          </button>
          {mutation.isPending && <LoadingState message="Saving your assignment..." />}
        </div>
      </div>
      {toastMessage && <Toast message={toastMessage} variant="success" onDismiss={() => setToastMessage(null)} />}
    </PageShell>
  );
};

export default TeacherCreateAssignmentPage;
