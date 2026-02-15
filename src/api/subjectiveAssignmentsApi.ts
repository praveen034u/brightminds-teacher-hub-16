import type { Assignment } from "@/types/assignment";
import type { Submission } from "@/types/submission";
import type { FeedbackResponse } from "@/types/feedback";
import { getSupabaseUrl } from "@/config/supabase";

const BASE_URL = "/api";

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json() as Promise<T>;
};

export const createAssignment = async (payload: {
  title: string;
  type: "essay" | "story";
  prompt: string;
  gradeLevel?: string;
  dueDate?: string;
}): Promise<Assignment> => {
  const response = await fetch(`${BASE_URL}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse<Assignment>(response);
};

export const listAssignmentsByTeacher = async (teacherId: string): Promise<Assignment[]> => {
  const response = await fetch(`${BASE_URL}/assignments?createdBy=${encodeURIComponent(teacherId)}`);
  return handleResponse<Assignment[]>(response);
};

export const listAssignmentsForStudent = async (studentId: string): Promise<Assignment[]> => {
  const response = await fetch(`${BASE_URL}/assignments?forStudent=${encodeURIComponent(studentId)}`);
  return handleResponse<Assignment[]>(response);
};

export const submitAssignment = async (options: {
  assignmentId: string;
  studentId: string;
  inputMode: "image" | "text";
  file?: File | null;
  text?: string;
}): Promise<Submission> => {
  const { assignmentId, studentId, inputMode, file, text } = options;

  let response: Response;
  if (inputMode === "image" && file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("inputMode", "image");

    response = await fetch(`${BASE_URL}/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: formData,
    });
  } else {
    response = await fetch(`${BASE_URL}/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text || "", inputMode: "text" }),
    });
  }

  const result = await handleResponse<{
    submissionId: string;
    assignmentId: string;
    studentId: string;
    feedback: FeedbackResponse;
  }>(response);

  return {
    id: result.submissionId,
    assignmentId: result.assignmentId,
    studentId: result.studentId,
    submittedAt: new Date().toISOString(),
    inputMode,
    text: inputMode === "text" ? text : undefined,
    imageUrl: undefined,
    feedback: result.feedback,
  };
};

export const fetchSubmission = async (submissionId: string): Promise<Submission> => {
  const supabaseUrl = getSupabaseUrl();
  const token = typeof window !== "undefined" ? localStorage.getItem("student_presigned_token") : null;

  if (!token) {
    const response = await fetch(`${BASE_URL}/submissions/${submissionId}`);
    return handleResponse<Submission>(response);
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/submission-feedback?token=${encodeURIComponent(token)}&submission_id=${encodeURIComponent(submissionId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return handleResponse<Submission>(response);
};
