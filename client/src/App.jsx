import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import axios from "axios";
import { getRedirectResult, onAuthStateChanged } from "firebase/auth";
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

    const resolveRequestPath = (url = "") => {
      if (typeof url !== "string" || !url) return "";
      if (!url.startsWith("http")) return url;
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    };

    const shouldAttachFirebaseAuth = (url = "") => {
      const path = resolveRequestPath(url);
      if (!path.startsWith("/api/")) return false;
      if (path.startsWith("/api/auth/")) return false;
      return true;
    };
    const isServerRequest = (url = "") => {
      if (typeof url !== "string" || !url) return false;
      if (url.startsWith("http")) return url.startsWith(ServerUrl);
      return url.startsWith("/api/");
    };

    const requestInterceptorId = axios.interceptors.request.use(
      async (config) => {
        const requestUrl = config?.url || "";
        if (!shouldAttachFirebaseAuth(requestUrl)) {
          return config;
        }

        const nextConfig = { ...config, withCredentials: true };
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          return nextConfig;
        }

        try {
          const idToken = await firebaseUser.getIdToken();
          nextConfig.headers = {
            ...(nextConfig.headers || {}),
            Authorization: `Bearer ${idToken}`,
          };
        } catch {
          return nextConfig;
        }

        return nextConfig;
      },
      (error) => Promise.reject(error)
    );

    const waitForFirebaseAuth = () =>
      new Promise((resolve) => {
        let settled = false;
        const finish = (user = null) => {
          if (settled) return;
          settled = true;
          resolve(user);
        };

        const timeoutId = window.setTimeout(() => {
          unsubscribeAuth();
          finish(auth.currentUser || null);
        }, 7000);

        unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
          window.clearTimeout(timeoutId);
          unsubscribeAuth();
          finish(firebaseUser || null);
        });
      });

    const syncServerSession = async (firebaseUser) => {
      if (!firebaseUser) return false;
      const idToken = await firebaseUser.getIdToken();
      await axios.post(
        ServerUrl + "/api/auth/google",
        {
          idToken,
          name: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
        },
        { withCredentials: true }
      );
      return true;
    };

    const resolveRedirectUser = async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        return redirectResult?.user || null;
      } catch {
        return null;
      }
    };

    const responseInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;
        const requestUrl = originalRequest?.url || "";

        if (status !== 401 || !originalRequest) {
          return Promise.reject(error);
        }
        if (!isServerRequest(requestUrl)) {
          return Promise.reject(error);
        }
        if (requestUrl.includes("/api/auth/google")) {
          return Promise.reject(error);
        }
        if (originalRequest.__authRetried) {
          return Promise.reject(error);
        }

        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          return Promise.reject(error);
        }

        try {
          await syncServerSession(firebaseUser);
          originalRequest.__authRetried = true;
          originalRequest.withCredentials = true;
          return axios(originalRequest);
        } catch {
          return Promise.reject(error);
        }
      }
    );

    const fetchInitialUser = async () => {
      try {
        const result = await axios.get(ServerUrl + "/api/user/current-user", {
          withCredentials: true,
        });
        dispatch(setUserData(result.data));
      } catch {
        dispatch(setUserData(null));
      }
    };

    const bootApp = async () => {
      dispatch(startAppBoot());
      dispatch(setBootProgress(8));

      const redirectUser = await resolveRedirectUser();
      const firebaseUser = redirectUser || await waitForFirebaseAuth();
      if (disposed) return;
      dispatch(setBootProgress(42));

      if (firebaseUser) {
        let sessionReady = false;
        try {
          sessionReady = await syncServerSession(firebaseUser);
        } catch {
          dispatch(setUserData(null));
        }

        if (disposed) return;
        if (sessionReady) {
          await fetchInitialUser();
        } else {
          dispatch(setUserData(null));
        }
      } else {
        dispatch(setUserData(null));
      }

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
      axios.interceptors.request.eject(requestInterceptorId);
      axios.interceptors.response.eject(responseInterceptorId);
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
              <Route path='*' element={<Navigate to='/' replace />} />
            </Routes>
          </Motion.div>
        </AnimatePresence>
      </Suspense>
    </AppLayout>
  )
}

export default App
