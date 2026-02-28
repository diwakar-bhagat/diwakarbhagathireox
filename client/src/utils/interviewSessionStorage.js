const INTERVIEW_ID_KEY = "hireox:lastInterviewId";
const INTERVIEW_INDEX_KEY = "hireox:lastInterviewIndex";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const getStoredInterviewSessionMeta = () => {
  if (!canUseStorage()) {
    return { interviewId: "", currentIndex: 0 };
  }

  const interviewId = window.localStorage.getItem(INTERVIEW_ID_KEY) || "";
  const rawIndex = Number(window.localStorage.getItem(INTERVIEW_INDEX_KEY) || "0");

  return {
    interviewId: interviewId.trim(),
    currentIndex: Number.isInteger(rawIndex) && rawIndex >= 0 ? rawIndex : 0,
  };
};

export const storeInterviewSessionMeta = ({ interviewId, currentIndex = 0 }) => {
  if (!canUseStorage()) return;

  const safeInterviewId = typeof interviewId === "string" ? interviewId.trim() : "";
  if (!safeInterviewId) return;

  const safeIndex = Number.isInteger(currentIndex) && currentIndex >= 0 ? currentIndex : 0;
  window.localStorage.setItem(INTERVIEW_ID_KEY, safeInterviewId);
  window.localStorage.setItem(INTERVIEW_INDEX_KEY, String(safeIndex));
};

export const clearInterviewSessionMeta = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(INTERVIEW_ID_KEY);
  window.localStorage.removeItem(INTERVIEW_INDEX_KEY);
};
