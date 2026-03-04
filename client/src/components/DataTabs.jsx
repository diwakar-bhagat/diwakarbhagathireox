import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DataTabs({ tabs = [] }) {
    const [activeTab, setActiveTab] = useState(0);

    if (!tabs || tabs.length === 0) return null;

    return (
        <div className="w-full flex flex-col gap-6">
            {/* Segmented Control */}
            <div className="relative flex items-center p-1 bg-white/[0.02] border border-white/5 rounded-2xl w-full max-w-fit mx-auto backdrop-blur-md">
                {tabs.map((tab, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx)}
                        className={`relative px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors z-10 ${activeTab === idx ? "text-white" : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        {activeTab === idx && (
                            <motion.div
                                layoutId="tab-indicator"
                                className="absolute inset-0 bg-white/10 rounded-xl"
                                initial={false}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-20">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content Panel */}
            <div className="relative w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="w-full"
                    >
                        {tabs[activeTab].content}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
