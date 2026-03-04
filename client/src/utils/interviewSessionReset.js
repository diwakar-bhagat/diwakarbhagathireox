import store from "../redux/store";
import { clearWizardData } from "../redux/wizardSlice";
import { setResumeParsing } from "../redux/uiSlice";

const ACTIVE_INTERVIEW_ID_KEY = "hireox:currentInterviewId";

// Backward-compatible cleanup for legacy client-side interview state.
const SESSION_STORAGE_KEYS = [
  ACTIVE_INTERVIEW_ID_KEY,
  "hireox:lastInterviewId",
  "hireox:lastInterviewIndex",
  "resumeParsed",
  "resumeFileName",
  "analysisJSON",
  "jdText",
  "setupStep",
  "currentInterviewId",
];

const LOCAL_STORAGE_KEYS = [
  ACTIVE_INTERVIEW_ID_KEY,
];

const removeKeys = (storage, keys) => {
  if (!storage) {
    return;
  }

  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage access issues in private mode or restricted contexts.
    }
  });
};

export const setActiveInterviewClientId = (interviewId) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedInterviewId =
    typeof interviewId === "string" ? interviewId.trim() : "";

  if (!normalizedInterviewId) {
    return;
  }

  try {
    window.sessionStorage.setItem(ACTIVE_INTERVIEW_ID_KEY, normalizedInterviewId);
  } catch {
    // No-op
  }

  try {
    window.localStorage.setItem(ACTIVE_INTERVIEW_ID_KEY, normalizedInterviewId);
  } catch {
    // No-op
  }
};

export const getActiveInterviewClientId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const readKey = (storage) => {
    if (!storage) {
      return "";
    }

    try {
      const value = storage.getItem(ACTIVE_INTERVIEW_ID_KEY);
      return typeof value === "string" ? value.trim() : "";
    } catch {
      return "";
    }
  };

  return readKey(window.sessionStorage) || readKey(window.localStorage);
};

export const clearInterviewClientState = () => {
  if (typeof window !== "undefined") {
    removeKeys(window.sessionStorage, SESSION_STORAGE_KEYS);
    removeKeys(window.localStorage, LOCAL_STORAGE_KEYS);
  }

  store.dispatch(clearWizardData());
  store.dispatch(setResumeParsing(false));
};

