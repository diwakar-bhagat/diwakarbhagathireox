import React, { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence } from "motion/react";
import {
    FaUserTie,
    FaBriefcase,
    FaFileUpload,
    FaMicrophoneAlt,
    FaChartLine,
    FaCheckCircle,
    FaExclamationCircle,
    FaFileAlt
} from "react-icons/fa";
import { IoSparkles } from "react-icons/io5";
import axios from "axios";
import { ServerUrl } from '../App';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { setResumeParsing } from '../redux/uiSlice';
import { setResumeData, setJdData, clearWizardData } from '../redux/wizardSlice';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';

function Step1SetUp({ onStart }) {
    const { userData } = useSelector((state) => state.user);
    const { resumeAnalysis, jdAnalysis, gapAnalysis, interviewPlan } = useSelector((state) => state.wizard);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [role, setRole] = useState("");
    const [experience, setExperience] = useState("");
    const [mode, setMode] = useState("Technical");

    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState("");
    const [analyzingResume, setAnalyzingResume] = useState(false);

    const [useJd, setUseJd] = useState(false);
    const [jdText, setJdText] = useState("");
    const [jdFile, setJdFile] = useState(null);
    const [analyzingJd, setAnalyzingJd] = useState(false);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        return () => {
            dispatch(setResumeParsing(false));
            dispatch(clearWizardData());
        };
    }, [dispatch]);

    const handleUploadResume = async () => {
        if (!resumeFile || analyzingResume) return;
        if (!userData && !auth.currentUser) {
            navigate("/auth", { state: { from: "/interview" } });
            return;
        }

        setAnalyzingResume(true);
        dispatch(setResumeParsing(true));

        const formdata = new FormData();
        formdata.append("resume", resumeFile);

        try {
            const result = await axios.post(ServerUrl + "/api/interview/resume", formdata, { withCredentials: true });
            dispatch(setResumeData(result.data));
            setRole(result.data.role !== "unknown" ? result.data.role : "");
            setExperience(result.data.experience !== "unknown" ? result.data.experience : "");
            setResumeText(result.data.resumeText || "");
        } catch (error) {
            console.log("Failed to analyze resume", error);
        } finally {
            setAnalyzingResume(false);
            dispatch(setResumeParsing(false));
        }
    };

    const handleAnalyzeJd = async () => {
        if ((!jdText && !jdFile) || analyzingJd) return;

        setAnalyzingJd(true);
        const formdata = new FormData();
        if (jdFile) formdata.append("jdFile", jdFile);
        if (jdText) formdata.append("jdText", jdText);

        // Pass current resume context
        if (role) formdata.append("role", role);
        if (experience) formdata.append("experience", experience);
        if (resumeText) formdata.append("resumeText", resumeText);

        if (resumeAnalysis?.projects) {
            resumeAnalysis.projects.forEach(p => formdata.append("projects[]", p));
        }
        if (resumeAnalysis?.skills) {
            resumeAnalysis.skills.forEach(s => formdata.append("skills[]", s));
        }
        if (resumeAnalysis?.resumeAnalysis) {
            formdata.append("resumeAnalysis", JSON.stringify(resumeAnalysis.resumeAnalysis));
        }

        try {
            const result = await axios.post(ServerUrl + "/api/interview/analyze-jd", formdata, { withCredentials: true });
            dispatch(setJdData(result.data));
        } catch (error) {
            console.log("Failed to analyze JD", error);
        } finally {
            setAnalyzingJd(false);
        }
    };

    const handleStart = async () => {
        if (!userData && !auth.currentUser) {
            navigate("/auth", { state: { from: "/interview" } });
            return;
        }
        if (!role || !resumeAnalysis) return;

        setLoading(true);
        try {
            const payload = {
                role,
                experience,
                mode,
                resumeText: resumeAnalysis.resumeText || resumeText,
                projects: resumeAnalysis.projects || [],
                skills: resumeAnalysis.skills || [],
                resumeAnalysis: resumeAnalysis.resumeAnalysis || {},
                jdAnalysis: jdAnalysis || null,
                gapAnalysis: gapAnalysis || null,
                interviewPlan: interviewPlan || null,
            };

            const result = await axios.post(ServerUrl + "/api/interview/generate-questions", payload, { withCredentials: true });

            if (userData) {
                dispatch(setUserData({ ...userData, credits: result.data.creditsLeft }));
            }
            setLoading(false);
            onStart(result.data);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const getCandidateSignals = () => {
        if (!resumeAnalysis) return [];
        const signals = [];
        const projLen = resumeAnalysis.projects?.length || 0;
        const skillsLen = resumeAnalysis.skills?.length || 0;
        const text = (resumeAnalysis.resumeText || "").toLowerCase();

        if (projLen >= 3 || text.includes("led") || text.includes("managed")) {
            signals.push({ name: "Ownership", confidence: "High" });
        }
        if (skillsLen >= 8 || text.includes("learned") || text.includes("self-taught")) {
            signals.push({ name: "Learning Velocity", confidence: "Strong" });
        }
        if (text.includes("achieved") || text.includes("increased") || text.includes("reduced")) {
            signals.push({ name: "Impact Driven", confidence: "Confirmed" });
        }
        if (signals.length === 0) signals.push({ name: "Baseline Grit", confidence: "Moderate" });
        return signals.slice(0, 3);
    };

    return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 px-4 py-8 transition-colors duration-300'>
            <div className='w-full max-w-6xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl grid md:grid-cols-[1.1fr_1fr] overflow-hidden border border-gray-100 dark:border-slate-800 min-h-[85vh]'>

                {/* LEFT COLUMN: INTRO OR PHASE B (PLAN PREVIEW) */}
                <div className='relative bg-gradient-to-br from-emerald-50 to-green-100 dark:from-slate-800/80 dark:to-slate-900 p-8 lg:p-12 flex flex-col border-r border-gray-100 dark:border-slate-800 overflow-y-auto'>

                    <AnimatePresence mode="wait">
                        {!resumeAnalysis ? (
                            <Motion.div
                                key="intro"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="my-auto"
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm font-semibold mb-6">
                                    <IoSparkles /> Stage-1: Planning
                                </div>
                                <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-6 leading-tight">
                                    Design Your <br /> AI Interview
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-10 text-lg">
                                    Upload your resume to let our agentic AI build a tailored interview strategy. Add a Job Description to target specific industry gaps.
                                </p>

                                <div className='space-y-4'>
                                    {[
                                        { icon: <FaFileUpload />, text: "Upload your resume" },
                                        { icon: <FaBriefcase />, text: "Provide a Job Description (Optional)" },
                                        { icon: <IoSparkles />, text: "AI generates personalized evaluation strategy" },
                                    ].map((item, index) => (
                                        <div key={index} className='flex items-center space-x-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 rounded-xl border border-white/40 dark:border-slate-700/50 text-gray-700 dark:text-gray-200'>
                                            <div className="text-emerald-600 dark:text-emerald-400 text-xl">{item.icon}</div>
                                            <span className='font-medium'>{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </Motion.div>
                        ) : (
                            <Motion.div
                                key="preview"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                        Interview Plan
                                    </h2>
                                    <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-sm">
                                        {useJd && gapAnalysis ? "JD Aligned" : "Resume Based"}
                                    </span>
                                </div>

                                {/* Match Score Card */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center border-[4px] border-emerald-50 dark:border-emerald-900">
                                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {gapAnalysis ? `${gapAnalysis.matchPercentage}%` : "100%"}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                                                {gapAnalysis ? "JD Match Score" : "Role Alignment"}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                                                {gapAnalysis
                                                    ? "Based on parsed required and preferred skills."
                                                    : "Resume-based role alignment generated successfully."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transparency Panel */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50 flex items-start gap-3">
                                    <FaExclamationCircle className="text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        {useJd && jdAnalysis
                                            ? "Questions will prioritize gaps between your resume and this JD to optimize preparation."
                                            : `Using ${role || "industry standard"} blueprint + your resume.`}
                                    </p>
                                </div>

                                {/* Interview Structure Panel */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Round Structure</h4>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(interviewPlan?.round_structure || ["Behavioral", "Technical", "Applied", "System Design"]).map((round, idx) => (
                                            <span key={idx} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 shadow-sm border border-gray-300 dark:border-slate-600">
                                                {idx + 1}. {round.replace(/_/g, " ")}
                                            </span>
                                        ))}
                                        {/* Starting Difficulty Chip */}
                                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 ml-auto">
                                            Start Level: {interviewPlan?.start_difficulty || 2}/5
                                        </span>
                                    </div>
                                </div>

                                {/* Strengths & Gaps */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-1.5"><FaCheckCircle className="text-emerald-500" /> Strengths</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(gapAnalysis?.strongMatches || resumeAnalysis.skills?.slice(0, 5) || []).map((s, i) => (
                                                <span key={i} className="text-[10px] sm:text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50">{s}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-1.5"><FaChartLine className="text-orange-500" /> Focus Areas</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(gapAnalysis?.focusAreas || gapAnalysis?.missingRequiredSkills || interviewPlan?.interview_focus_areas || []).slice(0, 5).map((f, i) => (
                                                <span key={i} className="text-[10px] sm:text-xs font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-800/50 capitalize">{f.replace(/_/g, " ")}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Candidate Signal Extractor */}
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Candidate Signals</h4>
                                    <div className="flex gap-3">
                                        {getCandidateSignals().map((sig, i) => (
                                            <div key={i} className="flex-1 bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-100 dark:border-slate-700 text-center">
                                                <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{sig.name}</div>
                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{sig.confidence}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* ATS Improvement */}
                                {gapAnalysis && gapAnalysis.atsSignals?.suggestions?.length > 0 && (
                                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-purple-800 dark:text-purple-300 uppercase mb-2">ATS Optimization Tips</h4>
                                        <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 ml-4 list-disc">
                                            {gapAnalysis.atsSignals.suggestions.slice(0, 3).map((tip, i) => <li key={i}>{tip}</li>)}
                                        </ul>
                                    </div>
                                )}

                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* RIGHT COLUMN: PHASE A (INPUTS) */}
                <div className="p-8 lg:p-12 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">

                    <div className="mb-8 flex justify-between items-end">
                        <h2 className='text-3xl font-bold text-gray-800 dark:text-white'>Interview SetUp</h2>
                        {resumeAnalysis && <span className="text-sm font-medium text-emerald-600 flex items-center gap-1"><FaCheckCircle /> Resume Linked</span>}
                    </div>

                    <div className='space-y-6'>
                        {/* Resume Upload Block */}
                        {!resumeAnalysis ? (
                            <div className="border border-gray-200 dark:border-slate-700 rounded-2xl p-5 bg-gray-50 dark:bg-slate-800/30">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Step 1: Resume Upload</label>
                                <div
                                    onClick={() => document.getElementById("resumeUpload").click()}
                                    className='border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition'>
                                    <FaFileUpload className='text-3xl mx-auto text-emerald-600 dark:text-emerald-500 mb-2' />
                                    <input type="file" accept="application/pdf" id="resumeUpload" className='hidden' onChange={(e) => setResumeFile(e.target.files[0])} />
                                    <p className='text-gray-600 dark:text-gray-400 font-medium text-sm'>
                                        {resumeFile ? resumeFile.name : "Click to select PDF resume"}
                                    </p>
                                </div>
                                {resumeFile && (
                                    <button
                                        disabled={analyzingResume}
                                        onClick={(e) => { e.stopPropagation(); handleUploadResume(); }}
                                        className='w-full mt-4 bg-gray-900 dark:bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-gray-800 dark:hover:bg-emerald-500 transition font-medium text-sm disabled:opacity-70'>
                                        {analyzingResume ? "Analyzing Resume..." : "Extract Profile"}
                                    </button>
                                )}
                            </div>
                        ) : null}

                        {/* Basic Info (Auto-filled but editable) */}
                        <div className={`space-y-4 ${!resumeAnalysis ? "opacity-50 pointer-events-none" : ""}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className='relative'>
                                    <FaUserTie className='absolute top-3.5 left-4 text-gray-400' />
                                    <input type='text' placeholder='Role'
                                        className='w-full pl-11 pr-3 py-3 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 dark:text-white text-sm'
                                        onChange={(e) => setRole(e.target.value)} value={role} disabled={!resumeAnalysis} />
                                </div>
                                <div className='relative'>
                                    <FaBriefcase className='absolute top-3.5 left-4 text-gray-400' />
                                    <input type='text' placeholder='Experience'
                                        className='w-full pl-11 pr-3 py-3 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 dark:text-white text-sm'
                                        onChange={(e) => setExperience(e.target.value)} value={experience} disabled={!resumeAnalysis} />
                                </div>
                            </div>

                            <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={!resumeAnalysis}
                                className='w-full py-3 px-4 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-800 dark:text-white text-sm'>
                                <option value="Technical">Technical Interview</option>
                                <option value="HR">Behavioral / HR Interview</option>
                            </select>
                        </div>

                        {/* JD Toggle Block */}
                        <div className={`border border-gray-200 dark:border-slate-700 rounded-2xl p-5 ${!resumeAnalysis ? "opacity-50 pointer-events-none" : "bg-white dark:bg-slate-800/50"}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1 pr-4">
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Tailor with Job Description</label>
                                    <p className="text-xs text-gray-500 mt-0.5">Align interview strictly to a JD.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input type="checkbox" className="sr-only peer" checked={useJd} onChange={() => setUseJd(!useJd)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            <AnimatePresence>
                                {useJd && (
                                    <Motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 mt-2 space-y-3">
                                            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">For best accuracy, paste text or upload JD PDF</p>

                                            <textarea
                                                placeholder="Paste Job Description here..."
                                                rows="3"
                                                className="w-full p-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                                value={jdText}
                                                onChange={(e) => setJdText(e.target.value)}
                                            />

                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <input type="file" id="jdUpload" className="hidden" accept="application/pdf" onChange={(e) => setJdFile(e.target.files[0])} />
                                                    <button onClick={() => document.getElementById("jdUpload").click()} className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-sm text-gray-700 dark:text-gray-300 truncate px-2">
                                                        <FaFileAlt /> <span className="truncate">{jdFile ? jdFile.name : "Upload PDF"}</span>
                                                    </button>
                                                </div>
                                                <button
                                                    disabled={(!jdText && !jdFile) || analyzingJd}
                                                    onClick={handleAnalyzeJd}
                                                    className="flex-1 bg-gray-900 dark:bg-slate-700 text-white py-2 rounded-lg hover:bg-gray-800 transition text-sm font-medium disabled:opacity-50">
                                                    {analyzingJd ? "Analyzing..." : "Analyze JD"}
                                                </button>
                                            </div>

                                        </div>
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleStart}
                            disabled={!role || !resumeAnalysis || loading}
                            className='w-full mt-auto disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-800 dark:disabled:text-gray-600 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-lg font-semibold transition duration-300 shadow-lg shadow-emerald-500/20 active:scale-[0.98]'>
                            {loading ? "Starting Workspace..." : (useJd && jdAnalysis ? "Start JD-Aligned Interview" : "Start Resume-Based Interview")}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Step1SetUp;
