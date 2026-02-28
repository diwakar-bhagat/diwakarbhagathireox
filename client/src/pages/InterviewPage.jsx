import React, { Suspense, lazy, useState } from 'react'

const Step1SetUp = lazy(() => import('../components/Step1SetUp'))
const Step2Interview = lazy(() => import('../components/Step2Interview'))
const Step3Report = lazy(() => import('../components/Step3Report'))

function InterviewPage() {
    const [step,setStep] = useState(1)
    const [interviewData,setInterviewData] = useState(null)

    const stepFallback = (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
        <div className='rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-medium text-gray-500 shadow-sm'>
          Loading interview workspace...
        </div>
      </div>
    )

  return (
    <Suspense fallback={stepFallback}>
      <div className='min-h-screen bg-gray-50'>
          {step===1 && (
              <Step1SetUp onStart={(data)=>{
                  setInterviewData(data);
              setStep(2)}}/>
          )}

           {step===2 && (
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
