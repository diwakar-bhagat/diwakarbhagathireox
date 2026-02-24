import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    isOpen: false,
    isThinking: false,
    messages: [],
    context: {},
    suggestedActions: []
};

const oxbotSlice = createSlice({
    name: "oxbot",
    initialState,
    reducers: {
        toggleBot(state) {
            state.isOpen = !state.isOpen;
        },
        openBot(state) {
            state.isOpen = true;
        },
        closeBot(state) {
            state.isOpen = false;
        },
        setThinking(state, action) {
            state.isThinking = action.payload;
        },
        addMessage(state, action) {
            state.messages.push(action.payload);
        },
        clearMessages(state) {
            state.messages = [];
        },
        setContext(state, action) {
            state.context = action.payload;
        },
        setSuggestedActions(state, action) {
            state.suggestedActions = action.payload;
        }
    }
});

export const {
    toggleBot,
    openBot,
    closeBot,
    setThinking,
    addMessage,
    clearMessages,
    setContext,
    setSuggestedActions
} = oxbotSlice.actions;

export default oxbotSlice.reducer;
