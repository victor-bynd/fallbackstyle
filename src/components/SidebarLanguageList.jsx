import React, { useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import languagesData from '../data/languages.json';
import { getLanguageGroup, LANGUAGE_GROUP_SHORT_NAMES } from '../utils/languageUtils';

const SidebarLanguageList = ({
    activeTab,
    setActiveTab,
    selectedGroup,
    configuredLanguages,
    // supportedLanguageIds, // No longer used directly for list, logic uses filtered list
    mappedLanguageIds,

    highlitLanguageId,
    setHighlitLanguageId,
    primaryLanguages = [],
    searchQuery,
    expandedGroups,
    setExpandedGroups,
    fontFilter, // New prop
    fonts, // New prop
    primaryFontOverrides, // New prop
    fallbackFontOverrides // New prop
}) => {
    // const [expandedGroups, setExpandedGroups] = useState({}); // Lifted to App

    // Formatting helper
    const formatLanguageName = (name) => {
        const parts = name.split(' - ');
        if (parts.length < 2) return name;
        // eslint-disable-next-line no-control-regex
        const isLatin1 = /^[\u0000-\u00FF\s]+$/.test(parts[0]);
        return !isLatin1 ? parts[1] : name;
    };

    // 1. Get and sort languages
    const languagesToList = useMemo(() => {
        const list = (configuredLanguages || [])
            .map(id => languagesData.find(l => l.id === id))
            .filter(Boolean);

        return list.sort((a, b) => {
            const aIsPrimary = primaryLanguages.includes(a.id) || (primaryLanguages.length === 0 && a.id === 'en-US');
            const bIsPrimary = primaryLanguages.includes(b.id) || (primaryLanguages.length === 0 && b.id === 'en-US');
            if (aIsPrimary && !bIsPrimary) return -1;
            if (!aIsPrimary && bIsPrimary) return 1;
            return 0;
        });
    }, [configuredLanguages, primaryLanguages]);

    // 2. Filter and Group by Region
    const groupedList = useMemo(() => {
        const filtered = (languagesToList || []).filter(lang => {
            // 0. Search Filter (takes precedence)
            if (searchQuery) { // searchQuery from props
                return lang.name.toLowerCase().includes(searchQuery.toLowerCase());
            }

            // 1. Font Filter (New)
            if (fontFilter && fontFilter.length > 0) {
                const langPrimary = primaryFontOverrides?.[lang.id];
                const langFallback = fallbackFontOverrides?.[lang.id];

                const getIds = (val) => {
                    if (!val) return [];
                    if (typeof val === 'string') return [val];
                    if (typeof val === 'object') return Object.values(val); // fallback overrides can be object
                    return [];
                };

                const allIds = [...getIds(langPrimary), ...getIds(langFallback)];
                const hasMatch = allIds.some(fid => {
                    const f = fonts.find(font => font.id === fid);
                    return f && (f.fileName || f.name) && fontFilter.includes(f.fileName || f.name);
                });

                if (!hasMatch) return false;
            }

            const isPrimary = primaryLanguages.includes(lang.id) || (primaryLanguages.length === 0 && lang.id === 'en-US');
            const isTargeted = mappedLanguageIds?.includes(lang.id);
            const group = getLanguageGroup(lang);

            if (selectedGroup === 'ALL') return true;
            if (selectedGroup === 'MAPPED') return isTargeted || isPrimary;
            if (selectedGroup === 'UNMAPPED') return !isTargeted && !isPrimary;
            return group === selectedGroup;
        });

        // Group the filtered list
        const groups = {};
        filtered.forEach(lang => {
            const g = getLanguageGroup(lang);
            if (!groups[g]) groups[g] = [];
            groups[g].push(lang);
        });

        return groups;
    }, [languagesToList, selectedGroup, mappedLanguageIds, primaryLanguages, searchQuery, fontFilter, primaryFontOverrides, fallbackFontOverrides, fonts]);

    // Update expanded groups when selectedGroup changes or search is active
    useEffect(() => {
        if (searchQuery) {
            // Expand all groups that have results
            const allGroups = Object.keys(groupedList).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {});
            setExpandedGroups(allGroups);
        } else if (selectedGroup !== 'ALL' && selectedGroup !== 'MAPPED' && selectedGroup !== 'UNMAPPED') {
            setExpandedGroups(prev => ({ ...prev, [selectedGroup]: true }));
        }
    }, [selectedGroup, searchQuery, groupedList, setExpandedGroups]);

    const isSidebarInteraction = React.useRef(false); // Ref to track source of change

    // 3. Effect to Scroll to Active Language
    const lastScrolledId = React.useRef(null);

    useEffect(() => {
        // Determine the ID of the language we want to scroll to
        // If activeTab is 'primary', we scroll to the first primary language or English
        let targetLangId = activeTab;

        if (activeTab === 'primary' || activeTab === 'ALL') {
            // If ALL, we typically don't scroll to a specific lang unless specified
            if (activeTab === 'ALL' && !highlitLanguageId) return;

            if (activeTab === 'primary' || highlitLanguageId === 'primary') {
                // Find the first primary language effectively
                const primaryId = primaryLanguages[0] || 'en-US';
                targetLangId = primaryId;
            }
        }

        // Highlighting shouldn't trigger scroll/expansion, only visual highlighting
        // if (highlitLanguageId && highlitLanguageId !== 'primary') {
        //     targetLangId = highlitLanguageId;
        // }

        if (!targetLangId || targetLangId === 'ALL') return;

        const hasChanged = targetLangId !== lastScrolledId.current;
        lastScrolledId.current = targetLangId;

        // SKIP SCROLL if this update was triggered by clicking the sidebar itself
        if (isSidebarInteraction.current) {
            isSidebarInteraction.current = false; // Reset flag
            return;
        }

        // Only scroll/expand if the target has actually changed
        if (!hasChanged) return;

        // Find the language object to get its group
        const langConfig = languagesData.find(l => l.id === targetLangId);
        if (langConfig) {
            const group = getLanguageGroup(langConfig);

            // 1. Expand the group if needed
            setExpandedGroups(prev => {
                if (prev[group]) return prev; // Already expanded
                return { ...prev, [group]: true };
            });

            // 2. Scroll into view (with a small delay to allow expansion render)
            // Retry mechanism ensures we catch the element even if render is delayed
            let attempts = 0;
            const maxAttempts = 10; // 500ms max

            // Clear potential previous interval
            if (window._sidebarScrollInterval) clearInterval(window._sidebarScrollInterval);

            window._sidebarScrollInterval = setInterval(() => {
                const element = document.getElementById(`sidebar-lang-${targetLangId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    clearInterval(window._sidebarScrollInterval);
                    window._sidebarScrollInterval = null;
                } else {
                    attempts++;
                    if (attempts >= maxAttempts) {
                        clearInterval(window._sidebarScrollInterval);
                        window._sidebarScrollInterval = null;
                    }
                }
            }, 50);

        }

    }, [activeTab, highlitLanguageId, primaryLanguages, setExpandedGroups]);


    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !(prev[groupKey] ?? true)
        }));
    };

    const groupKeys = Object.keys(groupedList);

    if (groupKeys.length === 0) {
        return (
            <div className="text-[11px] text-slate-400 italic px-2 py-1">
                No languages in this group
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 w-full">
            {groupKeys.map(groupKey => {
                const languages = groupedList[groupKey];
                const isExpanded = expandedGroups[groupKey] ?? true; // Default to expanded
                const shortName = LANGUAGE_GROUP_SHORT_NAMES[groupKey] || groupKey;

                return (
                    <div key={groupKey} className="flex flex-col gap-1">
                        {/* Group Header */}
                        <button
                            onClick={() => toggleGroup(groupKey)}
                            className={`flex items-center justify-between w-full px-1 py-1 group/header transition-colors ${isExpanded ? 'text-slate-800' : 'text-slate-400'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                {shortName}
                            </span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className={`w-3.5 h-3.5 transition-all duration-200 ${isExpanded ? 'rotate-180 text-emerald-500' : 'text-slate-300'}`}
                            >
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                            </svg>
                        </button>

                        {/* Group Content */}
                        <AnimatePresence initial={false}>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    className="flex flex-col gap-1 overflow-hidden"
                                >
                                    {languages.map(lang => {
                                        const isPrimary = primaryLanguages.includes(lang.id) || (primaryLanguages.length === 0 && lang.id === 'en-US');
                                        // If we have a specific highlight, use it. 
                                        // Otherwise, if in 'primary' mode, all primary languages are technically 'selected' (scope), 
                                        // but we only want to highlight the specific one being interacted with if available.
                                        const isSelected = activeTab === lang.id || (activeTab === 'primary' && isPrimary && (!highlitLanguageId || highlitLanguageId === lang.id));
                                        const isHighlighted = highlitLanguageId === lang.id;
                                        const isActive = isSelected || isHighlighted;

                                        return (
                                            <div key={lang.id} className="group relative flex items-center">
                                                <button
                                                    id={`sidebar-lang-${lang.id}`}
                                                    onClick={() => {
                                                        isSidebarInteraction.current = true; // Mark interaction source


                                                        if (isActive) {
                                                            if (setHighlitLanguageId) setHighlitLanguageId(null);
                                                            setActiveTab('ALL');
                                                        } else {
                                                            if (setHighlitLanguageId) setHighlitLanguageId(lang.id);
                                                            setActiveTab(isPrimary ? 'primary' : lang.id);
                                                        }
                                                    }}
                                                    className={`
                                                    w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border
                                                    flex items-center justify-between
                                                    ${isActive
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm'
                                                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600'
                                                        }
                                                `}
                                                >
                                                    <span className="flex items-center gap-1.5 min-w-0">
                                                        <span className="truncate">
                                                            {formatLanguageName(lang.name)}
                                                        </span>
                                                        {isPrimary && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 shrink-0">
                                                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
};

export default SidebarLanguageList;
