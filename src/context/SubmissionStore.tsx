import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { Submission } from "@/types/submission";

const SESSION_KEY = "brightminds-submissions";
const LOCAL_KEY = "brightminds-submissions-local";
const DRAFT_KEY_PREFIX = "brightminds-draft-";
const SUBMISSION_KEY_PREFIX = "submission-";

type AssignmentDraft = {
  assignmentId: string;
  text: string;
  tip?: string;
};

type SubmissionStoreState = {
  cachedSubmissions: Record<string, Submission>;
  currentAssignmentDraft: AssignmentDraft | null;
};

type SubmissionStoreAction =
  | { type: "setSubmission"; submission: Submission }
  | { type: "clearSubmission"; submissionId: string }
  | { type: "setDraft"; draft: AssignmentDraft | null };

const defaultState: SubmissionStoreState = {
  cachedSubmissions: {},
  currentAssignmentDraft: null,
};

const SubmissionStoreContext = createContext<{
  state: SubmissionStoreState;
  setSubmission: (submission: Submission) => void;
  clearSubmission: (submissionId: string) => void;
  setDraft: (draft: AssignmentDraft | null) => void;
} | null>(null);

const reducer = (state: SubmissionStoreState, action: SubmissionStoreAction): SubmissionStoreState => {
  switch (action.type) {
    case "setSubmission": {
      return {
        ...state,
        cachedSubmissions: {
          ...state.cachedSubmissions,
          [action.submission.id]: action.submission,
        },
      };
    }
    case "clearSubmission": {
      const { [action.submissionId]: _, ...rest } = state.cachedSubmissions;
      return {
        ...state,
        cachedSubmissions: rest,
      };
    }
    case "setDraft": {
      return {
        ...state,
        currentAssignmentDraft: action.draft,
      };
    }
    default:
      return state;
  }
};

const loadSessionSubmissions = () => {
  if (typeof window === "undefined") return {};
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Submission>;
    return parsed || {};
  } catch {
    return {};
  }
};

const loadLocalSubmissions = () => {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, Submission>;
    return parsed || {};
  } catch {
    return {};
  }
};

export const SubmissionStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, defaultState, (initial) => ({
    ...initial,
    cachedSubmissions: {
      ...loadLocalSubmissions(),
      ...loadSessionSubmissions(),
    },
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.cachedSubmissions));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.cachedSubmissions));
  }, [state.cachedSubmissions]);

  const value = useMemo(() => ({
    state,
    setSubmission: (submission: Submission) => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`${SUBMISSION_KEY_PREFIX}${submission.id}`, JSON.stringify(submission));
        localStorage.setItem(`${SUBMISSION_KEY_PREFIX}${submission.id}`, JSON.stringify(submission));
      }
      dispatch({ type: "setSubmission", submission });
    },
    clearSubmission: (submissionId: string) => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`${SUBMISSION_KEY_PREFIX}${submissionId}`);
        localStorage.removeItem(`${SUBMISSION_KEY_PREFIX}${submissionId}`);
      }
      dispatch({ type: "clearSubmission", submissionId });
    },
    setDraft: (draft: AssignmentDraft | null) => {
      if (typeof window !== "undefined") {
        if (draft) {
          sessionStorage.setItem(`${DRAFT_KEY_PREFIX}${draft.assignmentId}`, JSON.stringify(draft));
        } else {
          Object.keys(sessionStorage)
            .filter((key) => key.startsWith(DRAFT_KEY_PREFIX))
            .forEach((key) => sessionStorage.removeItem(key));
        }
      }
      dispatch({ type: "setDraft", draft });
    },
  }), [state]);

  return <SubmissionStoreContext.Provider value={value}>{children}</SubmissionStoreContext.Provider>;
};

export const useSubmissionStore = () => {
  const context = useContext(SubmissionStoreContext);
  if (!context) {
    throw new Error("useSubmissionStore must be used within SubmissionStoreProvider");
  }
  return context;
};

export const loadDraftFromSession = (assignmentId: string): AssignmentDraft | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${DRAFT_KEY_PREFIX}${assignmentId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssignmentDraft;
  } catch {
    return null;
  }
};

export const loadSubmissionFromSession = (submissionId: string): Submission | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${SUBMISSION_KEY_PREFIX}${submissionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Submission;
  } catch {
    return null;
  }
};

export const loadSubmissionFromLocalStorage = (submissionId: string): Submission | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${SUBMISSION_KEY_PREFIX}${submissionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Submission;
  } catch {
    return null;
  }
};
