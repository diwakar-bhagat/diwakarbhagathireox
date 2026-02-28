import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { upload, uploadJd } from "../middlewares/multer.js"
import { abandonInterview, analyzeJd, analyzeResume, attachJdToInterview, finishInterview, generateQuestion, getInterviewReport, getInterviewSession, getMyInterviews, submitAnswer } from "../controllers/interview.controller.js"




const interviewRouter = express.Router()

interviewRouter.post("/resume",isAuth,upload.single("resume"),analyzeResume)
interviewRouter.post("/analyze-resume",isAuth,upload.single("resume"),analyzeResume)
interviewRouter.post("/analyze-jd",isAuth,uploadJd.single("jdFile"),analyzeJd)
interviewRouter.patch("/:id/attach-jd",isAuth,uploadJd.single("jdFile"),attachJdToInterview)
interviewRouter.post("/generate-questions",isAuth,generateQuestion)
interviewRouter.post("/submit-answer",isAuth,submitAnswer)
interviewRouter.post("/finish",isAuth,finishInterview)
interviewRouter.post("/:id/abandon",isAuth,abandonInterview)

interviewRouter.get("/get-interview",isAuth,getMyInterviews)
interviewRouter.get("/session/:id",isAuth,getInterviewSession)
interviewRouter.get("/report/:id",isAuth,getInterviewReport)



export default interviewRouter
