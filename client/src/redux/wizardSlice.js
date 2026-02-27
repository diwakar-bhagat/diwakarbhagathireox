import { createSlice } from "@reduxjs/toolkit";

export const wizardSlice = createSlice({
    name: "wizard",
    initialState: {
        resumeAnalysis: null,
        jdAnalysis: null,
        gapAnalysis: null,
        interviewPlan: null,
    },
    reducers: {
        setResumeData: (state, action) => {
            state.resumeAnalysis = action.payload;
        },
        setJdData: (state, action) => {
            state.jdAnalysis = action.payload.jd;
            state.gapAnalysis = action.payload.gapAnalysis;
            state.interviewPlan = action.payload.interviewPlan;
        },
        clearWizardData: (state) => {
            state.resumeAnalysis = null;
            state.jdAnalysis = null;
            state.gapAnalysis = null;
            state.interviewPlan = null;
        }
    }
});

export const { setResumeData, setJdData, clearWizardData } = wizardSlice.actions;
export default wizardSlice.reducer;
