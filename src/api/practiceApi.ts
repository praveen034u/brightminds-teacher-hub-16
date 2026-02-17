// Mock API for Practice Mode
import { PracticeSessionPayload, PracticeSession, UploadUrlResponse, AiFeedbackResponse, PracticeSessionDetails, PracticeType } from "../types/practiceTypes";

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

export async function createPracticeSession(payload: PracticeSessionPayload): Promise<PracticeSession> {
  return randomFail({ sessionId: "sess_" + Math.random().toString(36).slice(2) });
}

export async function getUploadUrl(sessionId: string, file: File): Promise<UploadUrlResponse> {
  return randomFail({
    uploadUrl: "https://mock-upload-url.com/" + sessionId,
    audioUrl: "https://mock-audio-url.com/audio/" + sessionId + ".mp3"
  });
}

export async function uploadAudio(uploadUrl: string, file: File): Promise<{ success: boolean }> {
  return randomFail({ success: true });
}

export async function attachAudio(sessionId: string, audioUrl: string): Promise<{ success: boolean }> {
  return randomFail({ success: true });
}

export async function requestAiFeedback(sessionId: string): Promise<{ jobId: string }> {
  return randomFail({ jobId: "job_" + Math.random().toString(36).slice(2) });
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

export async function getSessionDetails(sessionId: string): Promise<PracticeSessionDetails> {
  if (!sessionStatus[sessionId]) {
    sessionStatus[sessionId] = { status: "processing" };
    setTimeout(() => {
      sessionStatus[sessionId] = {
        status: "completed",
        feedback: mockFeedback(Math.random() > 0.5 ? "speech" : "debate")
      };
    }, 2000 + Math.random() * 2000);
  }
  const entry = sessionStatus[sessionId];
  let ai_feedback_status: "processing" | "completed" | "failed" =
    entry.status === "completed" ? "completed" : entry.status === "failed" ? "failed" : "processing";
  return randomFail({
    ai_feedback_status,
    ai_feedback: entry.feedback,
    score: entry.feedback ? Math.round((Object.values(entry.feedback.scores).reduce((a, b) => a + b, 0)) / Object.values(entry.feedback.scores).length) : undefined
  });
}
