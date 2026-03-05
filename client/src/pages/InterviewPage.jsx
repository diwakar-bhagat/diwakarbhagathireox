import React, { Suspense, lazy, useEffect, useState } from 'react'
import axios from "axios";
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { ServerUrl } from '../App';
import { clearInterviewClientState, setActiveInterviewClientId } from '../utils/interviewSessionReset';

const Step1SetUp = lazy(() => import('../components/Step1SetUp'))
const Step2Interview = lazy(() => import('../components/Step2Interview'))
const Step3Report = lazy(() => import('../components/Step3Report'))

const isActiveStatus = (status) => status === "in_progress" || status === "Incompleted";
const isCompletedStatus = (status) => status === "completed";

function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const appBooting = useSelector((state) => state.ui.appBooting);
  const resumeInterviewId = typeof location.state?.resumeInterviewId === "string"
    ? location.state.resumeInterviewId.trim()
    : "";
  const [step, setStep] = useState(1)
  const [interviewData, setInterviewData] = useState(null)
  const [isRecovering, setIsRecovering] = useState(Boolean(resumeInterviewId));
  const [recoveryError, setRecoveryError] = useState("");

  const stepFallback = (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-medium text-gray-500 shadow-sm'>
        Loading interview workspace...
      </div>
    </div>
  )

  useEffect(() => {
    if (appBooting) {
      return undefined;
    }

    if (!resumeInterviewId) {
      setIsRecovering(false);
      return undefined;
    }

    let isDisposed = false;

    const recoverInterview = async () => {
      setIsRecovering(true);
      setRecoveryError("");

      try {
        const result = await axios.get(`${ServerUrl}/api/interview/session/${resumeInterviewId}?resume=1`, {
          withCredentials: true,
        });

        if (isDisposed) {
          return;
        }

        const data = result.data;
        const status = data?.status;

        if (isCompletedStatus(status)) {
          clearInterviewClientState();
          navigate(`/report/${resumeInterviewId}`, { replace: true });
          return;
        }

        if (!isActiveStatus(status)) {
          clearInterviewClientState();
          const statusToast = status === "abandoned"
            ? "This session was abandoned. Resume or delete it from History."
            : status === "completed"
              ? "This interview is already completed."
              : "This interview is not active. Resume or delete it from History.";
          navigate("/history", {
            replace: true,
            state: { toast: statusToast },
          });
          return;
        }

        if (!Array.isArray(data?.questions) || data.questions.length === 0) {
          clearInterviewClientState();
          navigate("/history", {
            replace: true,
            state: {
              toast: "Session data is unavailable. Resume from History.",
            },
          });
          return;
        }

        const idToStore = data?.interviewId || data?._id;
        if (idToStore) {
          setActiveInterviewClientId(idToStore);
        }

        setInterviewData(data);
        setStep(2);
      } catch (error) {
        if (isDisposed) {
          return;
        }

        // If it's a 404, it means the session was deleted (like after Start Fresh).
        if (error?.response?.status === 404) {
          clearInterviewClientState();
          navigate(location.pathname, { replace: true, state: {} });
          return;
        }

        setRecoveryError(
          error?.response?.data?.message
          || error?.message
          || "Failed to resume interview session."
        );
      } finally {
        if (!isDisposed) {
          setIsRecovering(false);
        }
      }
    };

    recoverInterview();

    return () => {
      isDisposed = true;
    };
  }, [appBooting, location.pathname, navigate, resumeInterviewId]);

  const handleStart = (data) => {
    const normalizedData = {
      ...data,
      status: data?.status || "in_progress",
    };
    const idToStore = normalizedData?.interviewId || normalizedData?._id;
    if (idToStore) {
      setActiveInterviewClientId(idToStore);
    }
    setInterviewData(normalizedData);
    setRecoveryError("");
    setStep(2);
  };

  if (appBooting || isRecovering) {
    return stepFallback;
  }

  return (
    <Suspense fallback={stepFallback}>
      <div className='min-h-screen bg-gray-50'>
        {recoveryError && step === 1 && (
          <div className='mx-auto max-w-5xl px-4 pt-6'>
            <div className='rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm'>
              <p className='font-semibold'>Interview recovery</p>
              <p className='mt-1'>{recoveryError}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <Step1SetUp onStart={handleStart} />
        )}

        {step === 2 && (!interviewData?.questions || interviewData.questions.length === 0 || !isActiveStatus(interviewData?.status)) && (
          <div className='mx-auto max-w-2xl px-4 pt-20 text-center'>
            <div className='glass-card p-8'>
              <h2 className='text-xl font-bold text-slate-100'>Session Interrupted</h2>
              <p className='mt-2 text-slate-400'>Your active interview data was lost upon refresh. Please resume safely from your history dashboard.</p>
              <button onClick={() => navigate('/history')} className='mt-6 px-6 py-2 bg-[#5100FF] hover:bg-[#5728F4] text-white rounded-xl font-medium transition'>
                View Interview History
              </button>
            </div>
          </div>
        )}

        {step === 2 && interviewData?.questions?.length > 0 && isActiveStatus(interviewData?.status) && (
          <Step2Interview interviewData={interviewData}
            onFinish={(report) => {
              clearInterviewClientState();
              setInterviewData(report);
              setStep(3)
            }}
          />
        )}

        {step === 3 && (
          <Step3Report report={interviewData} />
        )}


      </div>
    </Suspense>
  )
}

export default InterviewPage
