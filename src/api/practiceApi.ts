// Mock API for Practice Mode
import { PracticeSessionPayload, PracticeSession, UploadUrlResponse, AiFeedbackResponse, PracticeSessionDetails, PracticeType } from "../types/practiceTypes";
import axios from "axios";

function randomFail<T>(data: T, failRate = 0.1): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new Error("Network error. Please try again!"));
      } else {
        resolve(data);
      }
    }, 600 + Math.random() * 800);
  });
}

// Create Practice Session
export async function createPracticeSession(payload: PracticeSessionPayload, studentId: string): Promise<PracticeSession> {
  const response = await axios.post(
    "https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions",
    {
      practice_type: payload.activityType,
      topic: payload.topic,
      position: payload.position ?? null,
      language: payload.language,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-student-id": studentId,
      },
    }
  );
  return { sessionId: response.data.session_id || response.data.sessionId };
}

// Get Upload URL
export async function getUploadUrl(sessionId: string, file: File, studentId: string): Promise<UploadUrlResponse> {
  const response = await axios.post(
    `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/upload-url`,
    {},
    {
      headers: {
        "x-student-id": studentId,
      },
    }
  );
  return {
    uploadUrl: response.data.uploadUrl,
    blobUrl: response.data.blobUrl,
  };
}

// Upload Audio to GCS
export async function uploadAudio(uploadUrl: string, file: File): Promise<{ success: boolean }> {
  // Always set Content-Type to audio/wav for GCS upload
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': 'audio/wav',
    },
  });
  return { success: true };
}

// Attach Audio Session
export async function attachAudio(sessionId: string, audioUrl: string, studentId: string): Promise<{ success: boolean }> {
  await axios.post(
    `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/attach-audio`,
    {
      "audio_url": audioUrl,
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-student-id": studentId,
      },
    }
  );
  return { success: true };
}

// Request AI Feedback
export async function requestAiFeedback(sessionId: string, studentId: string): Promise<{ jobId: string }> {
  const response = await axios.post(
    `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}/ai-feedback`,
    {},
    {
      headers: {
        "x-student-id": studentId,
      },
    }
  );
  return { jobId: response.data.job_id || response.data.jobId || sessionId };
}

const mockFeedback = (type: PracticeType): AiFeedbackResponse => ({
  activityType: type,
  languageDetected: "en",
  scores: {
    clarity: Math.floor(Math.random() * 4) + 7,
    structure: Math.floor(Math.random() * 4) + 6,
    delivery: Math.floor(Math.random() * 4) + 6,
    ...(type === "debate" ? { argumentStrength: Math.floor(Math.random() * 4) + 5 } : {})
  },
  metrics: {
    wordsPerMinute: 110 + Math.floor(Math.random() * 40),
    fillerWordCount: Math.floor(Math.random() * 5),
    pauseCount: Math.floor(Math.random() * 3)
  },
  strengths: [
    "Confident voice!",
    "Great structure!",
    "Clear points!",
    "Good eye contact!",
    "Strong arguments!"
  ].sort(() => 0.5 - Math.random()).slice(0, 3),
  improvements: [
    "Speak a bit slower.",
    "Add more examples.",
    "Use less filler words.",
    "Pause for effect.",
    "Summarize at the end."
  ].sort(() => 0.5 - Math.random()).slice(0, 3),
  coachSummary: "Awesome job! Keep practicing to get even better!",
  nextPracticePlan: [
    "Try a new topic.",
    "Practice with a timer.",
    "Record and listen again."
  ],
  ...(type === "debate"
    ? {
        counterArguments: [
          "What if someone disagrees?",
          "Is there a better solution?",
          "What about the other side?"
        ]
      }
    : {}),
  timestampedNotes: [
    { startSec: 12, endSec: 20, note: "Speak slower here" },
    { startSec: 30, endSec: 36, note: "Great point!" },
    { startSec: 45, endSec: 50, note: "Try to pause" }
  ]
});

let sessionStatus: Record<string, { status: string; feedback?: AiFeedbackResponse }> = {};

// Get Session Details (with feedback)
export async function getSessionDetails(sessionId: string, studentId: string): Promise<PracticeSessionDetails> {
  const response = await axios.get(
    `https://ai-feedback-api-756501801816.us-east4.run.app/api/student/practice-sessions/${sessionId}`,
    {
      headers: {
        "x-student-id": studentId,
      },
    }
  );
  return response.data;
}
