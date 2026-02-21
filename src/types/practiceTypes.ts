export type PracticeType = "speech" | "debate";

export interface PracticeSessionPayload {
  activityType: PracticeType;
  topic: string;
  position?: "for" | "against" | "neutral";
  language: "en" | "hi";
}

export interface PracticeSession {
  sessionId: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  blobUrl?: string; // for backend snake_case compatibility
}

export interface AiFeedbackResponse {
  activityType: PracticeType;
  languageDetected: string;
  scores: {
    clarity: number;
    structure: number;
    delivery: number;
    argumentStrength?: number;
  };
  metrics: {
    wordsPerMinute: number;
    fillerWordCount: number;
    pauseCount: number;
  };
  strengths: string[];
  improvements: string[];
  coachSummary: string;
  nextPracticePlan: string[];
  counterArguments?: string[];
  timestampedNotes: Array<{
    startSec: number;
    endSec: number;
    note: string;
  }>;
  ai_feedback_tts_url?: string;
}

export interface PracticeSessionDetails {
  ai_feedback_status: "processing" | "completed" | "failed";
  ai_feedback?: AiFeedbackResponse;
  score?: number;
}
