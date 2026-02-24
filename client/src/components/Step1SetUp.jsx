import React from 'react'
import { motion as Motion } from "motion/react"
import {
    FaUserTie,
    FaBriefcase,
    FaFileUpload,
    FaMicrophoneAlt,
    FaChartLine,
} from "react-icons/fa";
import { useEffect, useState } from 'react';
import axios from "axios"
import { ServerUrl } from '../App';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { setResumeParsing } from '../redux/uiSlice';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
function Step1SetUp({ onStart }) {
    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()
    const navigate = useNavigate();
    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [mode, setMode] = useState("Technical");
    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [skills, setSkills] = useState([]);
    const [resumeText, setResumeText] = useState("");
    const [analysisDone, setAnalysisDone] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        return () => {
            dispatch(setResumeParsing(false))
        }
    }, [dispatch])


    const handleUploadResume = async () => {
        if (!resumeFile || analyzing) return;
        if (!userData && !auth.currentUser) {
            navigate("/auth");
            return;
        }
        setAnalyzing(true)
        dispatch(setResumeParsing(true))

        const formdata = new FormData()
        formdata.append("resume", resumeFile)

        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formdata, { withCredentials: true })

            console.log(result.data)

            setRole(result.data.role || "");
            setExperience(result.data.experience || "");
            setProjects(result.data.projects || []);
            setSkills(result.data.skills || []);
            setResumeText(result.data.resumeText || "");
            setAnalysisDone(true);

        } catch (error) {
            console.log(error)
        } finally {
            setAnalyzing(false);
            dispatch(setResumeParsing(false))
        }
    }

    const handleStart = async () => {
        if (!userData && !auth.currentUser) {
            navigate("/auth");
            return;
        }
        setLoading(true)
        try {
            const result = await axios.post(ServerUrl + "/api/interview/generate-questions", { role, experience, mode, resumeText, projects, skills }, { withCredentials: true })
            console.log(result.data)
            if (userData) {
                dispatch(setUserData({ ...userData, credits: result.data.creditsLeft }))
            }
            setLoading(false)
            onStart(result.data)

        } catch (error) {
            console.log(error)
            setLoading(false)
        }
    }
    return (
        <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-950 dark:to-slate-900 px-4 transition-colors duration-300'>

            <div className='w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl grid md:grid-cols-2 overflow-hidden border border-gray-100 dark:border-slate-800'>

                <Motion.div
                    initial={{ x: -80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className='relative bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800/50 dark:to-slate-900/50 p-12 flex flex-col justify-center'>

                    <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-6">
                        Start Your AI Interview
                    </h2>

                    <p className="text-gray-600 dark:text-gray-400 mb-10">
                        Practice real interview scenarios powered by AI.
                        Improve communication, technical skills, and confidence.
                    </p>

                    <div className='space-y-5'>

                        {
                            [
                                {
                                    icon: <FaUserTie className="text-green-600 dark:text-green-400 text-xl" />,
                                    text: "Choose Role & Experience",
                                },
                                {
                                    icon: <FaMicrophoneAlt className="text-green-600 dark:text-green-400 text-xl" />,
                                    text: "Smart Voice Interview",
                                },
                                {
                                    icon: <FaChartLine className="text-green-600 dark:text-green-400 text-xl" />,
                                    text: "Performance Analytics",
                                },
                            ].map((item, index) => (
                                <Motion.div key={index}
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 + index * 0.15 }}
                                    whileHover={{ scale: 1.03 }}
                                    className='flex items-center space-x-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-transparent dark:border-slate-700 transition-colors cursor-pointer'>
                                    {item.icon}
                                    <span className='text-gray-700 dark:text-gray-200 font-medium'>{item.text}</span>

                                </Motion.div>
                            ))
                        }
                    </div>



                </Motion.div>



                <Motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="p-12 bg-white dark:bg-slate-900 transition-colors">

                    <h2 className='text-3xl font-bold text-gray-800 dark:text-white mb-8'>
                        Interview SetUp
                    </h2>


                    <div className='space-y-6'>

                        <div className='relative'>
                            <FaUserTie className='absolute top-4 left-4 text-gray-400 dark:text-gray-500' />

                            <input type='text' placeholder='Enter role'
                                className='w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 outline-none transition text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500'
                                onChange={(e) => setRole(e.target.value)} value={role} />
                        </div>


                        <div className='relative'>
                            <FaBriefcase className='absolute top-4 left-4 text-gray-400 dark:text-gray-500' />

                            <input type='text' placeholder='Experience (e.g. 2 years)'
                                className='w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 outline-none transition text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500'
                                onChange={(e) => setExperience(e.target.value)} value={experience} />



                        </div>

                        <select value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className='w-full py-3 px-4 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600 outline-none transition text-gray-800 dark:text-white'>

                            <option value="Technical">Technical Interview</option>
                            <option value="HR">HR Interview</option>

                        </select>

                        {!analysisDone && (
                            <Motion.div
                                whileHover={{ scale: 1.02 }}
                                onClick={() => document.getElementById("resumeUpload").click()}
                                className='border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-green-500 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition'>

                                <FaFileUpload className='text-4xl mx-auto text-green-600 dark:text-green-500 mb-3' />

                                <input type="file"
                                    accept="application/pdf"
                                    id="resumeUpload"
                                    className='hidden'
                                    onChange={(e) => setResumeFile(e.target.files[0])} />

                                <p className='text-gray-600 dark:text-gray-400 font-medium'>
                                    {resumeFile ? resumeFile.name : "Click to upload resume (Optional)"}
                                </p>

                                {resumeFile && (
                                    <Motion.button
                                        whileHover={{ scale: 1.02 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleUploadResume()
                                        }}

                                        className='mt-4 bg-gray-900 dark:bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition'>
                                        {analyzing ? "Analyzing..." : "Analyze Resume"}



                                    </Motion.button>)}

                            </Motion.div>


                        )}

                        {analysisDone && (
                            <Motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className='bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl p-5 space-y-4'>
                                <h3 className='text-lg font-semibold text-gray-800 dark:text-white'>
                                    Resume Analysis Result</h3>

                                {projects.length > 0 && (
                                    <div>
                                        <p className='font-medium text-gray-700 dark:text-gray-300 mb-1'>
                                            Projects:</p>

                                        <ul className='list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1'>
                                            {projects.map((p, i) => (
                                                <li key={i}>{p}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {skills.length > 0 && (
                                    <div>
                                        <p className='font-medium text-gray-700 dark:text-gray-300 mb-1'>
                                            Skills:</p>

                                        <div className='flex flex-wrap gap-2'>
                                            {skills.map((s, i) => (
                                                <span key={i} className='bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm'>{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </Motion.div>
                        )}


                        <Motion.button
                            onClick={handleStart}
                            disabled={!role || !experience || loading}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.95 }}
                            className='w-full disabled:bg-gray-400 dark:disabled:bg-slate-800 bg-green-600 hover:bg-green-700 text-white py-3 rounded-full text-lg font-semibold transition duration-300 shadow-md'>
                            {loading ? "Staring..." : "Start Interview"}


                        </Motion.button>
                    </div>

                </Motion.div>
            </div>

        </Motion.div>
    )
}

export default Step1SetUp
