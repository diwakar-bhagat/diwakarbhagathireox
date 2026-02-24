import { useEffect, useState } from "react";

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [showRecovered, setShowRecovered] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
      setShowRecovered(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRecovered(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!showRecovered) return;
    const timer = window.setTimeout(() => {
      setShowRecovered(false);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [showRecovered]);

  return {
    isOnline,
    showRecovered,
    visible: !isOnline || showRecovered,
  };
};

export default useNetworkStatus;
