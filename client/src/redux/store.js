import { configureStore } from '@reduxjs/toolkit'
import userSlice from "./userSlice"
import uiSlice from "./uiSlice"
import oxbotSlice from "./oxbotSlice"
import wizardSlice from "./wizardSlice"

export default configureStore({
  reducer: {
    user: userSlice,
    ui: uiSlice,
    oxbot: oxbotSlice,
    wizard: wizardSlice
  },
})
