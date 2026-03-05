import React from 'react'
import maleVideo from "../assets/videos/male-ai.mp4"
import femaleVideo from "../assets/videos/female-ai.mp4"
import Timer from './Timer'
import { motion as Motion } from "motion/react"
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { useState } from 'react'
import { useRef } from 'react'
import { useEffect } from 'react'
import { useCallback } from 'react'
import axios from "axios"
import { ServerUrl } from '../App'
import { BsArrowRight } from 'react-icons/bs'
import { useDispatch, useSelector } from 'react-redux'
import { setAiThinking } from '../redux/uiSlice'
import AIThinkingIndicator from './loaders/AIThinkingIndicator'
import { IoSparkles } from "react-icons/io5";
import { auth } from '../utils/firebase'
import DebugPanel from './DebugPanel'

const AnswerInput = React.memo(React.forwardRef(({ disabled, value, onChange }, ref) => {
  const [text, setText] = useState(value || "");
  React.useImperativeHandle(ref, () => ({
    getValue: () => text,
    appendValue: (val) => setText(prev => prev + " " + val),
    setValue: (val) => setText(val)
  }));
  return (
    <textarea
      disabled={disabled}
      placeholder="Type your answer here..."
      onChange={(e) => {
        setText(e.target.value);
        if (onChange) onChange(e.target.value);
      }}
      value={text}
      style={{ touchAction: 'pan-y' }}
      className="flex-1 bg-gray-100 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-[#5100FF] transition text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
    />
  );
}));

const LocalTimer = React.memo(({ totalTime, onTimeUp, isIntroPhase, parentTimeTakenRef }) => {
  const safeTotalTime = Number.isFinite(Number(totalTime)) && Number(totalTime) > 0
    ? Number(totalTime)
    : 60;
  const [timeLeft, setTimeLeft] = useState(safeTotalTime);
  useEffect(() => {
    if (parentTimeTakenRef) parentTimeTakenRef.current = 0;
  }, [parentTimeTakenRef]);
  useEffect(() => {
    if (isIntroPhase) return;
    if (timeLeft <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (parentTimeTakenRef) parentTimeTakenRef.current = safeTotalTime - next;
        if (next <= 0) clearInterval(timerId);
        return next;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [isIntroPhase, timeLeft, safeTotalTime, parentTimeTakenRef, onTimeUp]);
  return <Timer timeLeft={timeLeft} totalTime={totalTime} />;
});

function Step2Interview({ interviewData, onFinish }) {
  const getSpeechSynthesis = () =>
    (typeof window !== "undefined" && "speechSynthesis" in window)
      ? window.speechSynthesis
      : null;

  const dispatch = useDispatch()
  const aiThinking = useSelector((state) => state.ui.aiThinking)
  const userData = useSelector((state) => state.user.userData)
  const { interviewId, questions, userName } = interviewData;
  const safeInitialQuestionIndex = Number.isInteger(interviewData?.currentIndex) && interviewData.currentIndex >= 0
    ? interviewData.currentIndex
    : 0;
  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isMicOn, setIsMicOn] = useState(true);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef(null);
  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!Array.isArray(questions) || questions.length === 0) {
      return 0;
    }
    return Math.min(safeInitialQuestionIndex, questions.length - 1);
  });
  const [dynamicQuestions, setDynamicQuestions] = useState(Array.isArray(questions) ? questions : []);
  const [agentMeta, setAgentMeta] = useState(null);
  const SHOW_AGENT_CHIPS = true;
  const answerInputRef = useRef(null);
  const timeTakenRef = useRef(0);
  const [feedback, setFeedback] = useState("");
  // Timer state moved to LocalTimer to prevent heavy parent re-renders
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceGender, setVoiceGender] = useState("female");
  const [subtitle, setSubtitle] = useState("");
  const [introGreeting, setIntroGreeting] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionStatus, setSessionStatus] = useState(interviewData?.status || "in_progress");
  const [lastApiStatus, setLastApiStatus] = useState("idle");
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const debugEnabled = import.meta.env.VITE_DEBUG === "1"
    || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");


  const videoRef = useRef(null);
  const isSessionActive = sessionStatus === "in_progress" || sessionStatus === "Incompleted";

  const currentQuestion = dynamicQuestions[currentIndex];
  const currentQuestionRef = useRef(currentQuestion);
  const announcedQuestionIndexRef = useRef(-1);
  const isMicOnRef = useRef(isMicOn);
  const isIntroPhaseRef = useRef(isIntroPhase);
  const isSubmittingRef = useRef(isSubmitting);
  const feedbackRef = useRef(feedback);
  const userNameRef = useRef(userName);
  const questionsLengthRef = useRef(dynamicQuestions.length);
  const speakTextRef = useRef(null);
  const startMicRef = useRef(null);
  const submitAnswerRef = useRef(null);
  const hasFinalizedRef = useRef(false);
  const abandonSentRef = useRef(false);
  const isFinishingRef = useRef(false);
  const sendAbandonSignalRef = useRef(null);
  const isMountedRef = useRef(true);
  const abandonTimerRef = useRef(null);

  currentQuestionRef.current = currentQuestion;
  isMicOnRef.current = isMicOn;
  isIntroPhaseRef.current = isIntroPhase;
  isSubmittingRef.current = isSubmitting;
  feedbackRef.current = feedback;
  userNameRef.current = userName;
  questionsLengthRef.current = dynamicQuestions.length;

  useEffect(() => {
    if (interviewData?.status) {
      setSessionStatus(interviewData.status);
    }
  }, [interviewData?.status]);

  const yieldToBrowser = () => new Promise((resolve) => {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });

  const resolveErrorMessage = (error, fallback) =>
    error?.response?.data?.message
    || error?.message
    || fallback;

  const sendAbandonSignal = useCallback(({ source = "cleanup", preferBeacon = false } = {}) => {
    // Only abandon if we haven't finalized and status is still in progress.
    const isCompletedOrArchived = ["completed", "failed", "abandoned"].includes(sessionStatus);
    if (!interviewId || hasFinalizedRef.current || isFinishingRef.current || abandonSentRef.current || isCompletedOrArchived) {
      return;
    }

    abandonSentRef.current = true;
    const abandonUrl = `${ServerUrl}/api/interview/${interviewId}/abandon`;
    const payload = JSON.stringify({ source });

    if (preferBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        const beaconBody = new Blob([payload], { type: "application/json" });
        if (navigator.sendBeacon(abandonUrl, beaconBody)) {
          return;
        }
      } catch (error) {
        console.log("Beacon Error:", error);
      }
    }

    if (typeof fetch === "function") {
      fetch(abandonUrl, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      }).catch(() => { });
    }
  }, [interviewId, sessionStatus]);
  sendAbandonSignalRef.current = sendAbandonSignal;


  useEffect(() => {
    const loadVoices = () => {
      const speechSynthesis = getSpeechSynthesis();
      if (!speechSynthesis) return;
      const voices = speechSynthesis.getVoices();
      if (!voices.length) return;

      // Try known female voices first
      const femaleVoice =
        voices.find(v =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female")
        );

      if (femaleVoice) {
        setSelectedVoice(femaleVoice);
        setVoiceGender("female");
        return;
      }

      // Try known male voices
      const maleVoice =
        voices.find(v =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male")
        );

      if (maleVoice) {
        setSelectedVoice(maleVoice);
        setVoiceGender("male");
        return;
      }

      // Fallback: first voice (assume female)
      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();
    const speechSynthesis = getSpeechSynthesis();
    if (speechSynthesis) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      const cleanupSpeechSynthesis = getSpeechSynthesis();
      if (cleanupSpeechSynthesis) {
        cleanupSpeechSynthesis.onvoiceschanged = null;
      }
    };
  }, [])

  const videoSource = voiceGender === "male" ? maleVideo : femaleVideo;


  /* ---------------- SPEAK FUNCTION ---------------- */
  const speakText = (text) => {
    return new Promise((resolve) => {
      const speechSynthesis = getSpeechSynthesis();
      if (!speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
        setSubtitle(text);
        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 1200);
        return;
      }

      speechSynthesis.cancel();

      // Add natural pauses after commas and periods
      const humanText = text
        .replace(/,/g, ", ... ")
        .replace(/\./g, ". ... ");

      const utterance = new window.SpeechSynthesisUtterance(humanText);

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Human-like pacing
      utterance.rate = 0.92;     // slightly slower than normal
      utterance.pitch = 1.05;    // small warmth
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        stopMic()
        const playAttempt = videoRef.current?.play();
        if (playAttempt?.catch) {
          playAttempt.catch((err) => {
            if (err.name === "NotAllowedError" || err.name === "AbortError") {
              // Ignore these as they are standard browser auto-play preventions and not hard media failures
              return;
            }
            setVideoUnavailable(true);
          });
        }
      };


      const cleanupAndResolve = () => {
        videoRef.current?.pause();
        if (videoRef.current) videoRef.current.currentTime = 0;
        setIsAIPlaying(false);
        if (isMicOn) {
          startMic();
        }
        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };

      utterance.onend = cleanupAndResolve;
      utterance.onerror = cleanupAndResolve;


      setSubtitle(text);

      speechSynthesis.speak(utterance);
    });
  };
  speakTextRef.current = speakText;


  useEffect(() => {
    const runIntro = async () => {
      if (isIntroPhase) {
        setIntroGreeting(`Hi ${userNameRef.current}, welcome to your mock interview.`);
        await speakTextRef.current?.(
          `Hi ${userNameRef.current}, it's great to meet you today. I hope you're feeling confident and ready.`
        );

        await speakTextRef.current?.(
          "I'll ask you a few questions. Just answer naturally, and take your time. Let's begin."
        );

        setIntroGreeting("");
        setIsIntroPhase(false)
      } else if (currentQuestionRef.current) {
        if (announcedQuestionIndexRef.current === currentIndex) {
          return;
        }
        announcedQuestionIndexRef.current = currentIndex;
        await new Promise(r => setTimeout(r, 800));

        // If last question (hard level)
        if (currentIndex === questionsLengthRef.current - 1) {
          await speakTextRef.current?.("Alright, this one might be a bit more challenging.");
        }

        await speakTextRef.current?.(currentQuestionRef.current.question);

        if (isMicOnRef.current) {
          startMicRef.current?.();
        }
      }

    }

    runIntro()


  }, [selectedVoice, isIntroPhase, currentIndex])



  // Timer logic moved to LocalTimer inner component to prevent Step2Interview re-renders


  useEffect(() => {
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionApi) {
      setMicSupported(false);
      setIsMicOn(false);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript;

      answerInputRef.current?.appendValue(transcript);
    };

    recognition.onerror = () => {
      setMicSupported(false);
      setIsMicOn(false);
      setErrorMessage("Microphone input is unavailable on this device. Continue by typing your answer.");
    };

    recognitionRef.current = recognition;

  }, []);


  const startMic = () => {
    if (!micSupported) {
      return;
    }
    if (recognitionRef.current && !isAIPlaying) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        if (error?.name !== "InvalidStateError") {
          setMicSupported(false);
          setIsMicOn(false);
          setErrorMessage("Microphone input is unavailable on this device. Continue by typing your answer.");
          console.log(error);
        }
      }
    }
  };
  startMicRef.current = startMic;

  const stopMic = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  const toggleMic = () => {
    if (!micSupported) {
      setErrorMessage("Microphone input is unavailable on this device. Continue by typing your answer.");
      return;
    }
    if (isMicOn) {
      stopMic();
    } else {
      startMic();
    }
    setIsMicOn(!isMicOn);
  };


  const submitAnswer = async () => {
    if (!isSessionActive) {
      setErrorMessage("Session is not active");
      return;
    }
    if (isSubmitting) return;
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    stopMic()
    setErrorMessage("")
    setLastApiStatus("submit:pending")
    setIsSubmitting(true)
    dispatch(setAiThinking(true))
    await yieldToBrowser();

    try {
      const result = await axios.post(ServerUrl + "/api/interview/submit-answer", {
        interviewId,
        questionIndex: currentIndex,
        answer: answerInputRef.current?.getValue() || "",
        timeTaken: timeTakenRef.current || 0,
      }, { withCredentials: true })
      setLastApiStatus("submit:200")

      if (result.data.nextQuestion && currentIndex + 1 < dynamicQuestions.length) {
        setDynamicQuestions(prev => {
          const updated = [...prev];
          updated[currentIndex + 1] = { ...updated[currentIndex + 1], question: result.data.nextQuestion };
          return updated;
        });
      }

      if (result.data.nextStrategy || result.data.sessionState || result.data.evaluation) {
        setAgentMeta({
          strategy: result.data.nextStrategy,
          difficulty: result.data.sessionState?.current_difficulty,
          weakness: result.data.sessionState?.weakness_tags?.slice(0, 2) || [],
          coachingTip: result.data.evaluation?.coaching_tip || null,
          missingElements: result.data.evaluation?.missing_elements || []
        });
      }

      setFeedback(result.data.feedback)
      speakText(result.data.feedback)
    } catch (error) {
      const status = error?.response?.status || "error";
      setLastApiStatus(`submit:${status}`)
      const backendError = error?.response?.data?.error;
      const backendStatus = error?.response?.data?.status;
      if (backendError === "SESSION_NOT_ACTIVE" || backendStatus === "abandoned") {
        setSessionStatus(backendStatus || "abandoned");
        setErrorMessage("");
        return;
      }
      setErrorMessage(resolveErrorMessage(error, "Failed to submit answer"));
      console.log(error)
    } finally {
      setIsSubmitting(false)
      dispatch(setAiThinking(false))
    }
  }
  submitAnswerRef.current = submitAnswer;

  const handleNext = async () => {
    if (!isSessionActive) {
      setErrorMessage("Session is not active");
      return;
    }
    setErrorMessage("");
    setLastApiStatus("next:local");
    answerInputRef.current?.setValue("");
    setFeedback("");

    if (currentIndex + 1 >= dynamicQuestions.length) {
      finishInterview();
      return;
    }

    await speakText("Alright, let's move to the next question.");

    setCurrentIndex((prev) => prev + 1);
  }

  const finishInterview = async () => {
    stopMic()
    setIsMicOn(false)
    setErrorMessage("")
    setLastApiStatus("finish:pending")
    dispatch(setAiThinking(false))
    isFinishingRef.current = true
    try {
      const result = await axios.post(ServerUrl + "/api/interview/finish", { interviewId }, { withCredentials: true })
      setLastApiStatus("finish:200")
      hasFinalizedRef.current = true
      onFinish(result.data)
    } catch (error) {
      isFinishingRef.current = false
      const status = error?.response?.status || "error";
      setLastApiStatus(`finish:${status}`)
      setErrorMessage(resolveErrorMessage(error, "Failed to finish interview"));
      console.log(error)
    }
  }


  // Auto-submit logic handled by LocalTimer onTimeUp

  // Browser-level exit signals (beforeunload / pagehide)
  // Uses ref so the effect never re-registers when sendAbandonSignal changes identity
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleBeforeUnload = () => {
      sendAbandonSignalRef.current?.({ source: "beforeunload", preferBeacon: true });
    };

    const handlePageHide = () => {
      sendAbandonSignalRef.current?.({ source: "pagehide", preferBeacon: true });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  // Track genuine mount state
  useEffect(() => {
    isMountedRef.current = true;
    // Cancel any pending abandon timer from a previous Strict Mode unmount simulation
    if (abandonTimerRef.current) {
      clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = null;
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Synchronous cleanup (mic, speech, AI thinking) — safe to run on any unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      }
      const speechSynthesis = getSpeechSynthesis();
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      dispatch(setAiThinking(false));
    };
  }, [dispatch]);

  // NOTE: We intentionally do NOT send an abandon signal on unmount.
  // React Strict Mode and effect re-registration cause false unmounts that
  // prematurely abandon the session. Real exits are caught by beforeunload/pagehide above.

  useEffect(() => {
    if (!debugEnabled) return;
    console.log("[interview-step-debug]", {
      interviewId,
      sessionStatus,
      currentIndex,
      questionLength: dynamicQuestions.length,
      lastApiStatus,
      authReady: Boolean(userData || auth.currentUser),
      isSubmitting,
      isIntroPhase,
      micSupported,
      isMicOn,
    });
  }, [
    currentIndex,
    debugEnabled,
    dynamicQuestions.length,
    interviewId,
    sessionStatus,
    isIntroPhase,
    isMicOn,
    isSubmitting,
    lastApiStatus,
    micSupported,
    userData,
  ]);







  return (
    <div className='min-h-screen relative z-10 flex items-center justify-center p-4 sm:p-6 transition-colors duration-300'>
      <div className='w-full max-w-350 min-h-[80vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col lg:flex-row overflow-hidden'>

        {/* video section */}
        <div className='w-full lg:w-[35%] bg-white dark:bg-slate-900 flex flex-col items-center p-6 space-y-6 border-r border-gray-200 dark:border-slate-800'>
          <div className='w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-transparent dark:border-slate-700'>
            {videoUnavailable ? (
              <div className="flex aspect-video items-center justify-center bg-[#5100FF]/10 px-6 text-center text-sm font-medium text-[#A78BFA]">
                AI interviewer is ready. Continue with text and audio prompts.
              </div>
            ) : (
              <video
                src={videoSource}
                key={videoSource}
                ref={videoRef}
                muted
                playsInline
                preload="metadata"
                onError={() => setVideoUnavailable(true)}
                className="w-full h-auto object-cover"
              />
            )}
          </div>

          {/* subtitle */}
          {subtitle && (
            <div className='w-full max-w-md bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm'>
              <p className='text-gray-700 dark:text-gray-200 text-sm sm:text-base font-medium text-center leading-relaxed'>{subtitle}</p>
            </div>
          )}


          {/* timer Area */}
          <div className='w-full max-w-md bg-white dark:bg-slate-800/30 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-md p-6 space-y-5'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>
                Interview Status
              </span>
              {isAIPlaying && <span className='text-sm font-semibold text-[#8B5CF6]'>
                {isAIPlaying ? "AI Speaking" : ""}
              </span>}
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

            <div className='flex justify-center'>
              {isSessionActive ? (
                <LocalTimer key={`${currentIndex}-${currentQuestion?.timeLimit || 60}`} totalTime={currentQuestion?.timeLimit} onTimeUp={() => {
                  if (!isSubmittingRef.current && !feedbackRef.current && isSessionActive) {
                    submitAnswerRef.current?.();
                  }
                }} isIntroPhase={isIntroPhase} parentTimeTakenRef={timeTakenRef} />
              ) : (
                <div className='text-sm font-medium text-amber-600 dark:text-amber-400'>
                  Session not active
                </div>
              )}
            </div>

            <div className="h-px bg-gray-200 dark:bg-slate-700"></div>

            <div className='grid grid-cols-2 gap-6 text-center'>
              <div>
                <span className='text-2xl font-bold text-[#8B5CF6]'>{currentIndex + 1}</span>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Current Questions</p>
              </div>

              <div>
                <span className='text-2xl font-bold text-[#8B5CF6]'>{dynamicQuestions.length}</span>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Total Questions</p>
              </div>
            </div>


          </div>
        </div>

        {/* Text section */}

        <div className='flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative bg-white dark:bg-slate-900'>
          <h2 className='text-xl sm:text-2xl font-bold text-[#8B5CF6] mb-6'>
            AI Smart Interview
          </h2>

          {errorMessage && (
            <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {errorMessage}
            </div>
          )}

          {debugEnabled && (
            <div className='mb-4'>
              <DebugPanel
                title="Interview Debug"
                items={{
                  interviewId,
                  questionIndex: currentIndex + 1,
                  questionLength: dynamicQuestions.length,
                  lastApiStatus,
                  authStatus: userData || auth.currentUser ? "ready" : "missing",
                  startLoading: false,
                  submitLoading: isSubmitting,
                }}
              />
            </div>
          )}

          {isSessionActive && (
            isIntroPhase ? (
              <div className='relative mb-6 bg-gray-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden'>
                <p className='text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-2'>
                  Getting Started
                </p>
                <p className='text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 leading-relaxed'>
                  {introGreeting || `Hi ${userName || "there"}, welcome to your interview.`}
                </p>
              </div>
            ) : (
              <div className='relative mb-6 bg-gray-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden'>
                <p className='text-xs sm:text-sm text-gray-400 dark:text-gray-500 mb-2'>
                  Question {currentIndex + 1} of {dynamicQuestions.length}
                </p>

                {currentQuestion?.taggedSkills?.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mb-3'>
                    {currentQuestion.taggedSkills.map((skill, i) => (
                      <span key={i} className='text-[10px] sm:text-[11px] font-medium bg-gray-200/50 text-gray-600 dark:bg-slate-700/50 dark:text-slate-300 px-2 py-0.5 rounded-md border border-gray-300/50 dark:border-slate-600/50'>
                        Tested: {skill}
                      </span>
                    ))}
                  </div>
                )}

                <Motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className='text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 leading-relaxed'
                >
                  {currentQuestion?.question}
                </Motion.div>

                {SHOW_AGENT_CHIPS && agentMeta && (
                  <Motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className='flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-slate-700/50'
                  >
                    {agentMeta.strategy && (
                      <span className='px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-[#5100FF]/10 text-[#A78BFA] rounded-full border border-[#5100FF]/20 flex items-center gap-1 capitalize'>
                        <IoSparkles size={10} className="hidden sm:inline" />
                        {agentMeta.strategy.replace(/_/g, " ")}
                      </span>
                    )}
                    {agentMeta.difficulty && (
                      <span className='px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-[#5100FF]/10 text-[#A78BFA] rounded-full border border-[#5100FF]/20'>
                        Diff: L{agentMeta.difficulty}
                      </span>
                    )}
                    {agentMeta.weakness?.length > 0 && (
                      <span className='px-2.5 py-1 text-[10px] sm:text-xs font-medium bg-[#5100FF]/10 text-[#A78BFA] rounded-full border border-[#5100FF]/20 capitalize'>
                        Focus: {agentMeta.weakness.join(", ")}
                      </span>
                    )}
                  </Motion.div>
                )}
              </div>
            )
          )}
          {!isSessionActive ? (
            <div className='mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900'>
              Interview was abandoned. Resume it from History.
            </div>
          ) : (
            <AnswerInput
              ref={answerInputRef}
              disabled={isSubmitting || !!feedback}
            />
          )}


          {isSessionActive && !feedback ? (
            <div className='mt-6 space-y-3'>
              <div className='flex items-center gap-4'>
                <Motion.button
                  onClick={toggleMic}
                  disabled={!micSupported}
                  whileTap={{ scale: 0.9 }}
                  className='w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black bg-[#5100FF] text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'>
                  {isMicOn ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
                </Motion.button>

                <Motion.button
                  onClick={submitAnswer}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.95 }}
                  className='flex-1 bg-[#5100FF] hover:bg-[#5728F4] text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 transition font-semibold disabled:bg-gray-500 dark:disabled:bg-slate-800'>
                  {isSubmitting ? "Submitting..." : "Submit Answer"}
                </Motion.button>
              </div>

              {aiThinking && (
                <AIThinkingIndicator className='w-full justify-center' />
              )}
            </div>
          ) : (isSessionActive && feedback ? (
            <Motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className='mt-6 space-y-4'
            >
              <div className='bg-[#5100FF]/10 border border-[#5100FF]/20 p-5 rounded-2xl shadow-sm'>
                <h4 className='text-[11px] uppercase tracking-wide font-bold text-[#A78BFA] mb-2'>AI Feedback</h4>
                <p className='text-[#A78BFA] font-medium'>{feedback}</p>
              </div>

              {agentMeta && agentMeta.coachingTip && (
                <div className='bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30 p-4 rounded-xl shadow-sm'>
                  <h4 className='text-[11px] uppercase tracking-wide font-bold text-sky-800 dark:text-sky-400 mb-1'>Actionable Tip</h4>
                  <p className='text-sm text-sky-700 dark:text-sky-300 font-medium'>{agentMeta.coachingTip}</p>
                </div>
              )}

              {agentMeta && agentMeta.missingElements?.length > 0 && (
                <div className='bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-4 rounded-xl shadow-sm'>
                  <h4 className='text-[11px] uppercase tracking-wide font-bold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-1.5'>
                    Missed Opportunities
                  </h4>
                  <ul className='flex flex-wrap gap-1.5'>
                    {agentMeta.missingElements.slice(0, 3).map((item, i) => (
                      <li key={i} className='text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50'>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleNext}
                className='w-full bg-[#5100FF] hover:bg-[#5728F4] text-white py-3 sm:py-4 rounded-xl shadow-md hover:opacity-90 transition flex items-center justify-center gap-2 font-semibold'>
                Next Question <BsArrowRight size={18} />
              </button>
            </Motion.div>
          ) : null)}
        </div>
      </div>

    </div>
  )
}

export default Step2Interview
