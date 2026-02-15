import React, { useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchSubmission } from "@/api/subjectiveAssignmentsApi";
import { PageShell } from "@/components/shared/PageShell";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScoreHero } from "@/components/feedback/ScoreHero";
import { ExtractedTextCard } from "@/components/feedback/ExtractedTextCard";
import { ReadabilityCard } from "@/components/feedback/ReadabilityCard";
import { RubricCard } from "@/components/feedback/RubricCard";
import { FeedbackTabs } from "@/components/feedback/FeedbackTabs";
import { CoachTipCard } from "@/components/feedback/CoachTipCard";
import { BottomActionBar } from "@/components/feedback/BottomActionBar";
import {
  loadSubmissionFromSession,
  loadSubmissionFromLocalStorage,
  useSubmissionStore,
} from "@/context/SubmissionStore";

const StudentFeedbackPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { state, setSubmission, setDraft } = useSubmissionStore();
  const extractedRef = useRef<HTMLDivElement | null>(null);

  const cached = submissionId ? state.cachedSubmissions[submissionId] : null;
  const sessionCached = submissionId ? loadSubmissionFromSession(submissionId) : null;
  const localCached = submissionId ? loadSubmissionFromLocalStorage(submissionId) : null;
  const initialData = cached || sessionCached || localCached || undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: () => fetchSubmission(submissionId as string),
    enabled: Boolean(submissionId) && !initialData,
    initialData,
    onSuccess: (submission) => setSubmission(submission),
  });

  const feedback = data?.feedback;

  const supportsSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "speechSynthesis" in window;
  }, []);

  const handleReadAloud = () => {
    if (!feedback?.extracted_text || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(feedback.extracted_text);
    window.speechSynthesis.speak(utterance);
  };

  const handleSubmitAgain = () => {
    if (!data) return;
    setDraft({ assignmentId: data.assignmentId, text: "" });
    const token = typeof window !== "undefined" ? localStorage.getItem("student_presigned_token") : null;
    const schoolId = typeof window !== "undefined" ? localStorage.getItem("student_school_id") : null;
    if (token) {
      const schoolParam = schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : "";
      window.location.href = `/student-portal?token=${encodeURIComponent(token)}${schoolParam}&resubmit_assignment_id=${encodeURIComponent(data.assignmentId)}`;
      return;
    }
    navigate("/student-portal");
  };

  const handleHome = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("student_presigned_token") : null;
    const schoolId = typeof window !== "undefined" ? localStorage.getItem("student_school_id") : null;
    if (token) {
      const schoolParam = schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : "";
      window.location.href = `/student-portal?token=${encodeURIComponent(token)}${schoolParam}`;
      return;
    }
    navigate("/student-portal");
  };

  const showExtracted = () => extractedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (isLoading && !data) {
    return <PageShell title="Loading feedback..."><LoadingState message="Unpacking your feedback..." /></PageShell>;
  }

  if (isError && !data) {
    return (
      <PageShell title="No submission found">
        <ErrorState
          message="No submission found. Try submitting again."
          action={
            <button
              type="button"
              onClick={handleHome}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to assignments
            </button>
          }
        />
      </PageShell>
    );
  }

  if (!data || !feedback) {
    return null;
  }

  return (
    <PageShell title="Your Writing Feedback" subtitle="Celebrate your progress and grow your skills!">
      <ScoreHero feedback={feedback} />
      <div ref={extractedRef}>
        <ExtractedTextCard
          feedback={feedback}
          onShow={showExtracted}
          onReadAloud={supportsSpeech ? handleReadAloud : undefined}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ReadabilityCard feedback={feedback} onShow={showExtracted} />
        <RubricCard feedback={feedback} />
      </div>
      <FeedbackTabs feedback={feedback} submissionId={data.id} />
      <CoachTipCard
        feedback={feedback}
        onUseSentence={(sentence) => {
          setDraft({
            assignmentId: data.assignmentId,
            text: data.feedback.extracted_text || "",
            tip: sentence,
          });
          navigator.clipboard.writeText(sentence);
        }}
      />
      <BottomActionBar onResubmit={handleSubmitAgain} onHome={handleHome} />
    </PageShell>
  );
};

export default StudentFeedbackPage;
