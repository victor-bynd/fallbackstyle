import React from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import multiLanguageVersion from '../multi-language/version.json';
import brandFontVersion from '../brand-font/version.json';

import { useState } from 'react';
import { usePersistence } from '../../shared/context/usePersistence';
import ResetConfirmModal from '../../shared/components/ResetConfirmModal';

const LandingPage = () => {
    const { resetApp } = usePersistence();
    const [showResetModal, setShowResetModal] = useState(false);

    const handleGlobalReset = async () => {
        await resetApp('all'); // Reset both multi-language and brand-font tools
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-center mb-24"
                >

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-900">
                        Fallback Style
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-light">
                        Typography tools for advanced fallback font orchestration.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {/* Tool 1: Multi-language Fallback */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col h-full"
                    >
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                </div>
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                                    v{multiLanguageVersion.version}
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                Multi-language Fallback
                            </h3>
                            <p className="text-slate-500 leading-relaxed text-base min-h-[80px]">
                                Orchestrate typography across languages. Manage fallback chains, line-height overrides, and system font stacks for a consistent global design system.
                            </p>
                        </div>

                        <div className="mt-auto">
                            <Link
                                to="/multi-language"
                                className="inline-flex items-center justify-center w-full px-6 py-3.5 text-sm font-bold text-white transition-all bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.98]"
                            >
                                Launch Tool
                                <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Tool 2: Brand Font Fallback */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-emerald-200 transition-all hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col h-full"
                    >
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                                    v{brandFontVersion.version}
                                </span>
                            </div>

                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">
                                Brand Font Fallback
                            </h3>
                            <p className="text-slate-500 leading-relaxed text-base min-h-[80px]">
                                Eliminate CLS and FOUT. Match fallback font metrics to your brand typeface for seamless loading and performance optimization.
                            </p>
                        </div>

                        <div className="mt-auto">
                            <Link
                                to="/brand-font"
                                className="inline-flex items-center justify-center w-full px-6 py-3.5 text-sm font-bold text-white transition-all bg-emerald-600 rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 active:scale-[0.98]"
                            >
                                Launch Tool
                                <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 w-full py-6 px-8 border-t border-slate-200 bg-slate-50 z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-400 text-sm">
                        © {new Date().getFullYear()} Fallback Style. All rights reserved.
                    </p>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-full hover:bg-rose-50"
                        title="Reset Application"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>

            <ResetConfirmModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
                onConfirm={handleGlobalReset}
            />
        </div>
    );
};

export default LandingPage;
