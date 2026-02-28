import React from 'react'
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
function Timer({ timeLeft, totalTime }) {
    const safeTotalTime = Number.isFinite(Number(totalTime)) && Number(totalTime) > 0
        ? Number(totalTime)
        : 1;
    const safeTimeLeft = Number.isFinite(Number(timeLeft))
        ? Math.max(0, Number(timeLeft))
        : 0;
    const percentage = (safeTimeLeft / safeTotalTime) * 100
  return (
    <div className='w-20 h-20'>
        <CircularProgressbar
        value={percentage}
        text={`${safeTimeLeft}s`}
        styles={buildStyles({
          textSize: "28px",
          pathColor: "#10b981",
          textColor: "#ef4444",
          trailColor: "#e5e7eb",
        })}
        />
      
    </div>
  )
}

export default Timer
