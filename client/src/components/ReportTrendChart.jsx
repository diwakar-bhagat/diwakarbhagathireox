import React, { memo } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

const ReportTrendChart = memo(function ReportTrendChart({ width, height, data }) {
  return (
    <AreaChart width={width} height={height} data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" />
      <XAxis dataKey="name" stroke="currentColor" className="text-gray-400 dark:text-gray-600" />
      <YAxis domain={[0, 10]} stroke="currentColor" className="text-gray-400 dark:text-gray-600" />
      <Tooltip
        contentStyle={{ backgroundColor: 'var(--tw-slate-900)', border: 'none', borderRadius: '12px', color: 'white' }}
        itemStyle={{ color: '#10b981' }}
      />
      <Area
        type="monotone"
        dataKey="score"
        stroke="#22c55e"
        fill="#bbf7d0"
        fillOpacity={0.4}
        strokeWidth={3}
      />
    </AreaChart>
  );
});

export default ReportTrendChart;
