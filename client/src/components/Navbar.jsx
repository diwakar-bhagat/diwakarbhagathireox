import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion as Motion } from "motion/react";
import { BsCoin, BsRobot } from "react-icons/bs";
import { FaUserAstronaut } from "react-icons/fa";
import { HiOutlineLogout } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ServerUrl } from "../App";
import { setUserData } from "../redux/userSlice";
import ThemeToggle from "./ThemeToggle";

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
const AuthModel = lazy(() => import("./AuthModel"));

const useLiveStats = () => {
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, loading: true });

  useEffect(() => {
    // If stats are stored under a 'stats/app' document
    const docRef = doc(db, "stats", "app");
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          totalUsers: data.totalUsers || 0,
          activeUsers: data.activeUsers || 0,
          loading: false,
        });
      } else {
        setStats(prev => ({ ...prev, loading: false }));
      }
    }, (error) => {
      console.log("Error fetching stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    });
    return () => unsub();
  }, []);

  return stats;
};

import logo from "../assets/image.png";

function Navbar() {
  const { userData } = useSelector((state) => state.user);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const creditPanelRef = useRef(null);
  const userPanelRef = useRef(null);
  const liveStats = useLiveStats();
  const [isNavVisible, setIsNavVisible] = useState(true);

  useEffect(() => {
    let timeoutId;

    const handleActivity = () => {
      setIsNavVisible(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsNavVisible(false);
      }, 2500);
    };

    handleActivity();

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("keydown", handleActivity);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        creditPanelRef.current &&
        !creditPanelRef.current.contains(event.target)
      ) {
        setShowCreditPopup(false);
      }

      if (
        userPanelRef.current &&
        !userPanelRef.current.contains(event.target)
      ) {
        setShowUserPopup(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    try {
      await axios.get(ServerUrl + "/api/auth/logout", { withCredentials: true });
      dispatch(setUserData(null));
      setShowCreditPopup(false);
      setShowUserPopup(false);
      navigate("/");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-x-0 top-0 z-[80] flex justify-center px-3 sm:px-4 pt-4 sm:pt-6 transition-opacity duration-300 ease-in-out ${isNavVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
      >
        <Motion.div
          initial={{ opacity: 0, y: -32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative w-full max-w-6xl overflow-visible glass-card rounded-2xl sm:rounded-[24px] px-3 sm:px-5 lg:px-8 py-3 sm:py-4"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[24px] bg-gradient-to-r from-purple-500/10 via-transparent to-[#6D5BFF]/10" />

          <div className="relative z-10 flex items-center justify-between gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 sm:gap-3 rounded-xl px-2 py-1.5 hover:bg-white/60 dark:hover:bg-slate-800/60 transition"
            >
              <div className="grid h-9 w-9 overflow-hidden place-items-center rounded-xl bg-black text-white shadow-md shadow-black/20">
                <img src={logo} alt="HireOX Logo" className="h-full w-full object-cover" />
              </div>
              <h1 className="font-semibold text-sm sm:text-base lg:text-lg text-slate-800 dark:text-slate-100">
                HireOX.AI
              </h1>
            </button>

            <div className="relative flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* LIVE STATS */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6D5BFF]"></span>
                </div>
                {liveStats.loading ? (
                  <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                ) : (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {liveStats.activeUsers} <span className="text-[10px] text-slate-400">online</span>
                  </span>
                )}
              </div>

              <ThemeToggle />

              <div className="relative" ref={creditPanelRef}>
                <button
                  onClick={() => {
                    if (!userData) {
                      setShowAuth(true);
                      return;
                    }
                    setShowCreditPopup((prev) => !prev);
                    setShowUserPopup(false);
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200/70 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/70 px-3 sm:px-4 py-2 text-sm sm:text-base text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
                >
                  <BsCoin size={18} className="text-amber-500" />
                  <span className="font-medium">{userData?.credits || 0}</span>
                </button>

                {showCreditPopup && (
                  <div className="absolute right-0 top-full mt-3 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl p-4 sm:p-5 z-50">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Need more credits to continue interviews?
                    </p>
                    <button
                      onClick={() => navigate("/pricing")}
                      className="w-full rounded-xl bg-[#5100FF] text-white py-2.5 text-sm font-medium hover:bg-[#5728F4] transition shadow-[0_0_20px_rgba(81,0,255,0.2)]"
                    >
                      Buy more credits
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={userPanelRef}>
                <button
                  onClick={() => {
                    if (!userData) {
                      setShowAuth(true);
                      return;
                    }
                    setShowUserPopup((prev) => !prev);
                    setShowCreditPopup(false);
                  }}
                  className="h-10 w-10 rounded-full bg-[#5100FF] text-white overflow-hidden grid place-items-center font-semibold shadow-md shadow-[#5100FF]/25"
                >
                  {userData ? (
                    userData.photoURL ? (
                      <img src={userData.photoURL} alt={userData.name} className="h-full w-full object-cover" />
                    ) : (
                      userData?.name?.slice(0, 1).toUpperCase()
                    )
                  ) : (
                    <FaUserAstronaut size={15} />
                  )}
                </button>

                {showUserPopup && (
                  <div className="absolute right-0 top-full mt-3 w-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-2xl p-4 z-50">
                    <p className="text-sm font-medium text-sky-600 dark:text-sky-300 mb-2 truncate">
                      {userData?.name}
                    </p>

                    <button
                      onClick={() => navigate("/history")}
                      className="w-full text-left text-sm py-2 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition"
                    >
                      Interview History
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-sm py-2 flex items-center gap-2 text-red-500"
                    >
                      <HiOutlineLogout size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Motion.div>
      </div>

      <div aria-hidden className="h-[90px] sm:h-[104px] lg:h-[112px]" />
      {showAuth && (
        <Suspense fallback={null}>
          <AuthModel onClose={() => setShowAuth(false)} />
        </Suspense>
      )}
    </>
  );
}

export default Navbar;
