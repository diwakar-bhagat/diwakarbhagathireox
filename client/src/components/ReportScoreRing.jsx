import React from 'react';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function ReportScoreRing({ value, text }) {
  return (
    <CircularProgressbar
      value={value}
      text={text}
      styles={buildStyles({
        textSize: "18px",
        pathColor: "#10b981",
        textColor: "#10b981",
        trailColor: "currentColor",
      })}
      className="text-gray-200 dark:text-slate-800"
    />
  );
}

export default ReportScoreRing;
