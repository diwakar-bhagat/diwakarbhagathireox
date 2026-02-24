import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  appBooting: true,
  bootProgress: 0,
  resumeParsing: false,
  paymentProcessing: {
    status: "idle",
    message: "",
  },
  aiThinking: false,
};

const clampProgress = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, numeric));
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    startAppBoot: (state) => {
      state.appBooting = true;
      state.bootProgress = 0;
    },
    setBootProgress: (state, action) => {
      const next = clampProgress(action.payload);
      state.bootProgress = Math.max(state.bootProgress, next);
    },
    finishAppBoot: (state) => {
      state.bootProgress = 100;
      state.appBooting = false;
    },
    setResumeParsing: (state, action) => {
      state.resumeParsing = Boolean(action.payload);
    },
    setPaymentProcessing: (state, action) => {
      const payload = action.payload || {};
      state.paymentProcessing = {
        status: payload.status || "idle",
        message: payload.message || "",
      };
    },
    clearPaymentProcessing: (state) => {
      state.paymentProcessing = {
        status: "idle",
        message: "",
      };
    },
    setAiThinking: (state, action) => {
      state.aiThinking = Boolean(action.payload);
    },
  },
});

export const {
  startAppBoot,
  setBootProgress,
  finishAppBoot,
  setResumeParsing,
  setPaymentProcessing,
  clearPaymentProcessing,
  setAiThinking,
} = uiSlice.actions;

export default uiSlice.reducer;
