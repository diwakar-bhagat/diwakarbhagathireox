import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App';
import Step3Report from '../components/Step3Report';
import Skeleton from '../components/loaders/Skeleton';
import ChartBarsSkeleton from '../components/loaders/ChartBarsSkeleton';
function InterviewReport() {
  const {id} = useParams()
  const [report,setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
   
  useEffect(()=>{
    const fetchReport = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const result = await axios.get(ServerUrl + "/api/interview/report/" + id , {withCredentials:true})
        setReport(result.data)
      } catch (error) {
        console.log(error)
        setErrorMessage(error?.response?.data?.message || error?.message || "Failed to load report.");
      } finally {
        setLoading(false);
      }
    }

    fetchReport()
  },[id])


    if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="space-y-3">
            <Skeleton width="36%" height={24} rounded="rounded-xl" />
            <Skeleton width="52%" />
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>
            <div className='space-y-6'>
              <div className='bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 space-y-4'>
                <Skeleton variant='card' height={120} rounded="rounded-xl" />
                <Skeleton width="70%" />
                <Skeleton width="55%" />
              </div>
              <div className='bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-gray-200 dark:border-slate-800 space-y-3'>
                <Skeleton width="40%" />
                <Skeleton width="100%" />
                <Skeleton width="90%" />
                <Skeleton width="96%" />
              </div>
            </div>

            <div className='lg:col-span-2 space-y-6'>
              <div className='bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-8 border border-gray-200 dark:border-slate-800'>
                <Skeleton width="32%" className="mb-4" />
                <div className='h-64 sm:h-72 w-full'>
                  <ChartBarsSkeleton />
                </div>
              </div>
              <div className='bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-8 border border-gray-200 dark:border-slate-800 space-y-4'>
                {[0, 1, 2].map((item) => (
                  <div key={item} className='rounded-xl p-4 border border-gray-200 dark:border-slate-700 space-y-3'>
                    <Skeleton width="65%" />
                    <Skeleton width="100%" />
                    <Skeleton width="94%" />
                    <Skeleton width="84%" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-3xl mx-auto rounded-2xl border border-red-200 bg-white px-6 py-8 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
          <p className="text-lg font-semibold text-red-700 dark:text-red-300">Report could not be loaded</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return <Step3Report report={report}/>
}

export default InterviewReport
