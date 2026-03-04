import React, { Suspense, lazy } from 'react'
import Navbar from '../components/Navbar'
import { useSelector } from 'react-redux'
import { motion as Motion } from "motion/react";
import {
  BsRobot,
  BsMic,
  BsClock,
  BsBarChart,
  BsFileEarmarkText
} from "react-icons/bs";
import { HiSparkles } from "react-icons/hi";
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import hrImg from "../assets/HR.png";
import techImg from "../assets/tech.png";
import confidenceImg from "../assets/confi.png";
import creditImg from "../assets/credit.png";
import evalImg from "../assets/ai-ans.png";
import resumeImg from "../assets/resume.png";
import pdfImg from "../assets/pdf.png";
import analyticsImg from "../assets/history.png";
import bgMain from "../assets/bgmain.svg";
import Footer from '../components/Footer';

const AuthModel = lazy(() => import('../components/AuthModel'));

const MorphingText = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStage(1);
    }, 2800); // Wait 2.8s before morphing
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="relative inline-grid place-items-center ml-0 mt-3 md:mt-0 md:ml-4 overflow-hidden align-middle rounded-2xl sm:rounded-[2rem] bg-[#6D5BFF]/10 dark:bg-[#6D5BFF]/15 backdrop-blur-2xl border border-[#6D5BFF]/30 shadow-[0_8px_30px_rgba(109,91,255,0.15)] px-6 py-2 sm:px-8 sm:py-3 text-[#A78BFA]">
      {/* Stage 0: AI Intelligence */}
      <Motion.span
        initial={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        animate={{
          opacity: stage === 0 ? 1 : 0,
          filter: stage === 0 ? "blur(0px)" : "blur(12px)",
          y: stage === 0 ? 0 : -35
        }}
        transition={{ duration: 0.6, ease: "easeIn" }}
        className="col-start-1 row-start-1 flex items-center justify-center text-[#8B5CF6] font-semibold"
      >
        AI Intelligence
      </Motion.span>

      {/* Stage 1: HireOX.AI */}
      <Motion.span
        initial={{ opacity: 0, filter: "blur(12px)", y: 35 }}
        animate={{
          opacity: stage === 1 ? 1 : 0,
          filter: stage === 1 ? "blur(0px)" : "blur(12px)",
          y: stage === 1 ? 0 : 35
        }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="col-start-1 row-start-1 flex items-center justify-center text-white neon-text-purple font-bold tracking-wide"
        style={{ perspective: 1000 }}
      >
        HireO
        <Motion.span
          initial={{ rotateY: 0, scale: 1 }}
          animate={stage === 1 ? { rotateY: 360, scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 1.2, delay: 0.6, type: "spring", bounce: 0.5 }}
          className="inline-block text-[#6D5BFF] mx-[2px] font-extrabold"
          style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
        >
          X
        </Motion.span>
        .AI
      </Motion.span>
    </span>
  );
};

function Home() {
  const { userData } = useSelector((state) => state.user)
  const [showAuth, setShowAuth] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const modesData = [
    {
      img: hrImg,
      title: "HR Interview Mode",
      desc: "Behavioral and communication based evaluation."
    },
    {
      img: techImg,
      title: "Technical Mode",
      desc: "Deep technical questioning based on selected role."
    },
    {
      img: confidenceImg,
      title: "Confidence Detection",
      desc: "Basic tone and voice analysis insights."
    },
    {
      img: creditImg,
      title: "Credits System",
      desc: "Unlock premium interview sessions easily."
    }
  ];

  return (
    <div className='min-h-screen flex flex-col relative text-slate-100 overflow-x-hidden' style={{ backgroundColor: '#101010' }}>
      {/* Premium SVG Background — fixed to viewport, z-0 sits above body bg but below content */}
      <img
        src={bgMain}
        alt=""
        className="fixed inset-0 w-full h-auto min-h-full object-cover object-top z-0 pointer-events-none select-none"
        aria-hidden="true"
        draggable="false"
      />
      <Navbar />

      <div className='flex-1 px-6 py-20 relative z-10'>
        <div className='max-w-6xl mx-auto'>

          <div className='flex justify-center mb-6 relative z-10'>
            <div className='glass-card text-[#A78BFA] text-sm px-4 py-2 rounded-full flex items-center gap-2'>
              <HiSparkles size={16} className="text-[#6D5BFF]" />
              AI Powered Smart Interview Platform
            </div>


          </div>
          <div className='text-center mb-28'>
            <Motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className='text-4xl md:text-6xl font-semibold leading-tight max-w-4xl mx-auto'>
              <span className='block md:inline'>Practice Interviews with</span>
              <MorphingText />



            </Motion.h1>

            <Motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className='text-slate-400 mt-6 max-w-2xl mx-auto text-lg'>
              Role-based mock interviews with smart follow-ups,
              adaptive difficulty and real-time performance evaluation.

            </Motion.p>

            <div className='flex flex-wrap justify-center gap-4 mt-10'>
              <Motion.button
                onClick={() => {
                  if (!userData) {
                    setShowAuth(true)
                    return;
                  }
                  navigate("/interview")
                }}
                whileHover={{ opacity: 0.9, scale: 1.03 }}
                whileTap={{ opacity: 1, scale: 0.98 }}
                className='bg-black text-white px-10 py-3 rounded-full hover:opacity-90 transition shadow-md'>
                Start Interview

              </Motion.button>

              <Motion.button
                onClick={() => {
                  if (!userData) {
                    setShowAuth(true)
                    return;
                  }
                  navigate("/history")
                }}
                whileHover={{ opacity: 0.9, scale: 1.03 }}
                whileTap={{ opacity: 1, scale: 0.98 }}
                className='glass-card font-medium text-slate-300 px-10 py-3 rounded-full hover:text-white transition'>
                View History

              </Motion.button>
            </div>
          </div>

          <div className='flex flex-col md:flex-row justify-center items-center gap-10 mb-28'>
            {
              [
                {
                  icon: <BsRobot size={24} />,
                  step: "STEP 1",
                  title: "Role & Experience Selection",
                  desc: "AI adjusts difficulty based on selected job role."
                },
                {
                  icon: <BsMic size={24} />,
                  step: "STEP 2",
                  title: "Smart Voice Interview",
                  desc: "Dynamic follow-up questions based on your answers."
                },
                {
                  icon: <BsClock size={24} />,
                  step: "STEP 3",
                  title: "Timer Based Simulation",
                  desc: "Real interview pressure with time tracking."
                }
              ].map((item, index) => (
                <Motion.div key={index}
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 + index * 0.2 }}
                  whileHover={{ rotate: 0, scale: 1.06 }}

                  className={`
        relative glass-card p-10 w-80 max-w-[90%] 
        ${index === 0 ? "rotate-[-4deg]" : ""}
        ${index === 1 ? "rotate-[3deg] md:-mt-6" : ""}
        ${index === 2 ? "rotate-[-3deg]" : ""}
      `}>

                  <div className='absolute -top-8 left-1/2 -translate-x-1/2 glass-card text-[#6D5BFF] w-16 h-16 rounded-2xl flex items-center justify-center'>
                    {item.icon}</div>
                  <div className='pt-10 text-center'>
                    <div className='text-xs text-[#A78BFA] font-semibold mb-2 tracking-wider'>{item.step}</div>
                    <h3 className='font-semibold mb-3 text-lg text-slate-100'>{item.title}</h3>
                    <p className='text-sm text-slate-400 leading-relaxed'>{item.desc}</p>
                  </div>


                </Motion.div>
              ))
            }
          </div>


          <div className='mb-32'>
            <Motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className='text-4xl font-semibold text-center mb-16'>
              Advanced AI{" "}
              <span className="text-[#6D5BFF] neon-text-purple">Capabilities</span>

            </Motion.h2>

            <div className='grid md:grid-cols-2 gap-10'>
              {
                [
                  {
                    image: evalImg,
                    icon: <BsBarChart size={20} />,
                    title: "AI Answer Evaluation",
                    desc: "Scores communication, technical accuracy and confidence."
                  },
                  {
                    image: resumeImg,
                    icon: <BsFileEarmarkText size={20} />,
                    title: "Resume Based Interview",
                    desc: "Project-specific questions based on uploaded resume."
                  },
                  {
                    image: pdfImg,
                    icon: <BsFileEarmarkText size={20} />,
                    title: "Downloadable PDF Report",
                    desc: "Detailed strengths, weaknesses and improvement insights."
                  },
                  {
                    image: analyticsImg,
                    icon: <BsBarChart size={20} />,
                    title: "History & Analytics",
                    desc: "Track progress with performance graphs and topic analysis."
                  }
                ].map((item, index) => (
                  <Motion.div key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className='glass-card p-8'>
                    <div className='flex flex-col md:flex-row items-center gap-8'>
                      <div className='w-full md:w-1/2 flex justify-center'>
                        <img src={item.image} alt={item.title} className='w-full h-auto object-contain max-h-64 drop-shadow-[0_0_15px_rgba(109,91,255,0.2)]' />
                      </div>

                      <div className='w-full md:w-1/2'>
                        <div className='bg-[#6D5BFF]/10 text-[#A78BFA] border border-[#6D5BFF]/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6'>
                          {item.icon}
                        </div>
                        <h3 className='font-semibold mb-3 text-xl text-slate-100'>{item.title}</h3>
                        <p className='text-slate-400 text-sm leading-relaxed'>{item.desc}</p>
                      </div>

                    </div>


                  </Motion.div>
                ))
              }
            </div>


          </div>

          <div className='mb-32'>
            <Motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className='text-4xl font-semibold text-center mb-16'>
              Multiple Interview{" "}
              <span className="text-[#6D5BFF] neon-text-purple">Modes</span>

            </Motion.h2>

            <div className='relative w-full max-w-2xl mx-auto h-48'>
              <AnimatePresence mode="wait">
                <Motion.div
                  key={activeCardIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="glass-card p-8 group absolute inset-0 w-full"
                >
                  <div className='flex items-center justify-between gap-6 h-full'>
                    <div className="w-1/2">
                      <h3 className="font-semibold text-xl md:text-2xl mb-3 text-slate-100 group-hover:text-white transition-colors">
                        {modesData[activeCardIndex].title}
                      </h3>
                      <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                        {modesData[activeCardIndex].desc}
                      </p>

                      {/* Pagination dots indicator */}
                      <div className="flex gap-2 mt-6">
                        {modesData.map((_, i) => (
                          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activeCardIndex === i ? "w-6 bg-[#8B5CF6]" : "w-1.5 bg-white/20"}`}></span>
                        ))}
                      </div>
                    </div>

                    {/* RIGHT IMAGE */}
                    <div className="w-1/2 flex justify-end h-full">
                      <img
                        src={modesData[activeCardIndex].img}
                        alt={modesData[activeCardIndex].title}
                        className="w-24 md:w-32 h-24 md:h-32 object-contain drop-shadow-[0_0_15px_rgba(109,91,255,0.15)] group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                </Motion.div>
              </AnimatePresence>
            </div>


          </div>

        </div>
      </div>

      {showAuth && (
        <Suspense fallback={null}>
          <AuthModel onClose={() => setShowAuth(false)} />
        </Suspense>
      )}

      <Footer />

    </div>
  )
}

export default Home
