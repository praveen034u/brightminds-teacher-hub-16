import type { FeedbackResponse } from "@/types/feedback";

export type SubmissionInputMode = "image" | "text";

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  inputMode: SubmissionInputMode;
  imageUrl?: string;
  text?: string;
  feedback: FeedbackResponse;
}
