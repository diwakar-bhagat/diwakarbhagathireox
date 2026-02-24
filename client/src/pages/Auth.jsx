import React, { useCallback, useEffect, useState } from 'react'
import { BsRobot } from "react-icons/bs";
import { IoSparkles } from "react-icons/io5";
import { motion as Motion } from "motion/react"
import { FcGoogle } from "react-icons/fc";
import { getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { auth, provider } from '../utils/firebase';
import axios from 'axios';
import { ServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
function Auth({ isModel = false }) {
    const dispatch = useDispatch()
    const [isSubmitting, setIsSubmitting] = useState(false);

    const completeServerAuth = useCallback(async (user) => {
        const idToken = await user.getIdToken();
        const result = await axios.post(
            ServerUrl + "/api/auth/google",
            {
                idToken,
                name: user.displayName || "",
                email: user.email || "",
            },
            { withCredentials: true }
        );
        dispatch(setUserData(result.data));
    }, [dispatch]);

    useEffect(() => {
        let active = true;

        const resolveRedirectLogin = async () => {
            try {
                const redirectResult = await getRedirectResult(auth);
                if (!redirectResult?.user || !active) return;
                setIsSubmitting(true);
                await completeServerAuth(redirectResult.user);
            } catch (error) {
                if (active) {
                    console.log(error);
                    dispatch(setUserData(null));
                }
            } finally {
                if (active) {
                    setIsSubmitting(false);
                }
            }
        };

        resolveRedirectLogin();
        return () => {
            active = false;
        };
    }, [completeServerAuth, dispatch]);

    const handleGoogleAuth = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.log(error);
            dispatch(setUserData(null));
        } finally {
            setIsSubmitting(false);
        }
    }
    return (
        <div className={`
      w-full 
      ${isModel ? "py-4" : "min-h-screen bg-[#f3f3f3] flex items-center justify-center px-6 py-20"}
    `}>
            <Motion.div
                initial={{ opacity: 0, y: -40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.05 }}
                className={`
        w-full 
        ${isModel ? "max-w-md p-8 rounded-3xl" : "max-w-lg p-12 rounded-[32px]"}
        bg-white shadow-2xl border border-gray-200
      `}>
                <div className='flex items-center justify-center gap-3 mb-6'>
                    <div className='bg-black text-white p-2 rounded-lg'>
                        <BsRobot size={18} />

                    </div>
                    <h2 className='font-semibold text-lg'>HireOX.AI</h2>
                </div>

                <h1 className='text-2xl md:text-3xl font-semibold text-center leading-snug mb-4'>
                    Continue with
                    <span className='bg-green-100 text-green-600 px-3 py-1 rounded-full inline-flex items-center gap-2'>
                        <IoSparkles size={16} />
                        AI Smart Interview

                    </span>
                </h1>

                <p className='text-gray-500 text-center text-sm md:text-base leading-relaxed mb-8'>
                    Sign in to start AI-powered mock interviews,
                    track your progress, and unlock detailed performance insights.
                </p>


                <Motion.button
                    onClick={handleGoogleAuth}
                    disabled={isSubmitting}
                    whileHover={{ opacity: 0.9, scale: 1.03 }}
                    whileTap={{ opacity: 1, scale: 0.98 }}
                    className='w-full flex items-center justify-center gap-3 py-3 bg-black text-white rounded-full shadow-md disabled:opacity-70 disabled:cursor-not-allowed'>
                    <FcGoogle size={20} />
                    {isSubmitting ? "Please wait..." : "Continue with Google"}


                </Motion.button>
            </Motion.div>


        </div>
    )
}

export default Auth
