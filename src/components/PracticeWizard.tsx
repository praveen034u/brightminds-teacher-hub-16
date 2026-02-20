import React, { useReducer } from "react";
import Stepper from "./Stepper";
import TopicPicker from "./TopicPicker";
import AudioUploadStep from "./AudioUploadStep";
import FeedbackResults from "./FeedbackResults";
import { PracticeType, PracticeSessionPayload, PracticeSessionDetails } from "../types/practiceTypes";
import * as api from "../api/practiceApi";
import styles from "../styles/PracticeMode.module.css";

// Wizard states
type WizardStep = "pick" | "audio" | "ai" | "results";

type State = {
  step: WizardStep;
  activityType?: PracticeType;
  topic?: string;
  position?: "for" | "against" | "neutral";
  language: "en" | "hi";
  sessionId?: string;
  audioFile?: File;
  audioUrl?: string;
  aiJobId?: string;
  feedback?: PracticeSessionDetails;
  error?: string;
  uploading: boolean;
  polling: boolean;
};

type Action =
  | { type: "RESET"; keepTopic?: boolean }
  | { type: "SET_ACTIVITY"; activityType: PracticeType }
  | { type: "SET_TOPIC"; topic: string }
  | { type: "SET_POSITION"; position: "for" | "against" | "neutral" }
  | { type: "SET_LANGUAGE"; language: "en" | "hi" }
  | { type: "NEXT_STEP" }
  | { type: "SET_AUDIO"; file: File }
  | { type: "SET_SESSION"; sessionId: string }
  | { type: "SET_AUDIO_URL"; audioUrl: string }
  | { type: "SET_AI_JOB"; aiJobId: string }
  | { type: "SET_FEEDBACK"; feedback: PracticeSessionDetails }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_UPLOADING"; uploading: boolean }
  | { type: "SET_POLLING"; polling: boolean };

const initialState: State = {
  step: "pick",
  language: "en",
  uploading: false,
  polling: false
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "RESET":
      return {
        ...initialState,
        ...(action.keepTopic ? { topic: state.topic, activityType: state.activityType } : {})
      };
    case "SET_ACTIVITY":
      return { ...state, activityType: action.activityType };
    case "SET_TOPIC":
      return { ...state, topic: action.topic };
    case "SET_POSITION":
      return { ...state, position: action.position };
    case "SET_LANGUAGE":
      return { ...state, language: action.language };
    case "NEXT_STEP":
      if (state.step === "pick") return { ...state, step: "audio" };
      if (state.step === "audio") return { ...state, step: "ai" };
      if (state.step === "ai") return { ...state, step: "results" };
      return state;
    case "SET_AUDIO":
      return { ...state, audioFile: action.file };
    case "SET_SESSION":
      return { ...state, sessionId: action.sessionId };
    case "SET_AUDIO_URL":
      return { ...state, audioUrl: action.audioUrl };
    case "SET_AI_JOB":
      return { ...state, aiJobId: action.aiJobId };
    case "SET_FEEDBACK":
      return { ...state, feedback: action.feedback };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "SET_UPLOADING":
      return { ...state, uploading: action.uploading };
    case "SET_POLLING":
      return { ...state, polling: action.polling };
    default:
      return state;
  }
}


interface PracticeWizardProps {
  initialStep?: 'pick' | 'audio';
}

const PracticeWizard: React.FC<PracticeWizardProps> = ({ initialStep = 'pick' }) => {
  const [state, dispatch] = useReducer(reducer, { ...initialState, step: initialStep });

  // Utility: Get studentId from localStorage (or fallback)
  const getStudentId = () => localStorage.getItem("student_id") || "cec48a71-e5a1-4e29-ba21-9cbc7549d8ec";

  // Step 1: Pick topic and activity
  const handleStart = async (payload: PracticeSessionPayload) => {
    dispatch({ type: "SET_ERROR", error: "" });
    try {
      dispatch({ type: "SET_UPLOADING", uploading: true });
      const studentId = getStudentId();
      const session = await api.createPracticeSession(payload, studentId);
      dispatch({ type: "SET_SESSION", sessionId: session.sessionId });
      dispatch({ type: "NEXT_STEP" });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    } finally {
      dispatch({ type: "SET_UPLOADING", uploading: false });
    }
  };

  // Step 2: Audio upload
  const handleAudioUpload = async (file: File) => {
    if (!state.sessionId) return;
    dispatch({ type: "SET_ERROR", error: "" });
    dispatch({ type: "SET_UPLOADING", uploading: true });
    try {
      const studentId = getStudentId();
      const { uploadUrl, audioUrl } = await api.getUploadUrl(state.sessionId, file, studentId);
      await api.uploadAudio(uploadUrl, file);
      await api.attachAudio(state.sessionId, audioUrl, studentId);
      dispatch({ type: "SET_AUDIO", file });
      dispatch({ type: "SET_AUDIO_URL", audioUrl });
      dispatch({ type: "NEXT_STEP" });
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
    } finally {
      dispatch({ type: "SET_UPLOADING", uploading: false });
    }
  };

  // Step 3: Request AI feedback
  const handleRequestFeedback = async () => {
    if (!state.sessionId) return;
    dispatch({ type: "SET_ERROR", error: "" });
    dispatch({ type: "SET_POLLING", polling: true });
    try {
      const studentId = getStudentId();
      const { jobId } = await api.requestAiFeedback(state.sessionId, studentId);
      dispatch({ type: "SET_AI_JOB", aiJobId: jobId });
      // Poll for feedback
      pollFeedback(state.sessionId, studentId);
    } catch (e: any) {
      dispatch({ type: "SET_ERROR", error: e.message });
      dispatch({ type: "SET_POLLING", polling: false });
    }
  };

  // Polling logic
  const pollFeedback = (sessionId: string, studentId: string) => {
    let cancelled = false;
    const poll = async () => {
      try {
        const details = await api.getSessionDetails(sessionId, studentId);
        if (details.ai_feedback_status === "completed") {
          dispatch({ type: "SET_FEEDBACK", feedback: details });
          dispatch({ type: "NEXT_STEP" });
          dispatch({ type: "SET_POLLING", polling: false });
        } else if (details.ai_feedback_status === "failed") {
          dispatch({ type: "SET_ERROR", error: "AI Coach failed. Please try again." });
          dispatch({ type: "SET_POLLING", polling: false });
        } else if (!cancelled) {
          setTimeout(poll, 1200);
        }
      } catch (e: any) {
        dispatch({ type: "SET_ERROR", error: e.message });
        dispatch({ type: "SET_POLLING", polling: false });
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  };

  // Stepper steps
  const steps = [
    "Pick Topic",
    "Record/Upload Audio",
    "AI Coach Feedback",
    "Results"
  ];

  // Render
  return (
    <div className={styles.practiceWizard}>
      {state.step !== "results" && (
        <Stepper
          steps={steps}
          currentStep={steps.indexOf(
            state.step === "pick"
              ? "Pick Topic"
              : state.step === "audio"
              ? "Record/Upload Audio"
              : state.step === "ai"
              ? "AI Coach Feedback"
              : "Results"
          )}
        />
      )}
      {state.step === "pick" && (
        <TopicPicker
          activityType={state.activityType}
          topic={state.topic}
          position={state.position}
          language={state.language}
          onStart={handleStart}
          onSetActivity={type => dispatch({ type: "SET_ACTIVITY", activityType: type })}
          onSetTopic={topic => dispatch({ type: "SET_TOPIC", topic })}
          onSetPosition={pos => dispatch({ type: "SET_POSITION", position: pos })}
          onSetLanguage={lang => dispatch({ type: "SET_LANGUAGE", language: lang })}
          loading={state.uploading}
          error={state.error}
        />
      )}
      {state.step === "audio" && (
        <AudioUploadStep
          onUpload={handleAudioUpload}
          loading={state.uploading}
          error={state.error}
        />
      )}
      {state.step === "ai" && (
        <div className={styles.aiFeedbackStep}>
          <button
            className={styles.bigButton}
            onClick={handleRequestFeedback}
            disabled={state.polling}
          >
            Get AI Coach Feedback
          </button>
          {state.polling && (
            <div className={styles.loader}>
              <span role="img" aria-label="listening">👂</span> Your AI Coach is listening…
              <div className={styles.animatedLoader}></div>
            </div>
          )}
          {state.error && (
            <div className={styles.errorBox}>
              {state.error} <button onClick={handleRequestFeedback}>Try again</button>
            </div>
          )}
        </div>
      )}
      {state.step === "results" && state.feedback && (
        <FeedbackResults
          feedback={state.feedback}
          activityType={state.activityType!}
          onPracticeAgain={(stepOverride?: 'pick' | 'audio') => {
            if (stepOverride === 'audio') {
              dispatch({ type: "RESET", keepTopic: true });
              // jump to audio step
              dispatch({ type: "NEXT_STEP" });
            } else {
              dispatch({ type: "RESET", keepTopic: true });
            }
          }}
          onNewTopic={() => dispatch({ type: "RESET" })}
        />
      )}
    </div>
  );
};

export default PracticeWizard;
