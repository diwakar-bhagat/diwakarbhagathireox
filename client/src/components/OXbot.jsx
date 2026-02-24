import React, { useEffect, useRef, useState } from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { FaPaperPlane, FaTimes } from "react-icons/fa";
import axios from "axios";
import { ServerUrl } from "../App";
import {
    toggleBot,
    closeBot,
    setThinking,
    addMessage,
    setContext,
} from "../redux/oxbotSlice";

const triggerMotion = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    whileHover: { scale: 1.06 },
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

const panelMotion = {
    initial: {
        x: -60,
        y: 20,
        opacity: 0,
        rotate: -6,
        scale: 0.95,
    },
    animate: {
        x: 0,
        y: 0,
        opacity: 1,
        rotate: 0,
        scale: 1,
    },
    exit: {
        x: -40,
        opacity: 0,
        scale: 0.95,
    },
    transition: {
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
    },
};

const dotAnimation = {
    animate: {
        opacity: [0.3, 1, 0.3],
        y: [0, -3, 0],
    },
    transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut",
    },
};

export default function OXbot() {
    const dispatch = useDispatch();
    const location = useLocation();
    const { userData } = useSelector((state) => state.user);
    const { isOpen, isThinking, messages, context } = useSelector(
        (state) => state.oxbot
    );

    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    // Auto-update context when route changes
    useEffect(() => {
        dispatch(
            setContext({
                route: location.pathname,
                tier: userData?.credits > 0 ? "Pro" : "Free",
            })
        );
    }, [location.pathname, userData, dispatch]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isThinking, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;

        const userMsg = input.trim();
        setInput("");
        dispatch(addMessage({ role: "user", content: userMsg }));
        dispatch(setThinking(true));

        try {
            const response = await axios.post(
                `${ServerUrl}/api/oxbot/chat`,
                {
                    message: userMsg,
                    context,
                },
                { withCredentials: true }
            );

            dispatch(addMessage({ role: "assistant", content: response.data.reply }));
        } catch (error) {
            console.error("OXbot failed", error);
            dispatch(
                addMessage({
                    role: "assistant",
                    content: "Sorry, I am having trouble connecting right now.",
                })
            );
        } finally {
            dispatch(setThinking(false));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-[999] flex flex-col items-start pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <Motion.div
                        {...panelMotion}
                        style={{ transformOrigin: "bottom left" }}
                        className="pointer-events-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-700/50 shadow-2xl rounded-2xl w-[90vw] max-w-[380px] h-[520px] mb-4 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold italic rotate-[-6deg]">
                                    OX
                                </div>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">
                                    OXbot
                                </span>
                            </div>
                            <button
                                onClick={() => dispatch(closeBot())}
                                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-400 dark:text-gray-500 mt-20 text-sm">
                                    Hi, I'm OXbot. How can I help you?
                                </div>
                            )}
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user"
                                                ? "bg-emerald-500 text-white rounded-tr-sm"
                                                : "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                                        <Motion.div
                                            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                                            {...dotAnimation}
                                        />
                                        <Motion.div
                                            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                                            {...dotAnimation}
                                            transition={{ ...dotAnimation.transition, delay: 0.2 }}
                                        />
                                        <Motion.div
                                            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
                                            {...dotAnimation}
                                            transition={{ ...dotAnimation.transition, delay: 0.4 }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white/50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700/50">
                            <div className="flex items-end gap-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 ring-emerald-500/50 transition">
                                <textarea
                                    className="flex-1 bg-transparent resize-none max-h-32 text-sm px-2 py-1 outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
                                    rows={Math.min(3, input.split("\n").length || 1)}
                                    placeholder="Ask OXbot..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isThinking}
                                    className="p-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition self-end"
                                >
                                    <FaPaperPlane size={12} />
                                </button>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger */}
            <Motion.button
                {...triggerMotion}
                onClick={() => dispatch(toggleBot())}
                className="pointer-events-auto bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent pointer-events-none" />
                <span className="font-bold text-xl italic text-emerald-600 dark:text-emerald-400 -rotate-6">
                    OX
                </span>
            </Motion.button>
        </div>
    );
}
