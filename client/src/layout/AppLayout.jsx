import React from "react";
import { useSelector } from "react-redux";
import GlobalGridBackground from "../components/GlobalGridBackground";
import AppPreloader from "../components/loaders/AppPreloader";
import ResumeParsingOverlay from "../components/loaders/ResumeParsingOverlay";
import PaymentProcessingOverlay from "../components/loaders/PaymentProcessingOverlay";
import NetworkStatusPill from "../components/loaders/NetworkStatusPill";
import OXbot from "../components/OXbot";

const AppLayout = ({ children, isDimmed = false }) => {
  const { resumeParsing, paymentProcessing, appBooting } = useSelector(
    (state) => state.ui
  );
  const hasOverlay = resumeParsing || paymentProcessing.status !== "idle";
  const backgroundDimmed = isDimmed || hasOverlay || appBooting;

  return (
    <>
      <GlobalGridBackground isDimmed={backgroundDimmed} />
      {children}
      <NetworkStatusPill />
      <ResumeParsingOverlay />
      <PaymentProcessingOverlay />
      <AppPreloader />
      <OXbot />
    </>
  );
};

export default AppLayout;
