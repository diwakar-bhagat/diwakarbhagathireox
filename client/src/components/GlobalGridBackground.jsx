import React from "react";

const GlobalGridBackground = ({ isDimmed }) => {
  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none transition-opacity duration-300 bg-[#FAFAFA] dark:bg-[#0B0F19] ${isDimmed ? "opacity-40" : "opacity-100"
        }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(34,197,94,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,197,94,0.15)_1px,transparent_1px)] bg-[length:40px_40px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(250,250,250,0.9)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(11,15,25,0.9)_100%)]" />
    </div>
  );
};

export default GlobalGridBackground;
