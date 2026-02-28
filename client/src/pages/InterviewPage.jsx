import React, { Suspense, lazy, useEffect, useState } from 'react'
import axios from "axios";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ServerUrl } from '../App';
import {
  clearInterviewSessionMeta,
  getStoredInterviewSessionMeta,
  storeInterviewSessionMeta,
} from '../utils/interviewSessionStorage';

const Step1SetUp = lazy(() => import('../components/Step1SetUp'))
const Step2Interview = lazy(() => import('../components/Step2Interview'))
const Step3Report = lazy(() => import('../components/Step3Report'))

function InterviewPage() {
    const navigate = useNavigate();
    const appBooting = useSelector((state) => state.ui.appBooting);
    const [step,setStep] = useState(1)
    const [interviewData,setInterviewData] = useState(null)
    const [isRecovering, setIsRecovering] = useState(true);
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

      let isDisposed = false;

      const recoverInterview = async () => {
        const { interviewId, currentIndex } = getStoredInterviewSessionMeta();
        if (!interviewId) {
          if (!isDisposed) {
            setIsRecovering(false);
          }
          return;
        }

        try {
          const result = await axios.get(`${ServerUrl}/api/interview/session/${interviewId}`, {
            withCredentials: true,
          });

          if (isDisposed) {
            return;
          }

          if (result.data?.status === "completed") {
            clearInterviewSessionMeta();
            navigate(`/report/${interviewId}`, { replace: true });
            return;
          }

          setInterviewData({
            ...result.data,
            currentIndex,
          });
          setStep(2);
          setRecoveryError("");
        } catch (error) {
          if (isDisposed) {
            return;
          }

          const status = error?.response?.status;
          if (status === 404) {
            clearInterviewSessionMeta();
            setRecoveryError("Your last interview session is no longer available. You can start a new interview.");
          } else if (status === 401 || status === 403) {
            setRecoveryError("Sign in again to resume your interview session.");
          } else {
            setRecoveryError(error?.response?.data?.message || error?.message || "Failed to recover your last interview.");
          }
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
    }, [appBooting, navigate]);

    const handleStart = (data) => {
      if (data?.interviewId) {
        storeInterviewSessionMeta({
          interviewId: data.interviewId,
          currentIndex: 0,
        });
      }
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
