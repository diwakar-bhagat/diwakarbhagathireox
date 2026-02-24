import React, { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import axios from "axios";
import { onAuthStateChanged } from "firebase/auth";
import { useDispatch } from "react-redux";
import AppLayout from "./layout/AppLayout";
import { auth } from "./utils/firebase";
import { setUserData } from "./redux/userSlice";
import {
  finishAppBoot,
  setBootProgress,
  startAppBoot,
} from "./redux/uiSlice";
import { EASE_APPLE } from "./motion/config";
import RouteFallbackSkeleton from "./components/loaders/RouteFallbackSkeleton";

const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth"));
const InterviewPage = lazy(() => import("./pages/InterviewPage"));
const InterviewHistory = lazy(() => import("./pages/InterviewHistory"));
const Pricing = lazy(() => import("./pages/Pricing"));
const InterviewReport = lazy(() => import("./pages/InterviewReport"));

const normalizeServerUrl = (value) => value.replace(/\/+$/, "")
export const ServerUrl = normalizeServerUrl(
  import.meta.env.VITE_SERVER_URL || "https://ox-server-90t3.onrender.com"
)

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    let disposed = false;
    let unsubscribeAuth = () => {};

    const waitForFirebaseAuth = () =>
      new Promise((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        const timeoutId = window.setTimeout(() => {
          unsubscribeAuth();
          finish();
        }, 2200);

        unsubscribeAuth = onAuthStateChanged(auth, () => {
          window.clearTimeout(timeoutId);
          unsubscribeAuth();
          finish();
        });
      });

    const fetchInitialUser = async () => {
      try {
        const result = await axios.get(ServerUrl + "/api/user/current-user", {
          withCredentials: true,
        });
        dispatch(setUserData(result.data));
      } catch (error) {
        console.log(error);
        dispatch(setUserData(null));
      }
    };

    const bootApp = async () => {
      dispatch(startAppBoot());
      dispatch(setBootProgress(8));

      await waitForFirebaseAuth();
      if (disposed) return;
      dispatch(setBootProgress(42));

      await fetchInitialUser();
      if (disposed) return;
      dispatch(setBootProgress(88));

      dispatch(setBootProgress(100));
      window.setTimeout(() => {
        if (!disposed) {
          dispatch(finishAppBoot());
        }
      }, 120);
    };

    bootApp();

    return () => {
      disposed = true;
      unsubscribeAuth();
    };
  }, [dispatch]);

  return (
    <AppLayout isDimmed={false}>
      <Suspense fallback={<RouteFallbackSkeleton />}>
        <AnimatePresence mode="wait" initial={false}>
          <Motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: EASE_APPLE }}
          >
            <Routes location={location}>
              <Route path='/' element={<Home />} />
              <Route path='/auth' element={<Auth />} />
              <Route path='/interview' element={<InterviewPage />} />
              <Route path='/history' element={<InterviewHistory />} />
              <Route path='/pricing' element={<Pricing />} />
              <Route path='/report/:id' element={<InterviewReport />} />
            </Routes>
          </Motion.div>
        </AnimatePresence>
      </Suspense>
    </AppLayout>
  )
}

export default App
