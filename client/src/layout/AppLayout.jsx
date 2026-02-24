import React from "react";
import { motion } from "motion/react";
import GlobalGridBackground from "../components/GlobalGridBackground";

const AppLayout = ({ children, isDimmed = false }) => {
  return (
    <>
      <GlobalGridBackground isDimmed={isDimmed} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.div>
    </>
  );
};

export default AppLayout;
