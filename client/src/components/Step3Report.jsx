import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from "motion/react"
import ChartBarsSkeleton from './loaders/ChartBarsSkeleton';

const ReportTrendChart = lazy(() => import('./ReportTrendChart'));
const ReportScoreRing = lazy(() => import('./ReportScoreRing'));

function Step3Report({ report }) {
  const navigate = useNavigate()
  const chartContainerRef = useRef(null)
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const element = chartContainerRef.current
    if (!element) return

    const updateSize = () => {
      const { width, height } = element.getBoundingClientRect()
      const nextWidth = Math.max(0, Math.floor(width));
      const nextHeight = Math.max(0, Math.floor(height));
      setChartSize((prev) => (
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : {
            width: nextWidth,
            height: nextHeight,
          }
      ))
    }

    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const {
    finalScore = 0,
    confidence = 0,
    communication = 0,
    correctness = 0,
    questionWiseScore = [],
    reportPayload = null,
  } = report || {};

  const formatScore = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.0";
    return numeric.toFixed(1);
  };

  const normalizedFinalScore = Number(formatScore(finalScore));
  const normalizedConfidence = Number(formatScore(confidence));
  const normalizedCommunication = Number(formatScore(communication));
  const normalizedCorrectness = Number(formatScore(correctness));
  const normalizedQuestionWiseScore = useMemo(() => questionWiseScore.map((item) => ({
    ...item,
    score: Number(formatScore(item?.score || 0)),
    confidence: Number(formatScore(item?.confidence || 0)),
    communication: Number(formatScore(item?.communication || 0)),
    correctness: Number(formatScore(item?.correctness || 0)),
  })), [questionWiseScore]);
  const extendedReportPayload = reportPayload && typeof reportPayload === "object"
    ? reportPayload
    : null;
  const overallMetrics = extendedReportPayload?.overall || null;
  const cognitiveMetrics = extendedReportPayload?.cognitive || null;
  const atsMetrics = extendedReportPayload?.ats || null;
  const heatmapSkills = useMemo(() => (
    Array.isArray(extendedReportPayload?.heatmap?.skills)
      ? extendedReportPayload.heatmap.skills
      : []
  ), [extendedReportPayload?.heatmap?.skills]);
  const blueprintDays = useMemo(() => (
    Array.isArray(extendedReportPayload?.blueprint?.days)
      ? extendedReportPayload.blueprint.days
      : []
  ), [extendedReportPayload?.blueprint?.days]);
  const blueprintFocus = useMemo(() => (
    Array.isArray(extendedReportPayload?.blueprint?.topFocus)
      ? extendedReportPayload.blueprint.topFocus
      : []
  ), [extendedReportPayload?.blueprint?.topFocus]);
  const reportQuestions = useMemo(() => (
    Array.isArray(extendedReportPayload?.questions)
      ? extendedReportPayload.questions
      : []
  ), [extendedReportPayload?.questions]);
  const cognitiveBreakdown = useMemo(() => (
    cognitiveMetrics
      ? [
        { label: "Structure", value: Number(formatScore(cognitiveMetrics.structure || 0)) },
        { label: "Examples", value: Number(formatScore(cognitiveMetrics.examples || 0)) },
        { label: "Depth", value: Number(formatScore(cognitiveMetrics.depth || 0)) },
        { label: "Tradeoffs", value: Number(formatScore(cognitiveMetrics.tradeoffs || 0)) },
        { label: "Clarity", value: Number(formatScore(cognitiveMetrics.clarity || 0)) },
      ]
      : []
  ), [cognitiveMetrics]);
  const topHeatmapSkills = useMemo(() => heatmapSkills.slice(0, 6), [heatmapSkills]);
  const overallStrengths = Array.isArray(overallMetrics?.strengths)
    ? overallMetrics.strengths
    : [];
  const overallWeaknesses = Array.isArray(overallMetrics?.weaknesses)
    ? overallMetrics.weaknesses
    : [];
  const unansweredQuestions = useMemo(() => (
    Array.isArray(extendedReportPayload?.unansweredQuestions)
      ? extendedReportPayload.unansweredQuestions.filter(Boolean)
      : []
  ), [extendedReportPayload?.unansweredQuestions]);
  const hasUnansweredRisk = unansweredQuestions.length > 0;

  const questionScoreData = useMemo(() => normalizedQuestionWiseScore.map((score, index) => ({
    name: `Q${index + 1}`,
    score: score.score || 0
  })), [normalizedQuestionWiseScore]);

  const skills = useMemo(() => [
    { label: "Confidence", value: normalizedConfidence },
    { label: "Communication", value: normalizedCommunication },
    { label: "Correctness", value: normalizedCorrectness },
  ], [normalizedConfidence, normalizedCommunication, normalizedCorrectness]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading Report...</p>
      </div>
    );
  }

  let performanceText = "";
  let shortTagline = "";

  if (normalizedFinalScore >= 8) {
    performanceText = "Ready for job opportunities.";
    shortTagline = "Excellent clarity and structured responses.";
  } else if (normalizedFinalScore >= 5) {
    performanceText = "Needs minor improvement before interviews.";
    shortTagline = "Good foundation, refine articulation.";
  } else {
    performanceText = "Significant improvement required.";
    shortTagline = "Work on clarity and confidence.";
  }

  const score = normalizedFinalScore;
  const percentage = (score / 10) * 100;


  const downloadPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

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
      `Final Score: ${formatScore(normalizedFinalScore)}/10`,
      pageWidth / 2,
      currentY + 12,
      { align: "center" }
    );

    currentY += 30;

    // ================= SKILLS BOX =================
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, currentY, contentWidth, 30, 4, 4, "F");

    doc.setFontSize(12);

    doc.text(`Confidence: ${formatScore(normalizedConfidence)}`, margin + 10, currentY + 10);
    doc.text(`Communication: ${formatScore(normalizedCommunication)}`, margin + 10, currentY + 18);
    doc.text(`Correctness: ${formatScore(normalizedCorrectness)}`, margin + 10, currentY + 26);

    currentY += 45;

    // ================= ADVICE =================
    let advice = "";

    if (normalizedFinalScore >= 8) {
      advice =
        "Excellent performance. Maintain confidence and structure. Continue refining clarity and supporting answers with strong real-world examples.";
    } else if (normalizedFinalScore >= 5) {
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
      body: normalizedQuestionWiseScore.map((q, i) => [
        `${i + 1}`,
        q.question,
        `${formatScore(q.score)}/10`,
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

    currentY = (doc.lastAutoTable?.finalY || currentY) + 12;

    if (extendedReportPayload?.ats) {
      if (currentY > 245) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text("ATS Match Summary", margin, currentY);
      currentY += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const atsLines = [
        `Match: ${extendedReportPayload.ats.matchPercent || 0}%`,
        `Matched Must-Haves: ${(extendedReportPayload.ats.matchedMustHaves || []).join(", ") || "None"}`,
        `Missing Must-Haves: ${(extendedReportPayload.ats.missingMustHaves || []).join(", ") || "None"}`,
      ];
      const atsText = doc.splitTextToSize(atsLines.join("\n"), contentWidth);
      doc.text(atsText, margin, currentY);
      currentY += atsText.length * 5 + 6;
    }

    if (extendedReportPayload?.heatmap?.skills?.length) {
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["Skill", "JD", "Resume", "Demo", "Gap"]],
        body: extendedReportPayload.heatmap.skills.slice(0, 12).map((item) => ([
          item.skill,
          item.jd_required ? "Yes" : "No",
          item.resume_claimed ? "Yes" : "No",
          item.demonstrated,
          item.gap,
        ])),
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [15, 118, 110],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });
      currentY = (doc.lastAutoTable?.finalY || currentY) + 12;
    }

    if (extendedReportPayload?.blueprint?.days?.length) {
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["Day", "Focus", "Tasks"]],
        body: extendedReportPayload.blueprint.days.slice(0, 7).map((item) => ([
          `${item.day}`,
          item.title,
          Array.isArray(item.tasks) ? item.tasks.join(" | ") : "",
        ])),
        styles: {
          fontSize: 8,
          cellPadding: 4,
          valign: "top",
        },
        headStyles: {
          fillColor: [34, 197, 94],
          textColor: 255,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 35 },
          2: { cellWidth: "auto" },
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
      });
    }


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
            {(overallMetrics || hasUnansweredRisk) && (
              <div className='mt-3 flex flex-wrap gap-2'>
                {overallMetrics && (
                  <>
                    <span className='text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
                      Role Fit {overallMetrics.roleFitPercent || 0}%
                    </span>
                    <span className='text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                      Completion {overallMetrics.completionRatePercent || 0}%
                    </span>
                  </>
                )}
                {hasUnansweredRisk && (
                  <span className='text-[10px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'>
                    Unanswered Risk: {unansweredQuestions.length}
                  </span>
                )}
              </div>
            )}

          </div>
        </div>

        <button onClick={downloadPDF} className='bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-md transition-all duration-300 font-semibold text-sm sm:text-base text-nowrap'>Download PDF</button>
      </div>


      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8'>

        <div className='space-y-6'>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 text-center transition-colors">

            <h3 className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
              Overall Performance
            </h3>
            <div className='relative w-20 h-20 sm:w-25 sm:h-25 mx-auto'>
              <Suspense
                fallback={
                  <div className="h-full w-full rounded-full border-8 border-gray-200 dark:border-slate-800 flex items-center justify-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatScore(score)}/10
                  </div>
                }
              >
                <ReportScoreRing
                  value={percentage}
                  text={`${formatScore(score)}/10`}
                />
              </Suspense>
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

            {overallMetrics && (
              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Role Fit</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{overallMetrics.roleFitPercent || 0}%</p>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Completion</p>
                  <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{overallMetrics.completionRatePercent || 0}%</p>
                </div>
              </div>
            )}

            {hasUnansweredRisk && (
              <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 px-4 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                  Unanswered Question Risk
                </p>
                <p className="mt-1 text-sm text-rose-800 dark:text-rose-200 font-medium">
                  {unansweredQuestions.length} question{unansweredQuestions.length > 1 ? "s" : ""} had no usable answer. This lowers readiness confidence.
                </p>
              </div>
            )}
          </Motion.div>

          {(overallStrengths.length > 0 || overallWeaknesses.length > 0) && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 transition-colors'>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
                Summary Signals
              </h3>

              <div className='space-y-5'>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Strengths</p>
                  <div className='flex flex-wrap gap-2'>
                    {overallStrengths.slice(0, 6).map((item, index) => (
                      <span key={index} className='text-[10px] sm:text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50'>
                        {item}
                      </span>
                    ))}
                    {overallStrengths.length === 0 && (
                      <span className='text-xs text-gray-500 dark:text-gray-400'>No consistent strengths confirmed yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Weaknesses</p>
                  <div className='flex flex-wrap gap-2'>
                    {overallWeaknesses.slice(0, 6).map((item, index) => (
                      <span key={index} className='text-[10px] sm:text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800/50 capitalize'>
                        {item.replace(/_/g, " ")}
                      </span>
                    ))}
                    {overallWeaknesses.length === 0 && (
                      <span className='text-xs text-gray-500 dark:text-gray-400'>No major weakness tags flagged.</span>
                    )}
                  </div>
                </div>
              </div>
            </Motion.div>
          )}

          <Motion.div
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

          </Motion.div>

          {cognitiveBreakdown.length > 0 && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 transition-colors'>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
                Cognitive Breakdown
              </h3>

              <div className='space-y-4'>
                {cognitiveBreakdown.map((metric) => (
                  <div key={metric.label}>
                    <div className='flex justify-between mb-2 text-sm sm:text-base text-gray-600 dark:text-gray-300'>
                      <span>{metric.label}</span>
                      <span className='font-semibold text-sky-600 dark:text-sky-400'>{formatScore(metric.value)}</span>
                    </div>

                    <div className='bg-gray-200 dark:bg-slate-800 h-2 sm:h-3 rounded-full overflow-hidden'>
                      <div
                        className='bg-sky-500 dark:bg-sky-400 h-full rounded-full transition-all duration-500'
                        style={{ width: `${metric.value * 10}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {atsMetrics && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-6 sm:p-8 transition-colors'>
              <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-5">
                ATS Summary
              </h3>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 border border-emerald-100 dark:border-emerald-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Match</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800 dark:text-emerald-200">{atsMetrics.matchPercent || 0}%</p>
                </div>
                <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Matched</p>
                  <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{atsMetrics.matchedMustHaves?.length || 0}</p>
                </div>
                <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 px-3 py-3 border border-rose-100 dark:border-rose-800/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Missing</p>
                  <p className="mt-1 text-lg font-bold text-rose-800 dark:text-rose-200">{atsMetrics.missingMustHaves?.length || 0}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Missing Must-Haves</p>
                  <div className="flex flex-wrap gap-2">
                    {(atsMetrics.missingMustHaves || []).slice(0, 5).map((item, index) => (
                      <span key={index} className="text-[10px] sm:text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-800/50">
                        {item}
                      </span>
                    ))}
                    {(!atsMetrics.missingMustHaves || atsMetrics.missingMustHaves.length === 0) && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">No critical must-have gaps.</span>
                    )}
                  </div>
                </div>

                {atsMetrics.notes?.length > 0 && (
                  <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-300 mb-2">Recruiter Notes</p>
                    <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-400">
                      {atsMetrics.notes.slice(0, 3).map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Motion.div>
          )}


        </div>

        <div className='lg:col-span-2 space-y-6'>

          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors min-h-0'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 sm:mb-6">
              Performance Trend
            </h3>

            <div ref={chartContainerRef} className='h-64 sm:h-72 w-full min-w-0'>
              {chartSize.width > 0 && chartSize.height > 0 ? (
                <Suspense fallback={<ChartBarsSkeleton />}>
                  <ReportTrendChart
                    width={chartSize.width}
                    height={chartSize.height}
                    data={questionScoreData}
                  />
                </Suspense>
              ) : (
                <ChartBarsSkeleton />
              )}
            </div>


          </Motion.div>

          {topHeatmapSkills.length > 0 && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6'>
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                  Skill Heatmap
                </h3>
                <span className='text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
                  Coverage {extendedReportPayload?.heatmap?.completionRatePercent || 0}%
                </span>
              </div>

              <div className='space-y-4'>
                {topHeatmapSkills.map((item) => (
                  <div key={item.skill} className='rounded-xl border border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/30 p-4'>
                    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                      <div>
                        <p className='font-semibold text-gray-800 dark:text-gray-100'>{item.skill}</p>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md border ${item.jd_required ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50" : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"}`}>
                            {item.jd_required ? "JD Required" : "JD Optional"}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md border ${item.resume_claimed ? "bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50" : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50"}`}>
                            {item.resume_claimed ? "Resume Claimed" : "Not On Resume"}
                          </span>
                        </div>
                      </div>

                      <div className='text-left sm:text-right'>
                        <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>Demonstrated</p>
                        <p className='font-semibold text-gray-800 dark:text-gray-100 capitalize'>{item.demonstrated}</p>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Gap: <span className='capitalize'>{item.gap}</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          {blueprintDays.length > 0 && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors'>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6'>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">
                    7-Day Improvement Blueprint
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                    A daily plan generated from your weakest signals and JD gaps.
                  </p>
                </div>
                {blueprintFocus.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {blueprintFocus.slice(0, 3).map((focus, index) => (
                      <span key={index} className='text-[10px] sm:text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 px-2 py-1 rounded-md border border-sky-100 dark:border-sky-800/50'>
                        {focus}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
                {blueprintDays.slice(0, 7).map((dayItem) => (
                  <div key={dayItem.day} className='rounded-xl border border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/30 p-4'>
                    <div className='flex items-start justify-between gap-3 mb-3'>
                      <div>
                        <p className='text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400'>Day {dayItem.day}</p>
                        <p className='font-semibold text-gray-800 dark:text-gray-100 mt-1'>
                          {dayItem.title || `Day ${dayItem.day}`}
                        </p>
                      </div>
                      <span className='text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'>
                        Action
                      </span>
                    </div>

                    {Array.isArray(dayItem.tasks) && dayItem.tasks.length > 0 && (
                      <ul className='space-y-2 text-sm text-gray-700 dark:text-gray-300'>
                        {dayItem.tasks.slice(0, 3).map((task, taskIndex) => (
                          <li key={taskIndex} className='flex items-start gap-2'>
                            <span className='mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0'></span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {dayItem.expectedOutcome && (
                      <div className='mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 px-3 py-3'>
                        <p className='text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1'>
                          Expected Outcome
                        </p>
                        <p className='text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>
                          {dayItem.expectedOutcome}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Motion.div>
          )}

          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-lg dark:shadow-slate-950/40 border border-transparent dark:border-slate-800 p-5 sm:p-8 transition-colors'>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
              Question Breakdown
            </h3>

            {hasUnansweredRisk && (
              <div className='mb-5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 px-4 py-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300 mb-2'>
                  Unanswered Questions
                </p>
                <p className='text-sm text-rose-800 dark:text-rose-200 leading-relaxed'>
                  {unansweredQuestions.slice(0, 2).join(" | ")}
                  {unansweredQuestions.length > 2 ? ` | +${unansweredQuestions.length - 2} more` : ""}
                </p>
              </div>
            )}
            <div className='space-y-6'>
              {normalizedQuestionWiseScore.map((q, i) => (
                <div key={i} className='bg-gray-50 dark:bg-slate-800/40 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700/50'>
                  {reportQuestions[i]?.taggedSkills?.length > 0 && (
                    <div className='mb-3 flex flex-wrap gap-2'>
                      {reportQuestions[i].taggedSkills.slice(0, 4).map((skill, skillIndex) => (
                        <span key={skillIndex} className='text-[10px] sm:text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800/50'>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

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
                      {formatScore(q.score)}/10
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

                  {reportQuestions[i]?.evaluation?.coaching_tip && (
                    <div className='mt-3 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30 p-4 rounded-lg'>
                      <p className='text-[11px] uppercase tracking-wide text-sky-700 dark:text-sky-400 font-bold mb-1 flex items-center gap-1.5'>
                        🚀 Coaching Tip
                      </p>
                      <p className='text-sm text-sky-900 dark:text-sky-200 leading-relaxed font-medium'>
                        {reportQuestions[i].evaluation.coaching_tip}
                      </p>
                    </div>
                  )}

                  {reportQuestions[i]?.evaluation?.missing_elements?.length > 0 && (
                    <div className='mt-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 p-4 rounded-lg'>
                      <p className='text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-bold mb-2 flex items-center gap-1.5'>
                        ⚠️ Missed Opportunities
                      </p>
                      <ul className='flex flex-wrap gap-1.5'>
                        {reportQuestions[i].evaluation.missing_elements.map((item, mIdx) => (
                          <li key={mIdx} className='text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-1 rounded border border-amber-200 dark:border-amber-800/50'>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reportQuestions[i]?.evaluation && (
                    <div className='mt-4 pt-4 border-t border-gray-200/50 dark:border-slate-700/50'>
                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                        {[
                          { label: 'Structure', val: reportQuestions[i].evaluation.structure },
                          { label: 'Depth', val: reportQuestions[i].evaluation.implementation_depth },
                          { label: 'Tradeoffs', val: reportQuestions[i].evaluation.tradeoff_awareness },
                          { label: 'Clarity', val: reportQuestions[i].evaluation.clarity }
                        ].map((metric, mIdx) => metric.val !== undefined && (
                          <div key={mIdx} className='flex flex-col'>
                            <span className='text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold'>{metric.label}</span>
                            <span className='text-sm font-bold text-gray-800 dark:text-gray-200'>{formatScore(metric.val)}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>

          </Motion.div>





        </div>
      </div>

    </div>
  )
}

export default Step3Report
