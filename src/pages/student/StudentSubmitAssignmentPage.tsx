import React, { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  listAssignmentsForStudent,
  submitAssignment,
} from "@/api/subjectiveAssignmentsApi";
import { PageShell } from "@/components/shared/PageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { AssignmentPromptHeader } from "@/components/assignment-submission/AssignmentPromptHeader";
import { SubmitModeTabs } from "@/components/assignment-submission/SubmitModeTabs";
import { ImageUploadCard } from "@/components/assignment-submission/ImageUploadCard";
import { TextEditorCard } from "@/components/assignment-submission/TextEditorCard";
import { useSubmissionStore, loadDraftFromSession } from "@/context/SubmissionStore";

const currentUser = { role: "student" as const, id: "student-001" };

const StudentSubmitAssignmentPage = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { setSubmission, setDraft } = useSubmissionStore();
  const [mode, setMode] = useState<"image" | "text">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["student-assignments", currentUser.id],
    queryFn: () => listAssignmentsForStudent(currentUser.id),
  });

  const assignment = useMemo(() => data?.find((item) => item.id === assignmentId), [data, assignmentId]);

  React.useEffect(() => {
    if (!assignmentId) return;
    const draft = loadDraftFromSession(assignmentId);
    if (draft) {
      const baseText = draft.text || "";
      const merged = draft.tip && !baseText.includes(draft.tip)
        ? `${baseText}${baseText ? "\n\n" : ""}${draft.tip}`
        : baseText;
      setText(merged);
      setMode("text");
    }
  }, [assignmentId]);

  React.useEffect(() => {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }, [mode, text, file]);

  const mutation = useMutation({
    mutationFn: async () =>
      submitAssignment({
        assignmentId: assignmentId as string,
        studentId: currentUser.id,
        inputMode: mode,
        file,
        text,
      }),
    onSuccess: (submission) => {
      setSubmission(submission);
      setDraft(null);
      navigate(`/student/feedback/${submission.id}`);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || "Something went wrong. Try again.");
    },
  });

  const onPaste = async () => {
    const clipboardText = await navigator.clipboard.readText();
    setText((prev) => `${prev}${prev ? "\n" : ""}${clipboardText}`);
  };

  const isSubmitDisabled = mode === "image" ? !file : !text.trim();

  if (isLoading) {
    return <PageShell title="Loading assignment..."><LoadingState message="Getting your prompt ready..." /></PageShell>;
  }

  if (isError || !assignment) {
    return (
      <PageShell title="Assignment not found">
        <ErrorState
          message="We could not find that assignment."
          action={
            <button
              type="button"
              onClick={() => navigate("/student/assignments")}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to list
            </button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell title="Submit Your Writing" subtitle="Upload a photo or type your work.">
      <AssignmentPromptHeader assignment={assignment} />
      <SubmitModeTabs mode={mode} onChange={(next) => setMode(next)} />
      {mode === "image" ? (
        <ImageUploadCard file={file} onFileChange={setFile} errorMessage={errorMessage} />
      ) : (
        <TextEditorCard value={text} onChange={setText} onPasteFromClipboard={onPaste} />
      )}

      {errorMessage && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        disabled={isSubmitDisabled || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="w-full rounded-full bg-teal-500 px-6 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? "Submitting..." : "Submit for Feedback"}
      </button>

      {mutation.isPending && <LoadingState message="Your feedback is on the way..." />}
    </PageShell>
  );
};

export default StudentSubmitAssignmentPage;
