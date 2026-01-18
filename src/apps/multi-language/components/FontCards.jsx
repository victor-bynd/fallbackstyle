import { useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../../../shared/context/useTypo';
// Unused import removed

import LanguageSingleSelectModal from './LanguageSingleSelectModal';
import LanguageMultiSelectModal from './LanguageMultiSelectModal';
import FontSelectionModal from './FontSelectionModal';
import { createFontUrl, parseFontFile } from '../../../shared/services/FontLoader';
import InfoTooltip from '../../../shared/components/InfoTooltip';
import { getLanguageGroup } from '../../../shared/utils/languageUtils';

import languagesData from '../../../shared/data/languages.json';
import FontCard from './FontCard';
import { TOOLTIPS } from '../../../shared/constants/tooltips';


const FontCards = ({ activeTab, selectedGroup = 'ALL', highlitLanguageId, setHighlitLanguageId, readOnly = false }) => {
    const {
        fonts: rawFonts,
        activeFont,
        setActiveFont,
        updateFontWeight,
        toggleFontVisibility,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        addFallbackFonts,
        addStrictlyMappedFonts,

        weight,
        fontScales,
        lineHeight,
        getFontColor,
        updateFontColor,
        getEffectiveFontSettings,
        fallbackFontOverrides,
        primaryFontOverrides,
        addLanguageSpecificPrimaryFont,
        addLanguageSpecificFont,
        setFontScales,
        setIsFallbackLinked,
        setLineHeight,
        setActiveConfigTab,
        fallbackFont,
        setFallbackFont,
        systemFallbackOverrides,
        updateSystemFallbackOverride,
        resetSystemFallbackOverride,

        normalizeFontName,
        // Unused variable removed
        setFallbackFontOverride,
        linkFontToLanguage,
    } = useTypo() || {}; // Safety: protect against null context

    const fonts = useMemo(() => rawFonts || [], [rawFonts]);



    const [mappingFontId, setMappingFontId] = useState(null);

    const langOverrides = activeTab !== 'primary' && activeTab !== 'ALL' ? (systemFallbackOverrides[activeTab] || {}) : {};
    const isInheritedSystemGroup = activeTab !== 'primary' && activeTab !== 'ALL' && Object.keys(langOverrides).length === 0;

    const effectiveFallbackFont = langOverrides.type || fallbackFont;
    // Unused variables removed

    const handleSystemFallbackChange = (type) => {
        if (activeTab === 'primary' || activeTab === 'ALL') {
            setFallbackFont(type);
        } else {
            updateSystemFallbackOverride(activeTab, 'type', type);
        }
    };

    // Add Font State
    const [showFontSelector, setShowFontSelector] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const fileInputRef = useRef(null);

    const handleExistingFontSelect = (fontId) => {
        if (fontId === 'legacy') {
            // Handle legacy if needed, or just ignore for now as it's targeted
            // Actually addLanguageSpecificFont supports handling specific IDs.
        }
        addLanguageSpecificFont(fontId, activeTab);
        setShowFontSelector(false);
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Check for duplicates
        const existingFontNames = new Set(
            (fonts || []).map(f => f && normalizeFontName(f.fileName || f.name))
        );

        const uniqueFiles = [];
        let duplicateCount = 0;

        Array.from(files).forEach(file => {
            const normalizedName = normalizeFontName(file.name);
            if (existingFontNames.has(normalizedName)) {
                duplicateCount++;
                console.warn(`Skipping duplicate file: ${file.name} `);
            } else {
                uniqueFiles.push(file);
            }
        });

        if (duplicateCount > 0) {
            alert(`Skipped ${duplicateCount} duplicate font(s).`);
        }

        if (uniqueFiles.length === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            const promises = uniqueFiles.map(async (file) => {
                try {
                    const { font, metadata } = await parseFontFile(file);
                    const url = createFontUrl(file);
                    const fontId = `fallback - ${Date.now()} -${Math.random().toString(36).substr(2, 9)} `;

                    return {
                        id: fontId,
                        type: 'fallback',
                        fontObject: font,
                        fontUrl: url,
                        fileName: file.name,
                        name: file.name,
                        axes: metadata.axes,
                        isVariable: metadata.isVariable,
                        staticWeight: metadata.staticWeight ?? null
                    };
                } catch (err) {
                    console.error(`Error parsing font ${file.name}: `, err);
                    return null;
                }
            });

            const results = await Promise.all(promises);
            const validFonts = results.filter(f => f !== null);

            if (validFonts.length > 0) {
                if (isLanguageSpecificView && activeTab !== 'primary') {
                    // Directly add to language targeted fonts without adding to global list first
                    addStrictlyMappedFonts(validFonts, activeTab);
                } else {
                    addFallbackFonts(validFonts);
                    // If in global view, we assume user adds to global stack, so no auto-assignment to specific language logic needed here
                    // unless we wanted to auto-assign it to activeTab if it was not ALL/primary, but here we handle that in the if-block.
                }
            }
        } catch (err) {
            console.error('Error uploading fonts:', err);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    const handleMapLanguage = (fontId) => {
        setMappingFontId(fontId);
    };

    const handleLanguageSelected = (langId) => {
        if (mappingFontId && langId) {
            // Check if this is an existing font that should just be linked
            // (like system fonts or existing fallbacks)
            const existingFont = fonts.find(f => f && f.id === mappingFontId);

            if (existingFont) {
                // If it's a primary font being mapped -> Create a Primary Override
                if (existingFont.type === 'primary') {
                    addLanguageSpecificPrimaryFont(langId);
                }
                // If it's a system font -> Use fallback override
                else if (!existingFont.fontObject) {
                    setFallbackFontOverride(langId, mappingFontId);
                } else {
                    // It's a loaded fallback font - LINK IT (Map to itself)
                    // This enables inheritance until manually overridden
                    linkFontToLanguage(mappingFontId, langId);
                }
            } else {
                // Fallback for unknown ID?
                addLanguageSpecificFont(mappingFontId, langId);
            }
        }
        // setMappingFontId(null); // Managed by caller now for multi-select
    };


    const isAllTab = activeTab === 'ALL';
    // 'primary' is the English/Global tab. It should be editable by default and show no inheritance overlay.
    const isLanguageSpecificView = !isAllTab;
    const {
        primary,
        globalPrimary,
        fontListToRender,
        unmappedFonts,
        systemFonts,
        isInheritedPrimary,
        overriddenOriginalIds,
        consolidatedIdsMap
    } = useMemo(() => {
        // --- UNIVERSAL CONSOLIDATION MAP ---
        // We group ALL fonts by name/filename once, so that any card (in any view)
        // knows about ALL other IDs that share the same font identity.
        // This ensures language tags (tabs) don't disappear in specific views.
        const universalIdsMap = {}; // font.id -> [all matching ids]
        const nameToAllIds = new Map();

        fonts.forEach(f => {
            if (!f) return;
            const key = (f.fileName || f.name || f.id || '').toLowerCase();
            if (!nameToAllIds.has(key)) nameToAllIds.set(key, []);
            nameToAllIds.get(key).push(f.id);
        });

        fonts.forEach(f => {
            if (!f) return;
            const key = (f.fileName || f.name || f.id || '').toLowerCase();
            universalIdsMap[f.id] = nameToAllIds.get(key);
        });

        const p = fonts.find(f => f && f.type === 'primary' && !f.isPrimaryOverride);
        const sFonts = fonts.filter(f => f && !f.fontObject && !f.isLangSpecific && !f.isClone);

        // Calculate Global Fallbacks (Unassigned/Inheritable)
        const validFallbacks = fonts.filter(f =>
            f &&
            f.type === 'fallback' &&
            f.fontObject &&
            !f.isClone &&
            !f.isPrimaryOverride
        );

        // Include clones for Mapped/Targeted list
        const allFallbacks = fonts.filter(f =>
            f &&
            f.type === 'fallback' &&
            f.fontObject
        );

        // Get all font IDs that are mapped to any language (as overrides)
        const mappedFontIds = new Set();
        // Add fallback overrides
        Object.values(fallbackFontOverrides || {}).forEach(val => {
            if (typeof val === 'string') {
                mappedFontIds.add(val);
            } else if (val && typeof val === 'object') {
                // Add keys (Original Global Font IDs) so they appear as Mapped
                Object.keys(val).forEach(id => mappedFontIds.add(id));
                // Add values (Cloned Font IDs) - technical correctness
                Object.values(val).forEach(id => mappedFontIds.add(id));
            }
        });
        // Add primary overrides
        Object.values(primaryFontOverrides || {}).forEach(fontId => {
            if (fontId) mappedFontIds.add(fontId);
        });

        if (isAllTab) {
            // "ALL" Tab: Mapped are those mapped to ANY language
            // FIX: Only show strictly language-specific fonts OR Primary Overrides in "Mapped" section. 
            // Global fonts that are mapped should stay in "General Fallbacks" and use the Tab UI.
            // Use allFallbacks to include Clones (language-specific overrides)
            let targeted = allFallbacks.filter(f => mappedFontIds.has(f.id));

            // NEW: Filter Primary Font out of Mapped list (prevent Primary from appearing in Mapped section)
            if (p) {
                const pName = (p.fileName || p.name || "").toLowerCase();
                targeted = targeted.filter(f => {
                    // Check ID match (unlikely if types differ, but safe)
                    if (f.id === p.id) return false;

                    // If it is a Primary Override, we WANT to show it in Mapped List
                    if (f.isPrimaryOverride) return true;

                    // Check Name match
                    const fName = (f.fileName || f.name || "").toLowerCase();
                    if (fName === pName) return false;
                    return true;
                });
            }

            // NEW: Filter targeted fonts by selectedGroup if not ALL
            if (selectedGroup !== 'ALL' && selectedGroup !== 'MAPPED') {
                targeted = targeted.filter(f => {
                    // Check if this font is mapped to any language in the selected group
                    const fontLangs = [];
                    Object.entries(primaryFontOverrides || {}).forEach(([langId, fontId]) => {
                        if (fontId === f.id) fontLangs.push(langId);
                    });
                    Object.entries(fallbackFontOverrides || {}).forEach(([langId, val]) => {
                        if (typeof val === 'string') {
                            if (val === f.id) fontLangs.push(langId);
                        } else if (val && typeof val === 'object') {
                            if (val[f.id]) fontLangs.push(langId);
                        }
                    });

                    return fontLangs.some(langId => {
                        const langData = languagesData.find(l => l && l.id === langId);
                        return getLanguageGroup(langData) === selectedGroup;
                    });
                });
            }

            // Show as unmapped/general ONLY if not mapped
            // FIX: Allow fonts that are GLOBAL (!isLangSpecific) to appear here even if they are mapped to specific languages
            let unmapped = validFallbacks.filter(f => !mappedFontIds.has(f.id) || !f.isLangSpecific);

            // NEW: Deduplicate Mapped Fonts Grouping (Visual Only)
            // Group 'targeted' fonts by filename, and consolidate their IDs.
            // This prevents duplicate cards for the "same" font (clones/strict mappings)
            // while allowing the single card to show tags for ALL its IDs.
            const uniqueTargeted = [];
            const targetedNames = new Map(); // Name -> Representative Font
            // We use universalIdsMap for the tags, but we still need to know which ones are "Mapped" 
            // for the current view's grouping logic if we were filtering them.
            // But actually, we can just use universalIdsMap[f.id] directly in the render!

            targeted.forEach(f => {
                const key = (f.fileName || f.name || f.id).toLowerCase();
                if (!targetedNames.has(key)) {
                    targetedNames.set(key, f);
                    uniqueTargeted.push(f);
                }
            });

            // (Augmentation loop removed)


            // Restoration: Deduplicate Unmapped Fonts
            // 1. Remove if filename matches any MAPPED font (prevent "Ghost" duplicates) unless it's Global
            // 2. Remove duplicates within unmapped list (keep first)
            // 3. Remove if filename matches Primary Font

            // Re-calculate targeted names set for checking unmapped collisions
            // We can use targetedNames Map keys from above

            const seenUnmappedIds = new Set(); // Changed from Names to IDs
            const primaryId = p ? p.id : null;
            // Unused variable removed

            unmapped = unmapped.filter(f => {
                // Filter out if matches Primary Font ID
                if (primaryId && f.id === primaryId) return false;

                // Filter out if matches Primary Name (Robust)
                const fName = normalizeFontName(f.fileName || f.name);
                const pNameNormalized = normalizeFontName(p.fileName || p.name);
                if (pNameNormalized && fName === pNameNormalized) return false;

                // Filter out if matches any Mapped Font ID or Name (already in Targeted section)
                if (targetedNames.has((f.fileName || f.name || f.id).toLowerCase())) return false;

                if (seenUnmappedIds.has(f.id)) return false;
                seenUnmappedIds.add(f.id);
                return true;
            });

            return {
                primary: p,
                globalPrimary: p,
                fontListToRender: uniqueTargeted, // Use deduplicated list
                unmappedFonts: unmapped,
                systemFonts: sFonts,
                isInheritedPrimary: false,
                isLanguageSpecificList: false,
                consolidatedIdsMap: universalIdsMap // Use universal map
            };
        }

        // --- NEW DEDUPLICATION LOGIC ---
        // Moved inside the useMemo result calculation? No, the return was above.
        // We need to modify the 'targeted' list BEFORE returning in the if(isAllTab) block above.
        // Let's rewrite the return block of isAllTab to include deduplication.


        // Language specific view (includes 'primary'/English)
        let overrideFontId = primaryFontOverrides[activeTab];

        // Fix: Mapped Languages store Primary Font overrides in `fallbackFontOverrides` (keyed by original Primary ID)
        if (!overrideFontId && p && fallbackFontOverrides[activeTab] && typeof fallbackFontOverrides[activeTab] === 'object') {
            overrideFontId = fallbackFontOverrides[activeTab][p.id];
        }

        const overrideFont = fonts.find(f => f && f.id === overrideFontId);

        // UNIFIED LIST GENERATION
        // We want to render the "Global Stack" order, but swapping in overrides where they exist.
        // This ensures the list doesn't jump around or separate into "Mapped" vs "Inherited",
        // keeping the UI stable (and Slider working).

        // 1. Identification of Base Global Fonts (The "Slots")
        // These are effectively all valid global fallbacks + defaults.
        const baseGlobalFonts = validFallbacks; // validFallbacks excludes clones and has fontObject
        // System fonts are also "Base" but they are usually separated.
        // Wait, validFallbacks excludes system fonts (f.fontObject check).
        // System fonts are separate in sFonts.

        // So we focus on the "Uploaded Fallbacks" stack first.

        // 2. Map Base Fonts to Effective Fonts (Global or Override)
        const rawOverrides = fallbackFontOverrides[activeTab] || {};
        const overriddenOriginalIds = new Set(); // Re-introduced definition

        const unifiedUploadedFonts = [];
        baseGlobalFonts.forEach(baseFont => {
            // Check for override
            let overrideId = null;
            if (typeof rawOverrides === 'string') {
                if (rawOverrides === baseFont.id) overrideId = rawOverrides; // Legacy/Direct
            } else {
                overrideId = rawOverrides[baseFont.id] || null;
            }

            if (overrideId) {
                const override = fonts.find(f => f && f.id === overrideId);
                if (override) {
                    overriddenOriginalIds.add(baseFont.id); // Track it
                    unifiedUploadedFonts.push(override);
                }
            }
            // If no override, we do nothing (it will naturally fall into inheritedFallbacks)
        });

        const extraMappedFonts = [];
        if (typeof rawOverrides === 'object') {
            Object.entries(rawOverrides).forEach(([originalId, overrideId]) => {
                overriddenOriginalIds.add(originalId);

                // If the override font is not already in the unifiedUploadedFonts list,
                // it needs to be added to extraMappedFonts. This covers:
                // 1. Overridden system fonts
                // 2. Strictly mapped fonts (clones with no global base)
                // 3. Any other "orphan" mappings
                const isAlreadyIncluded = unifiedUploadedFonts.some(uf => uf.id === overrideId);
                if (!isAlreadyIncluded) {
                    const overrideFont = fonts.find(f => f && f.id === overrideId);
                    if (overrideFont) {
                        extraMappedFonts.push(overrideFont);
                    }
                }
            });
        } else if (typeof rawOverrides === 'string') {
            // Handle single legacy mapping or direct mapping (Map Font modal)
            overriddenOriginalIds.add(rawOverrides);

            const f = fonts.find(font => font && font.id === rawOverrides);
            if (f) {
                const isAlreadyIncluded = unifiedUploadedFonts.some(uf => uf.id === f.id);
                if (!isAlreadyIncluded) {
                    extraMappedFonts.push(f);
                }
            }
        }

        const fullUnifiedList = [...unifiedUploadedFonts, ...extraMappedFonts];

        // Inherited Global Fallbacks: Valid globals that are NOT overridden in this language AND (NOT mapped elsewhere OR are Global)
        // Also apply deduplication to inherited fallbacks to be safe
        let inheritedFallbacks = validFallbacks.filter(f =>
            !overriddenOriginalIds.has(f.id) &&
            (!mappedFontIds.has(f.id) || !f.isLangSpecific)
        );

        // Exclude fonts that are already in the "Targeted" list for this language
        // This handles cases where a font is manually mapped (thus in fullUnifiedList)
        // AND it exists in the global fallback list. We don't want to show it again as "Auto".
        const targetedNames = new Set(fullUnifiedList.map(f => (f.fileName || f.name || "").toLowerCase()));

        // Get Primary Font Name (normalized)
        // Unused variable removed

        const seenInheritedNames = new Set();
        inheritedFallbacks = inheritedFallbacks.filter(f => {
            const name = (f.fileName || f.name || "");
            const normalizedName = normalizeFontName(name);

            // Filter out if matches Primary Font (Robust)
            const pNameNormalized = normalizeFontName(p?.fileName || p?.name);
            if (pNameNormalized && normalizedName === pNameNormalized) return false;

            // Check against specific targeted fonts for this language
            if (targetedNames.has(name.toLowerCase())) return false;

            if (seenInheritedNames.has(normalizedName)) return false;
            seenInheritedNames.add(normalizedName);
            return true;
        });

        // Filter out mapped fonts that are effectively the primary font (redundant display)
        const effectivePrimary = overrideFont || p;
        const effectivePrimaryName = effectivePrimary ? (effectivePrimary.fileName || effectivePrimary.name) : null;

        const filteredLanguageSpecificFonts = fullUnifiedList.filter(f => {
            // If explicit legacy "Primary Map" flag
            if (f.isPrimaryMap) return false;

            // If it is the exact same ID as what is shown in Primary Card
            if (effectivePrimary && f.id === effectivePrimary.id) return false;

            // NEW: If it matches the filename of the effective primary (prevent clone duplicates in list)
            if (effectivePrimaryName) {
                const fName = (f.fileName || f.name || "").toLowerCase();
                const pName = (effectivePrimaryName || "").toLowerCase();
                if (fName === pName) return false;
            }

            return true;
        });

        const uniqueLanguageFonts = [];
        const languageFontNames = new Map();

        filteredLanguageSpecificFonts.forEach(f => {
            const key = (f.fileName || f.name || f.id).toLowerCase();
            if (!languageFontNames.has(key)) {
                languageFontNames.set(key, f);
                uniqueLanguageFonts.push(f);
            }
        });

        return {
            primary: overrideFont || p,
            globalPrimary: p,
            isInheritedPrimary: !overrideFont && activeTab !== 'primary' && !isAllTab,
            systemFonts: sFonts,
            fontListToRender: uniqueLanguageFonts,
            unmappedFonts: inheritedFallbacks,
            overriddenOriginalIds,
            consolidatedIdsMap: universalIdsMap, // Use universal map
            isLanguageSpecificList: true
        };
    }, [fonts, activeTab, isAllTab, primaryFontOverrides, fallbackFontOverrides, selectedGroup, normalizeFontName]);





    return (
        <div className="pb-6 space-y-4">
            {/* Primary Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Primary Font
                    </span>
                    {!isAllTab && activeTab !== 'primary' && (
                        <InfoTooltip
                            content={TOOLTIPS.STYLING_OVERRIDES}
                        />
                    )}
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                {primary && (
                    <FontCard
                        font={primary}
                        isActive={activeFont === (primary ? primary.id : null)}
                        globalWeight={weight}
                        globalLineHeight={lineHeight}
                        setGlobalLineHeight={setLineHeight}
                        getFontColor={getFontColor}
                        updateFontColor={updateFontColor}
                        getEffectiveFontSettings={getEffectiveFontSettings}
                        fontScales={fontScales}
                        lineHeight={lineHeight}
                        updateFallbackFontOverride={updateFallbackFontOverride}
                        resetFallbackFontOverrides={resetFallbackFontOverrides}
                        setActiveFont={setActiveFont}
                        updateFontWeight={updateFontWeight}
                        toggleFontVisibility={toggleFontVisibility}
                        isInherited={isInheritedPrimary}
                        onOverride={() => addLanguageSpecificPrimaryFont(activeTab)}
                        onResetOverride={null}
                        onSelectLanguage={setActiveConfigTab}
                        setHighlitLanguageId={setHighlitLanguageId}
                        activeTab={activeTab}
                        readOnly={readOnly}
                        onMap={null}
                    />
                )}

                {isAllTab && (
                    <div className="px-1 pb-2 pt-1 mt-1">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All Fallback Size Adjust</span>
                            <div className="flex items-center gap-3">
                                {fontScales.fallback !== 100 && (
                                    <button
                                        onClick={() => {
                                            setFontScales(prev => ({ ...prev, fallback: 100 }));
                                            setIsFallbackLinked(false);
                                        }}
                                        className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors font-bold"
                                        title="Reset fallback scale"
                                    >
                                        <span>RESET</span>
                                        <span className="text-xs">↺</span>
                                    </button>
                                )}
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={fontScales.fallback}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFontScales(prev => ({ ...prev, fallback: val }));
                                            setIsFallbackLinked(false);
                                        }}
                                        className="w-10 bg-transparent text-right outline-none text-indigo-600 font-mono text-xs font-bold border-b border-indigo-200 focus:border-indigo-500"
                                    />
                                    <span className="text-indigo-600 font-mono text-[10px]">%</span>
                                </div>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="25"
                            max="300"
                            step="5"
                            value={fontScales.fallback}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setFontScales(prev => ({ ...prev, fallback: val }));
                                setIsFallbackLinked(false);
                            }}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                )}
            </div>

            {(() => {
                const fallbackSection = ((unmappedFonts && unmappedFonts.length > 0) || (systemFonts && systemFonts.length > 0)) && (
                    <div className="space-y-3 pb-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                FALLBACK FONTS
                            </span>
                            <InfoTooltip
                                content={TOOLTIPS.DETARGETING_FONTS}
                            />
                            <div className="h-px flex-1 bg-slate-100"></div>
                        </div>
                        {unmappedFonts.map((font) => (
                            <FontCard
                                key={font.id}
                                font={font}
                                isActive={activeFont === font.id}
                                getFontColor={getFontColor}
                                updateFontColor={updateFontColor}
                                getEffectiveFontSettings={getEffectiveFontSettings}
                                fontScales={fontScales}
                                lineHeight={lineHeight}
                                updateFallbackFontOverride={updateFallbackFontOverride}
                                resetFallbackFontOverrides={resetFallbackFontOverrides}
                                setActiveFont={setActiveFont}
                                updateFontWeight={updateFontWeight}
                                toggleFontVisibility={toggleFontVisibility}
                                isInherited={false}
                                onOverride={null}
                                onMap={(!isAllTab && activeTab !== 'primary') ? (fid) => addLanguageSpecificFont(fid, activeTab) : handleMapLanguage}
                                onResetOverride={null}
                                onSelectLanguage={setActiveConfigTab}
                                setHighlitLanguageId={setHighlitLanguageId}
                                activeTab={activeTab}
                                readOnly={readOnly}
                                consolidatedIds={font && font.id ? consolidatedIdsMap?.[font.id] : []}
                            />
                        ))}
                    </div>
                );

                const targetedSection = (
                    <div className="space-y-3">
                        {(activeTab !== 'primary' || fontListToRender.length > 0) && (
                            <>
                                <div className="flex items-center gap-2 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Mapped Fonts
                                    </span>
                                    <InfoTooltip
                                        content={TOOLTIPS.STYLING_LIMITATIONS}
                                    />
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                </div>
                            </>
                        )}

                        {fontListToRender.length === 0 && isAllTab && (
                            <div className="text-xs text-slate-400 italic px-2 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                No fonts have been targeted yet.
                            </div>
                        )}

                        {fontListToRender.length === 0 && !isAllTab && activeTab !== 'primary' && (
                            <div className="relative group text-xs text-slate-400 italic px-2 py-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col gap-3 items-center justify-center hover:bg-slate-100/50 transition-colors">
                                <span>No font mapped</span>

                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddMenu(!showAddMenu);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-slate-600 font-semibold hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                        </svg>
                                        Add Font
                                    </button>

                                    {showAddMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setShowAddMenu(false)}
                                            />
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAddMenu(false);
                                                        setShowFontSelector(true);
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                                    </svg>
                                                    Select Existing
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAddMenu(false);
                                                        fileInputRef.current?.click();
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                                    </svg>
                                                    Upload New
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {fontListToRender.map((font) => {
                            const isPrimaryClone = globalPrimary &&
                                font.isClone &&
                                (font.fileName === globalPrimary.fileName) &&
                                (font.name === globalPrimary.name);

                            if (font.type === 'primary' || font.isPrimaryMap || isPrimaryClone) {
                                return null;
                            }
                            // Duplicate block removed

                            // Detect if this font is physically 'linked' to the global stock (inherited)
                            // A font is inherited if it is NOT a clone (isLangSpecific is false)
                            // But it appears in this list because it was mapped (via linkFontToLanguage self-reference)
                            const isInheritedMapped = !font.isLangSpecific && !isAllTab;

                            return (
                                <FontCard
                                    key={font.id}
                                    font={font}
                                    isActive={false} // Force unselected look as requested
                                    getFontColor={getFontColor}
                                    updateFontColor={updateFontColor}
                                    getEffectiveFontSettings={getEffectiveFontSettings}
                                    fontScales={fontScales}
                                    lineHeight={lineHeight}
                                    updateFallbackFontOverride={updateFallbackFontOverride}
                                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                                    setActiveFont={setActiveFont}
                                    updateFontWeight={updateFontWeight}
                                    toggleFontVisibility={toggleFontVisibility}
                                    isInherited={isInheritedMapped}
                                    onOverride={isInheritedMapped ? () => addLanguageSpecificFont(font.id, activeTab) : null}
                                    onMap={null} // Remove Map button
                                    // Enable deletion (unmap/remove clone) in language-specific view
                                    onResetOverride={null}
                                    onSelectLanguage={setActiveConfigTab}
                                    setHighlitLanguageId={setHighlitLanguageId}
                                    highlitLanguageId={highlitLanguageId}
                                    activeTab={activeTab}
                                    readOnly={readOnly}
                                    consolidatedIds={consolidatedIdsMap ? consolidatedIdsMap[font.id] : null}
                                />
                            );
                        })}
                    </div>
                );

                if (isAllTab) {
                    return (
                        <>
                            {fallbackSection}
                            {targetedSection}
                        </>
                    );
                } else {
                    return (
                        <>
                            {targetedSection}
                            {fallbackSection}
                        </>
                    );
                }
            })()}

            {/* System Default */}
            <div className="relative group/system p-1 -m-1 rounded-xl transition-all">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Fonts</span>

                        <div className="h-px flex-1 bg-slate-100"></div>

                        {!isAllTab && activeTab !== 'primary' && !isInheritedSystemGroup && !readOnly && (
                            <button
                                onClick={(e) => { e.stopPropagation(); resetSystemFallbackOverride(activeTab); }}
                                className="text-slate-400 hover:text-rose-500 transition-all p-1"
                                title="Reset section to inherited settings"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className="w-4 h-4">
                                    <path d="M198.63,57.37a32,32,0,0,0-45.19-.06L141.79,69.52a8,8,0,0,1-11.58-11l11.72-12.29a1.59,1.59,0,0,1,.13-.13,48,48,0,0,1,67.88,67.88,1.59,1.59,0,0,1-.13.13l-12.29,11.72a8,8,0,0,1-11-11.58l12.21-11.65A32,32,0,0,0,198.63,57.37ZM114.21,186.48l-11.65,12.21a32,32,0,0,1-45.25-45.25l12.21-11.65a8,8,0,0,0-11-11.58L46.19,141.93a1.59,1.59,0,0,0-.13.13,48,48,0,0,0,67.88,67.88,1.59,1.59,0,0,0,.13-.13l11.72-12.29a8,8,0,1,0-11.58-11ZM216,152H192a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16ZM40,104H64a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm120,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V192A8,8,0,0,0,160,184ZM96,72a8,8,0,0,0,8-8V40a8,8,0,0,0-16,0V64A8,8,0,0,0,96,72Z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {systemFonts && systemFonts.length > 0 && (
                        <div className="space-y-3">
                            {systemFonts.map((font) => {
                                const isOverridden = overriddenOriginalIds?.has(font.id);
                                if (!isAllTab && isOverridden) return null;

                                return (
                                    <FontCard
                                        key={font.id}
                                        font={font}
                                        isActive={activeFont === font.id}
                                        getFontColor={getFontColor}
                                        updateFontColor={updateFontColor}
                                        getEffectiveFontSettings={getEffectiveFontSettings}
                                        fontScales={fontScales}
                                        lineHeight={lineHeight}
                                        updateFallbackFontOverride={updateFallbackFontOverride}
                                        resetFallbackFontOverrides={resetFallbackFontOverrides}
                                        setActiveFont={setActiveFont}
                                        updateFontWeight={updateFontWeight}
                                        toggleFontVisibility={toggleFontVisibility}
                                        onSelectLanguage={setActiveConfigTab}
                                        activeTab={activeTab}
                                        isInherited={!isAllTab && activeTab !== 'primary' && !readOnly && !isOverridden}
                                        suppressInheritedOverlay={isInheritedSystemGroup}
                                        onOverride={() => addLanguageSpecificFont(font.id, activeTab)}
                                        onResetOverride={null}
                                        setHighlitLanguageId={setHighlitLanguageId}
                                    />
                                );
                            })}
                        </div>
                    )}

                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => handleSystemFallbackChange('sans-serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${effectiveFallbackFont === 'sans-serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Sans-serif
                        </button>
                        <button
                            onClick={() => handleSystemFallbackChange('serif')}
                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${effectiveFallbackFont === 'serif' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Serif
                        </button>
                    </div>
                </div>

                {isInheritedSystemGroup && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/10 rounded-xl backdrop-blur-[1px] transition-all">
                        <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                            Inherited from Global
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); updateSystemFallbackOverride(activeTab, 'type', fallbackFont); }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95 tracking-wide"
                        >
                            OVERRIDE STYLE
                        </button>
                    </div>
                )}
            </div>

            {
                mappingFontId && (
                    <LanguageMultiSelectModal
                        onClose={() => setMappingFontId(null)}
                        onConfirm={(selectedLangIds) => {
                            selectedLangIds.forEach(langId => handleLanguageSelected(langId));
                            setMappingFontId(null);
                        }}
                        title={(() => {
                            const font = fonts.find(f => f.id === mappingFontId);
                            const name = font ? (font.name || font.fileName || 'Font') : 'Font';
                            return `Map ${name} to Languages`;
                        })()}
                        confirmLabel="Map"
                    />
                )
            }

            {
                showFontSelector && (
                    <FontSelectionModal
                        title={`Select Font for ${activeTab}`}
                        onClose={() => setShowFontSelector(false)}
                        onSelect={handleExistingFontSelect}
                        fontOptions={fonts.map(f => ({
                            id: f.id,
                            label: f.name || f.fileName || 'Untitled',
                            fileName: f.fileName
                        }))}
                        currentFontId={null}
                    />
                )
            }
            <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                multiple
                onChange={handleFileUpload}
            />
        </div >
    );
};

FontCards.propTypes = {
    activeTab: PropTypes.string.isRequired,
    selectedGroup: PropTypes.string,
    setHighlitLanguageId: PropTypes.func,
    readOnly: PropTypes.bool
};

export default FontCards;
