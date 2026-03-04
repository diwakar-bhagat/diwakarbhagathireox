import React from "react";
import bgMain from "../assets/bgmain.svg";

const GlobalGridBackground = ({ isDimmed }) => {
  return (
    <div
      className={`fixed inset-0 -z-10 pointer-events-none transition-opacity duration-300 ${isDimmed ? "opacity-40" : "opacity-100"
        }`}
      style={{ backgroundColor: '#101010' }}
    >
      <img
        src={bgMain}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
        aria-hidden="true"
        draggable="false"
      />
    </div>
  );
};

export default GlobalGridBackground;
