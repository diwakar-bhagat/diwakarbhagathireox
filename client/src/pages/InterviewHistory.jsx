import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios"
import { ServerUrl } from '../App'
import { FaArrowLeft } from 'react-icons/fa'
import { motion as Motion } from "motion/react"
import { useDispatch, useSelector } from 'react-redux'
import { setUserData } from '../redux/userSlice'
import Skeleton from '../components/loaders/Skeleton'
function InterviewHistory() {
    const dispatch = useDispatch()
    const userData = useSelector((state) => state.user.userData)
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")
    const [deletingId, setDeletingId] = useState("")
    const [deleteTarget, setDeleteTarget] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                setErrorMessage("")
                const result = await axios.get(ServerUrl + "/api/interview/get-interview", { withCredentials: true })

                setInterviews(result.data)

            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }

        }

        getMyInterviews()

    }, [])

    const handleDeleteRequest = (event, item) => {
        event.stopPropagation()

        if (!item?._id || deletingId) {
            return
        }

        if (item.reportGenerationStatus === "pending") {
            setErrorMessage("Report generation is still in progress. Try deleting this session again in a moment.")
            return
        }

        setErrorMessage("")
        setDeleteTarget(item)
    }

    const handleResumeSession = (event, interviewId) => {
        event.stopPropagation()
        if (!interviewId) {
            return
        }

        navigate("/interview", {
            state: { resumeInterviewId: interviewId },
        })
    }

    const closeDeleteModal = () => {
        if (deletingId) {
            return
        }
        setDeleteTarget(null)
    }

    const handleConfirmDelete = async () => {
        const interviewId = deleteTarget?._id
        if (!interviewId || deletingId) {
            return
        }

        try {
            setDeletingId(interviewId)
            setErrorMessage("")
            const result = await axios.delete(`${ServerUrl}/api/interview/session/${interviewId}`, { withCredentials: true })
            setInterviews((prev) => prev.filter((item) => item._id !== interviewId))
            if (userData && Number.isFinite(Number(result?.data?.creditsLeft))) {
                dispatch(setUserData({
                    ...userData,
                    credits: Number(result.data.creditsLeft),
                }))
            }
            setDeleteTarget(null)
        } catch (error) {
            console.log(error)
            setErrorMessage(
                error?.response?.data?.message
                || error?.message
                || "Failed to delete interview session."
            )
        } finally {
            setDeletingId("")
        }
    }


    return (
        <div className='min-h-screen py-10 transition-colors duration-300 relative z-10' >
            <div className='w-[90vw] lg:w-[70vw] max-w-[90%] mx-auto'>

                <div className='mb-10 w-full flex items-start gap-4 flex-wrap'>
                    <button
                        onClick={() => navigate("/")}
                        className='mt-1 p-3 rounded-full glass-card hover:bg-white/10 transition'>
                        <FaArrowLeft className='text-slate-300' />
                    </button>

                    <div>
                        <h1 className='text-3xl font-bold flex-nowrap text-slate-100'>
                            Interview History
                        </h1>
                        <p className='text-slate-400 mt-2'>
                            Track your past interviews and performance reports
                        </p>

                    </div>
                </div>


                {errorMessage && (
                    <div className='mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                        {errorMessage}
                    </div>
                )}

                {loading ? (
                    <div className='grid gap-6'>
                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className='glass-card p-6 space-y-4'
                            >
                                <Skeleton width="34%" height={18} />
                                <Skeleton width="52%" />
                                <Skeleton width="24%" />
                                <div className='flex justify-between items-center pt-2'>
                                    <Skeleton width={90} height={24} rounded="rounded-full" />
                                    <Skeleton width={82} height={24} rounded="rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : interviews.length === 0 ?
                    <div className='glass-card p-10 text-center'>
                        <p className='text-slate-400'>
                            No interviews found. Start your first interview.
                        </p>

                    </div>

                    :

                    <div className='grid gap-6'>
                        {interviews.map((item, index) => {
                            const isCompleted = item.status === "completed";
                            const canDelete = item.status === "in_progress" || item.status === "abandoned" || item.status === "Incompleted";
                            const canViewReport = isCompleted;
                            const canResume = canDelete;
                            const deleteBlocked = item.reportGenerationStatus === "pending";
                            const isDeleting = deletingId === item._id;
                            return (
                                <Motion.div key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.35, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                                    onClick={() => {
                                        if (isCompleted) {
                                            navigate(`/report/${item._id}`);
                                            return;
                                        }

                                        navigate("/interview", {
                                            state: { resumeInterviewId: item._id },
                                        });
                                    }}
                                    className='glass-card p-6 hover:shadow-[0_0_30px_rgba(81,0,255,0.15)] transition-all duration-300 cursor-pointer'>
                                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-100">
                                                {item.role}
                                            </h3>

                                            <p className="text-slate-400 text-sm mt-1">
                                                {item.experience} • {item.mode}
                                            </p>

                                            <p className="text-xs text-slate-500 mt-2">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className='flex items-center gap-6'>

                                            {/* SCORE */}
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-[#A78BFA]">
                                                    {item.finalScore || 0}/10
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Overall Score
                                                </p>
                                            </div>

                                            <div className='flex items-center gap-3'>
                                                {canResume && (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => handleResumeSession(event, item._id)}
                                                        className="px-4 py-1 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition"
                                                    >
                                                        Resume
                                                    </button>
                                                )}

                                                {canViewReport && (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            navigate(`/report/${item._id}`)
                                                        }}
                                                        className="px-4 py-1 rounded-full text-xs font-medium border border-[#5100FF]/30 bg-[#5100FF]/10 text-[#A78BFA] hover:bg-[#5100FF]/20 transition"
                                                    >
                                                        View Report
                                                    </button>
                                                )}

                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => handleDeleteRequest(event, item)}
                                                        disabled={isDeleting || deleteBlocked}
                                                        className={`px-4 py-1 rounded-full text-xs font-medium border transition ${isDeleting || deleteBlocked
                                                            ? "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
                                                            : "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                                            }`}
                                                    >
                                                        {isDeleting ? "Deleting..." : deleteBlocked ? "Report Pending" : "Delete"}
                                                    </button>
                                                )}

                                                {/* STATUS BADGE */}
                                                <span
                                                    className={`px-4 py-1 rounded-full text-xs font-medium ${isCompleted
                                                        ? "bg-[#5100FF]/10 text-[#A78BFA] border border-[#5100FF]/30"
                                                        : "bg-yellow-500/10 text-yellow-300 border border-yellow-500/30"
                                                        }`}
                                                >
                                                    {isCompleted ? item.status : "resume available"}
                                                </span>
                                            </div>


                                        </div>
                                    </div>

                                </Motion.div>
                            );
                        })
                        }

                    </div >
                }
            </div >

            {deleteTarget && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4'>
                    <div className='w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl'>
                        <h2 className='text-lg font-semibold text-slate-100'>
                            Delete unfinished session?
                        </h2>
                        <p className='mt-3 text-sm leading-relaxed text-slate-400'>
                            Deleting this unfinished session will permanently remove it. This action will consume 50 credits.
                        </p>
                        <div className='mt-6 flex items-center justify-end gap-3'>
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={Boolean(deletingId)}
                                className='px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={Boolean(deletingId)}
                                className='px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                                {deletingId ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    )
}

export default InterviewHistory
