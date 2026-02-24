import React, { useEffect, useRef, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react"
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function Step3Report({ report }) {
  const navigate = useNavigate()
  const chartContainerRef = useRef(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect()
      setChartSize({
        width: Math.max(0, Math.floor(width)),
        height: Math.max(0, Math.floor(height)),
      })
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading Report...</p>
      </div>
    );
  }
  const {
    finalScore = 0,
    confidence = 0,
    communication = 0,
    correctness = 0,
    questionWiseScore = [],
  } = report;

  const questionScoreData = questionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: score.score || 0
  }))

  const skills = [
    { label: "Confidence", value: confidence },
    { label: "Communication", value: communication },
    { label: "Correctness", value: correctness },
  ];

  let performanceText = "";
  let shortTagline = "";

  if (finalScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (finalScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = finalScore;
  const percentage = (score / 10) * 100;


  const downloadPDF = () => {
    const fileName = "AI_Interview_Report.pdf";
    const doc = new jsPDF("p", "mm", "a4");

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    let currentY = 25;

    // ================= TITLE =================
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(34, 197, 94);
    doc.text("AI Interview Performance Report", pageWidth / 2, currentY, {
      align: "center",
    });

    currentY += 5;

    // underline
    doc.setDrawColor(34, 197, 94);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

    currentY += 15;

    // ================= FINAL SCORE BOX =================
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, currentY, contentWidth, 20, 4, 4, "F");

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Final Score: ${finalScore}/10`,
      pageWidth / 2,
      currentY + 12,
      { align: "center" }
    );

    currentY += 30;

    // ================= SKILLS BOX =================
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, "F");

    doc.setFontSize(12);

    doc.text(`Confidence: ${confidence}`, margin + 10, currentY + 10);
    doc.text(`Communication: ${communication}`, margin + 10, currentY + 18);
    doc.text(`Correctness: ${correctness}`, margin + 10, currentY + 26);

    currentY += 45;

    // ================= ADVICE =================
    let advice = "";

    if (finalScore >= 8) {
      advice =
        "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
    } else if (finalScore >= 5) {
      advice =
        "Good foundation shown. Improve clarity and structure. Practice delivering concise, confident answers with stronger supporting examples.";
    } else {
      advice =
        "Significant improvement required. Focus on structured thinking, clarity, and confident delivery. Practice answering aloud regularly.";
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220);
    doc.roundedRect(margin, currentY, contentWidth, 35, 4, 4);

    doc.setFont("helvetica", "bold");
    doc.text("Professional Advice", margin + 10, currentY + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const splitAdvice = doc.splitTextToSize(advice, contentWidth - 20);
    doc.text(splitAdvice, margin + 10, currentY + 20);

    currentY += 50;

    // ================= QUESTION TABLE =================
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["#", "Question", "Score", "Feedback"]],
      body: questionWiseScore.map((q, i) => [
        `${i + 1}`,
        q.question,
        `${q.score}/10`,
        q.feedback,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 5,
        valign: "top",
      },
      headStyles: {
        fillColor: [34, 197, 94],
        textColor: 255,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" }, // index
        1: { cellWidth: 55 }, // question
        2: { cellWidth: 20, halign: "center" }, // score
        3: { cellWidth: "auto" }, // feedback
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    });


    doc.setProperties({ title: "AI Interview Performance Report" });

    try {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      doc.save(fileName);
    }
  };

  return (
    <div className='min-h-screen bg-linear-to-br from-gray-50 to-green-50 dark:from-slate-950 dark:to-slate-900 px-4 sm:px-6 lg:px-10 py-8 transition-colors duration-300'>
      <div className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='md:mb-10 w-full flex items-start gap-4 flex-wrap'>
          <button
            onClick={() => navigate("/history")}
            className='mt-1 p-3 rounded-full bg-white dark:bg-slate-800 shadow hover:shadow-md dark:shadow-slate-950/40 transition'>
            <FaArrowLeft className='text-gray-600 dark:text-gray-400' />
          </button>

          <div>
            <h1 className='text-3xl font-bold flex-nowrap text-gray-800 dark:text-white'>
              Interview Analytics Dashboard
            </h1>
            <p className='text-gray-500 dark:text-gray-400 mt-2'>
              AI-powered performance insights
            </p>

          </div>
        </div>

        <button onClick={downloadPDF} className='bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap'>Download PDF</button>
      </div>


      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>

        <div className='space-y-6'>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 text-center transition-colors">

            <h3 className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
              Overall Performance
            </h3>
            <div className='relative w-20 h-20 sm:w-25 sm:h-25 mx-auto'>
              <CircularProgressbar
                value={percentage}
                text={`${score}/10`}
                styles={buildStyles({
                  textSize: "18px",
                  pathColor: "#10b981",
                  textColor: "#10b981", // Changed from #ef4444 for consistency
                  trailColor: "currentColor",
                })}
                className="text-gray-200 dark:text-slate-800"
              />
            </div>

            <p className="text-gray-400 dark:text-gray-500 mt-3 text-xs sm:text-sm">
              Out of 10
            </p>

            <div className="mt-4">
              <p className="font-semibold text-gray-800 dark:text-white text-sm sm:text-base">
                {performanceText}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
                {shortTagline}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 transition-colors'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
              Skill Evaluation
            </h3>

            <div className='space-y-5'>
              {
                skills.map((s, i) => (
                  <div key={i}>
                    <div className='flex justify-between mb-2 text-sm sm:text-base text-gray-600 dark:text-gray-300'>

                      <span>{s.label}</span>
                      <span className='font-semibold text-green-600 dark:text-green-400'>{s.value}</span>
                    </div>

                    <div className='bg-gray-200 dark:bg-slate-800 h-2 sm:h-3 rounded-full overflow-hidden'>
                      <div className='bg-green-500 dark:bg-green-400 h-full rounded-full transition-all duration-500'
                        style={{ width: `${s.value * 10}%` }}

                      ></div>

                    </div>


                  </div>
                ))
              }
            </div>

          </motion.div>


        </div>

        <div className='lg:col-span-2 space-y-6'>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors min-h-0'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 sm:mb-6">
              Performance Trend
            </h3>

            <div ref={chartContainerRef} className='h-64 sm:h-72 w-full min-w-0'>
              {chartSize.width > 0 && chartSize.height > 0 && (
                <AreaChart width={chartSize.width} height={chartSize.height} data={questionScoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-gray-400 dark:text-gray-600" />
                  <YAxis domain={[0, 10]} stroke="currentColor" className="text-gray-400 dark:text-gray-600" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--tw-slate-900)', border: 'none', borderRadius: '12px', color: 'white' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Area type="monotone"
                    dataKey="score"
                    stroke="#22c55e"
                    fill="#bbf7d0"
                    fillOpacity={0.4}
                    strokeWidth={3} />
                </AreaChart>
              )}
            </div>


          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
              Question Breakdown
            </h3>
            <div className='space-y-6'>
              {questionWiseScore.map((q, i) => (
                <div key={i} className='bg-gray-50 dark:bg-slate-800/40 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700/50'>

                  <div className='flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4'>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Question {i + 1}
                      </p>

                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base leading-relaxed">
                        {q.question || "Question not available"}
                      </p>
                    </div>


                    <div className='bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full font-bold text-xs sm:text-sm w-fit shadow-sm'>
                      {q.score ?? 0}/10
                    </div>
                  </div>

                  <div className='bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/30 p-4 rounded-lg'>
                    <p className='text-xs text-green-600 dark:text-green-500 font-semibold mb-1'>
                      AI Feedback
                    </p>
                    <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium'>

                      {q.feedback && q.feedback.trim() !== ""
                        ? q.feedback
                        : "No feedback available for this question."}
                    </p>
                  </div>

                </div>
              ))}
            </div>

          </motion.div>





        </div>
      </div>

    </div>
  )
}

export default Step3Report
