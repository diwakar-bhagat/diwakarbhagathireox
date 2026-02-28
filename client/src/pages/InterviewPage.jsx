import React, { Suspense, lazy, useEffect, useState } from 'react'
import axios from "axios";
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { ServerUrl } from '../App';

const Step1SetUp = lazy(() => import('../components/Step1SetUp'))
const Step2Interview = lazy(() => import('../components/Step2Interview'))
const Step3Report = lazy(() => import('../components/Step3Report'))

function InterviewPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const appBooting = useSelector((state) => state.ui.appBooting);
    const resumeInterviewId = typeof location.state?.resumeInterviewId === "string"
      ? location.state.resumeInterviewId.trim()
      : "";
    const [step,setStep] = useState(1)
    const [interviewData,setInterviewData] = useState(null)
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
          const result = await axios.get(`${ServerUrl}/api/interview/session/${resumeInterviewId}`, {
            withCredentials: true,
          });

          if (isDisposed) {
            return;
          }

          if (result.data?.status === "completed") {
            navigate(`/report/${resumeInterviewId}`, { replace: true });
            return;
          }

          setInterviewData(result.data);
          setStep(2);
        } catch (error) {
          if (isDisposed) {
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
    }, [appBooting, navigate, resumeInterviewId]);

    const handleStart = (data) => {
      setInterviewData(data);
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

          {step===1 && (
              <Step1SetUp onStart={handleStart}/>
          )}

           {step===2 && interviewData && (
              <Step2Interview interviewData={interviewData}
              onFinish={(report)=>{setInterviewData(report);
                  setStep(3)
              }}
              />
          )}

            {step===3 && (
              <Step3Report report={interviewData}/>
          )}

        
      </div>
    </Suspense>
  )
}

export default InterviewPage
