import { useEffect, useRef, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTypo } from './context/useTypo';
import { useUI } from './context/UIContext';
import LandingPage from './components/LandingPage';
import SideBar from './components/SideBar';
import LanguageCard from './components/LanguageCard';
import LanguageSelectorModal from './components/LanguageSelectorModal';
import ErrorBoundary from './components/ErrorBoundary';
import TextCasingSelector from './components/TextCasingSelector';
import ViewModeSelector from './components/ViewModeSelector';
import MissingFontsModal from './components/MissingFontsModal';
import LanguageGroupFilter from './components/LanguageGroupFilter';
import AddLanguageModal from './components/AddLanguageModal';
import FontLanguageModal from './components/FontLanguageModal';
import ConfigActionsModal from './components/ConfigActionsModal';
import FontComparisonSelectorModal from './components/FontComparisonSelectorModal';
import FontComparisonView from './components/FontComparisonView';
import FontFilter from './components/FontFilter'; // New Import
import ExportCSSModal from './components/ExportCSSModal';
import { createFontUrl } from './services/FontLoader';
import { safeParseFontFile } from './services/SafeFontLoader';
import { useConfigImport } from './hooks/useConfigImport';
import { useFontFaceStyles } from './hooks/useFontFaceStyles';

import { getLanguageGroup } from './utils/languageUtils';
import { PersistenceService } from './services/PersistenceService';
import ResetConfirmModal from './components/ResetConfirmModal';
import ResetLoadingScreen from './components/ResetLoadingScreen';
import LoadingScreen from './components/LoadingScreen';

const MainContent = ({
  sidebarMode,
  setSidebarMode,
  selectedGroup,
  setSelectedGroup,
  // onAddLanguage - UNUSED
  showLanguageModal,
  setShowLanguageModal,
  addLanguageGroupFilter,
  // setAddLanguageGroupFilter - UNUSED
  highlitLanguageId,
  setHighlitLanguageId,
  activeConfigModal,
  setActiveConfigModal,
  searchQuery,
  setSearchQuery,
  expandedGroups, // New Prop
  fontFilter, // Lifted Prop
  setFontFilter // Lifted Prop
}) => {
  const {
    fontObject,
    primaryFontOverrides,
    fallbackFontOverrides,
    addConfiguredLanguage,
    addLanguageSpecificPrimaryFontFromId,
    // isLanguageMapped - UNUSED
    supportedLanguages, // New export
    mappedLanguageIds,
    configuredLanguages,
    primaryLanguages, // New


    resetApp,
    isSessionLoading,
    fonts // Added for filtering
  } = useTypo();

  const {
    showFallbackColors,
    setShowFallbackColors,
    showAlignmentGuides,
    setShowAlignmentGuides,
    showBrowserGuides,
    setShowBrowserGuides,
    showFallbackOrder,
    setShowFallbackOrder,
    activeConfigTab,
    setActiveConfigTab,
    gridColumns,
    setGridColumns,
    // viewMode, setViewMode, textCase, setTextCase // Not used directly in App? viewMode is in ConfigService serialization if needed
  } = useUI();

  // const [fontFilter, setFontFilter] = useState([]); // Lifted to App

  const visibleLanguagesList = useMemo(() => {
    // 1. Base List: strict Configured Order
    const baseList = configuredLanguages
      .map(id => supportedLanguages.find(l => l.id === id))
      .filter(Boolean);

    // 2. Sort by Primary (matches Sidebar)
    const primarySorted = [...baseList].sort((a, b) => {
      const aIsPrimary = primaryLanguages.includes(a.id) || (primaryLanguages.length === 0 && a.id === 'en-US');
      const bIsPrimary = primaryLanguages.includes(b.id) || (primaryLanguages.length === 0 && b.id === 'en-US');
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      return 0;
    });

    // 3. Group Flattening (matches Sidebar visual structure)
    // Sidebar renders groups in discovery order, and items within groups.
    const groups = {};
    const groupOrder = [];

    primarySorted.forEach(lang => {
      const g = getLanguageGroup(lang);
      if (!groups[g]) {
        groups[g] = [];
        groupOrder.push(g);
      }
      groups[g].push(lang);
    });

    const sidebarOrderedList = groupOrder.flatMap(g => groups[g]);

    // 4. Filtering
    let visible = sidebarOrderedList;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      visible = visible.filter(l => l.name.toLowerCase().includes(lowerQuery));
    } else {
      // Standard Group Logic
      if (selectedGroup === 'MAPPED') {
        visible = visible.filter(l =>
          mappedLanguageIds.includes(l.id) ||
          primaryLanguages.includes(l.id) ||
          (primaryLanguages.length === 0 && l.id === 'en-US')
        );
      } else if (selectedGroup === 'UNMAPPED') {
        visible = visible.filter(l => {
          const isPrimary = primaryLanguages.includes(l.id) || (primaryLanguages.length === 0 && l.id === 'en-US');
          const isMapped = mappedLanguageIds.includes(l.id);
          return !isPrimary && !isMapped;
        });
      } else if (selectedGroup !== 'ALL') {
        visible = visible.filter(lang => {
          const group = getLanguageGroup(lang);
          // Check collapse state for specific group selection if not 'ALL'/'MAPPED'/'UNMAPPED' (implied by falling through here)
          // Actually, earlier logic says:
          // if selectedGroup is specific group, we return group === selectedGroup.

          return group === selectedGroup;
        });
      }

      // Respect Collapse State for ALL/MAPPED/UNMAPPED
      if (['ALL', 'MAPPED', 'UNMAPPED'].includes(selectedGroup)) {
        visible = visible.filter(lang => {
          const group = getLanguageGroup(lang);
          return expandedGroups[group] ?? true;
        });
      }
    }

    // 5. Font Filter (New) - Corrected to include Inherited Fonts
    if (fontFilter.length > 0) {
      // Pre-calculate global fonts to avoid doing it per-language
      const globalPrimaryFont = fonts.find(f => f.type === 'primary' && !f.isPrimaryOverride);
      const globalFallbackFonts = fonts.filter(f => f.type === 'fallback' && f.fontObject && !f.isClone && !f.isLangSpecific);

      visible = visible.filter(lang => {
        const langPrimaryOverride = primaryFontOverrides?.[lang.id];
        const langFallbackOverrides = fallbackFontOverrides?.[lang.id]; // Can be string or object

        const effectiveFontIds = new Set();

        // 1. Resolve Primary
        if (langPrimaryOverride) {
          effectiveFontIds.add(langPrimaryOverride);
        } else if (primaryLanguages.includes(lang.id) && globalPrimaryFont) {
          effectiveFontIds.add(globalPrimaryFont.id);
        }

        // 2. Resolve Fallbacks (Inherited + Overrides)
        // Iterate over GLOBAL fallbacks to check inheritance/overrides
        globalFallbackFonts.forEach(gf => {
          let effectiveId = gf.id;

          // Check for override
          if (langFallbackOverrides) {
            if (typeof langFallbackOverrides === 'string') {
              // String override usually implies replacing the whole stack or specific logic? 
              // Based on legacy, might be single mapping. Let's include it.
              // But here we are checking specific global font.
              if (langFallbackOverrides === gf.id) effectiveId = gf.id; // Same
              // If string is different, does it replace THIS font? Unclear. 
              // Safest: Add the string value to effectiveIds separately.
            } else if (typeof langFallbackOverrides === 'object') {
              if (langFallbackOverrides[gf.id]) {
                effectiveId = langFallbackOverrides[gf.id];
              }
            }
          }
          effectiveFontIds.add(effectiveId);
        });

        // 3. Add any other strictly mapped fonts (that might not be global fallbacks)
        if (langFallbackOverrides) {
          if (typeof langFallbackOverrides === 'string') {
            effectiveFontIds.add(langFallbackOverrides);
          } else if (typeof langFallbackOverrides === 'object') {
            Object.values(langFallbackOverrides).forEach(id => effectiveFontIds.add(id));
          }
        }

        // Check if ANY of the effective fonts matches the filter
        return Array.from(effectiveFontIds).some(fontId => {
          const f = fonts.find(font => font.id === fontId);
          if (f) {
            const name = f.fileName || f.name;
            return fontFilter.includes(name);
          }
          return false;
        });
      });
    }

    return visible;
  }, [configuredLanguages, supportedLanguages, primaryLanguages, searchQuery, selectedGroup, mappedLanguageIds, expandedGroups, fontFilter, fonts, primaryFontOverrides, fallbackFontOverrides]);

  const visibleCount = visibleLanguagesList.length;
  const totalCount = supportedLanguages.length;


  const { importConfig, missingFonts, existingFiles, resolveMissingFonts, cancelImport, parsedMappings } = useConfigImport();
  // Removed local showLanguageSelector state
  const [showListSettings, setShowListSettings] = useState(false);
  const [pendingFonts, setPendingFonts] = useState([]);
  const [pendingFileMap, setPendingFileMap] = useState(null);

  // Font Comparison State
  const [showComparisonSelector, setShowComparisonSelector] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonFontIds, setComparisonFontIds] = useState([]);

  const handleStartComparison = (selectedIds) => {
    setComparisonFontIds(selectedIds);
    setIsComparisonMode(true);
    setShowComparisonSelector(false);
  };

  const handleCloseComparison = () => {
    setIsComparisonMode(false);
    setComparisonFontIds([]);
  };

  // Z-Index Management (Single Active Menu)
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Sync highlitLanguageId with activeConfigTab to prevent double selection
  // Sync highlitLanguageId with activeConfigTab to prevent double selection
  useEffect(() => {
    // If activeConfigTab is NOT ALL, we still want to ensure coherence.
    // If activeConfigTab IS ALL, we now ALLOW highlitLanguageId to be set (for manual highlighting).
    if (activeConfigTab !== 'ALL') {
      const primaryLangId = primaryLanguages[0] || 'en-US';
      const targetId = activeConfigTab === 'primary' ? primaryLangId : activeConfigTab;
      if (highlitLanguageId !== targetId) {
        setHighlitLanguageId(targetId);
      }
    }
  }, [activeConfigTab, highlitLanguageId, setHighlitLanguageId, primaryLanguages]);

  // Centralized Scroll Logic


  useEffect(() => {
    // Scroll Logic
    // Priorities:
    // 1. If activeConfigTab is specific -> Scroll to it.
    // 2. If activeConfigTab is ALL -> Check highlitLanguageId -> Scroll to it.

    let targetId = null;

    const primaryLangId = primaryLanguages[0] || 'en-US';

    if (activeConfigTab !== 'ALL') {
      targetId = activeConfigTab === 'primary' ? primaryLangId : activeConfigTab;
    } else if (highlitLanguageId) {
      targetId = highlitLanguageId === 'primary' ? primaryLangId : highlitLanguageId;
    }

    if (!targetId) return;

    // Optional: Avoid scrolling if we just scrolled to this ID?
    // if (targetId === lastMainScrolledId.current) return;
    // Actually, if user clicks again, maybe they want to scroll back? 
    // But typically React effect won't fire if dependencies haven't changed.
    // However, highlitLanguageId changing from A -> null -> A might trigger it.

    // lastMainScrolledId.current = targetId; // Keeping this reference check might be useful

    // Use a retry mechanism to ensure the element exists before scrolling
    let attempts = 0;
    const maxAttempts = 10; // 500ms max wait

    // Clear any previous interval
    if (window._mainScrollInterval) clearInterval(window._mainScrollInterval);

    window._mainScrollInterval = setInterval(() => {
      const element = document.getElementById(`language-card-${targetId}`);
      if (element) {
        // Element found - scroll and clear
        const headerOffset = 80; // Approximate header height + padding
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });

        clearInterval(window._mainScrollInterval);
        window._mainScrollInterval = null;
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(window._mainScrollInterval);
          window._mainScrollInterval = null;
        }
      }
    }, 50);

    return () => {
      if (window._mainScrollInterval) {
        clearInterval(window._mainScrollInterval);
        window._mainScrollInterval = null;
      }
    };
  }, [activeConfigTab, highlitLanguageId, primaryLanguages]);

  const { getExportConfiguration, addLanguageSpecificFallbackFont, loadFont } = useTypo();

  const handleExport = () => {
    const config = getExportConfiguration();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    // Month is 0-indexed, so +1
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    const timestamp = `${month}-${day}-${year}`;

    const a = document.createElement('a');
    a.href = url;
    a.download = `config-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };







  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importConfig(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleResolve = async (fileMap) => {
    const files = Object.values(fileMap);
    const processed = [];

    for (const file of files) {
      try {
        console.log(`[App] Parsing resolved file: ${file.name}`);
        const { font, metadata } = await safeParseFontFile(file);
        const url = createFontUrl(file);
        processed.push({ font, metadata, url, file });
        console.log(`[App] Successfully parsed: ${file.name}`);
      } catch (err) {
        console.error("Error parsing during import resolution:", err);
      }
    }

    if (processed.length > 0) {
      setPendingFonts(processed);
      setPendingFileMap(fileMap);
    } else {
      resolveMissingFonts(fileMap);
    }
  };

  const handleMappingsConfirm = async ({ mappings, orderedFonts }) => {
    // First restore the main config
    await resolveMissingFonts(pendingFileMap);

    // Load the designated Primary font to ensure it's the main session font
    // We do this AFTER restoration because restoreConfiguration overwrites fontStyles
    const primaryItem = orderedFonts[0];
    if (primaryItem) {
      loadFont(
        primaryItem.font,
        primaryItem.url,
        primaryItem.file.name,
        primaryItem.metadata
      );
    }

    // Then apply the language fallback overrides for the newly uploaded fonts, respecting the user's order
    orderedFonts.forEach((item, index) => {
      if (index === 0) return; // Skip primary

      const target = mappings[item.file.name];
      if (target !== 'auto') {
        addLanguageSpecificFallbackFont(
          item.font,
          item.url,
          item.file.name,
          item.metadata,
          target
        );
      }
    });

    setPendingFonts([]);
    setPendingFileMap(null);
  };



  const listSettingsRef = useRef(null);
  const toolbarRef = useRef(null);
  // const [buttonX, setButtonX] = useState(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const fontFaceStyles = useFontFaceStyles();

  // Measure button position for fixed overlay


  // Scroll detection for toolbar
  useEffect(() => {
    if (isComparisonMode) return; // Don't observe in comparison mode

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsToolbarVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    const currentToolbarRef = toolbarRef.current;
    if (currentToolbarRef) {
      observer.observe(currentToolbarRef);
    }

    return () => {
      if (currentToolbarRef) {
        observer.unobserve(currentToolbarRef);
      }
    };
  }, [fontObject, isComparisonMode]);

  useEffect(() => {
    if (!showListSettings) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowListSettings(false);
      }
    };

    const onMouseDown = (e) => {
      const el = listSettingsRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        setShowListSettings(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [showListSettings]);



  const handleSwapFont = (index, newFontId) => {
    setComparisonFontIds(prevIds => {
      const newIds = [...prevIds];
      newIds[index] = newFontId;
      return newIds;
    });
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen relative">
      <style>{fontFaceStyles}</style>


      {isComparisonMode ? (
        <FontComparisonView
          fontIds={comparisonFontIds}
          onClose={handleCloseComparison}
          onSwapFont={handleSwapFont}
        />
      ) : (
        /* Regular Main Content */
        isSessionLoading ? (
          <LoadingScreen />
        ) : (!fontObject && configuredLanguages.length === 0 && !fontStyles?.primary?.fonts?.[0]?.name) ? (
          <LandingPage importConfig={importConfig} />
        ) : (
          <div
            className="pt-4 px-8 md:px-10 pb-32 min-h-screen cursor-default"
            onClick={() => {
              setActiveConfigTab('ALL');
              if (setHighlitLanguageId) setHighlitLanguageId(null);
            }}
          >
            <div
              ref={toolbarRef}
              className="flex flex-col md:flex-row md:items-center justify-between mb-2 gap-4 min-h-[34px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* LEFT: Live Demo Title */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">
                  TYPE DEMO
                </span>
              </div>

              {/* RIGHT: Controls */}
              <div className={`flex items-center gap-2 transition-all duration-300 ${isToolbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Inline Guide Toggles - Compact Individual Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    /* UI: TYPE GRID */
                    onClick={() => setShowAlignmentGuides(p => !p)}
                    className={`
                  px-2.5 h-[34px] rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border
                  ${showAlignmentGuides
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                        : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                      }
                `}
                  >
                    TYPE GRID
                  </button>

                  <button
                    /* UI: LINEBOX VIEW */
                    onClick={() => setShowBrowserGuides(p => !p)}
                    className={`
                  px-2.5 h-[34px] rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border
                  ${showBrowserGuides
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                        : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                      }
                `}
                  >
                    LINEBOX VIEW
                  </button>

                  <button
                    /* UI: FALLBACK COLORS */
                    onClick={() => setShowFallbackColors(!showFallbackColors)}
                    className={`
                  px-2.5 h-[34px] rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border
                  ${showFallbackColors
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                        : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                      }
                `}
                  >
                    COLOR GUIDE
                  </button>

                  <button
                    /* UI: FALLBACK ORDER */
                    onClick={() => setShowFallbackOrder(!showFallbackOrder)}
                    className={`
                  px-2.5 h-[34px] rounded-md text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border relative z-50
                  ${showFallbackOrder
                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-1 ring-indigo-200/50'
                        : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                      }
                `}
                  >
                    FALLBACK ORDER
                  </button>





                  {/* Font Filter Component */}
                  <FontFilter
                    fonts={fonts}
                    primaryFontOverrides={primaryFontOverrides}
                    fallbackFontOverrides={fallbackFontOverrides}
                    selectedFilter={fontFilter}
                    onSelectFilter={setFontFilter}
                    compact={true}
                  />
                </div>
                <div className="w-[34px] h-[34px] hidden sm:block shrink-0" aria-hidden="true" />
              </div>
            </div>

            {/* Fixed Settings Button - Moved here to escape opacity transition */}
            {sidebarMode !== 'headers' && (
              <div className="fixed top-4 right-8 md:top-4 md:right-10 z-40" ref={listSettingsRef} onClick={(e) => e.stopPropagation()}>
                <button
                  /* UI: Settings / Config Button */
                  onClick={() => setShowListSettings(!showListSettings)}
                  className={`
                    p-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 w-[34px] h-[34px] border
                    ${showListSettings
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200/50'
                      : 'bg-white text-slate-500 border-gray-200 hover:text-slate-700 hover:border-gray-300 hover:bg-slate-50'
                    }
                `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14"></line>
                    <line x1="4" y1="10" x2="4" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12" y2="3"></line>
                    <line x1="20" y1="21" x2="20" y2="16"></line>
                    <line x1="20" y1="12" x2="20" y2="3"></line>
                    <line x1="1" y1="14" x2="7" y2="14"></line>
                    <line x1="9" y1="8" x2="15" y2="8"></line>
                    <line x1="17" y1="16" x2="23" y2="16"></line>
                  </svg>
                </button>

                {showListSettings && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-slate-200/50 origin-top-right z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
                    <div className="p-4 space-y-5">
                      {/* Interface Section */}
                      <div>
                        <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Interface</span>
                          <div className="h-px flex-1 bg-slate-100 ml-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 ml-1">Grid</label>
                            <div className="relative">
                              <select
                                value={gridColumns}
                                onChange={(e) => setGridColumns(parseInt(e.target.value))}
                                className="w-full py-1.5 pl-3 pr-8 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none font-bold text-slate-700 tracking-tight transition-all"
                              >
                                {[1, 2, 3, 4].map(num => (
                                  <option key={num} value={num}>{num} Col</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 ml-1">Display</label>
                            <ViewModeSelector variant="simple" />
                          </div>
                        </div>
                      </div>

                      {/* Typography Section */}
                      <div>
                        <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Typography</span>
                          <div className="h-px flex-1 bg-slate-100 ml-3" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-1">
                          <TextCasingSelector variant="simple" />
                        </div>
                      </div>

                      {/* Tools Section */}
                      <div>
                        <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Tools</span>
                          <div className="h-px flex-1 bg-slate-100 ml-3" />
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setSidebarMode(sidebarMode === 'headers' ? 'main' : 'headers');
                              setShowListSettings(false);
                            }}
                            className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all border
                            ${sidebarMode === 'headers'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50'
                              }
                          `}
                          >
                            <span className="flex items-center gap-2.5">
                              <span className={`font-serif italic text-sm ${sidebarMode === 'headers' ? 'text-white' : 'text-slate-400'}`}>Aa</span>
                              <span>Edit Header Styles</span>
                            </span>
                            {sidebarMode === 'headers' && (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>



                          <button
                            onClick={() => {
                              setShowComparisonSelector(true);
                              setShowListSettings(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                              <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
                              <line x1="12" y1="3" x2="12" y2="21"></line>
                            </svg>
                            Compare Fonts
                          </button>
                        </div>
                      </div>

                      {/* Guides Section (Only visible when main toolbar is not visible) */}
                      {!isToolbarVisible && (
                        <div>
                          <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                            <span>Tools</span>
                            <div className="h-px flex-1 bg-slate-100 ml-3" />
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-1 grid grid-cols-1 gap-1">
                            {[
                              { label: 'Type Grid', active: showAlignmentGuides, toggle: () => setShowAlignmentGuides(p => !p) },
                              { label: 'Linebox View', active: showBrowserGuides, toggle: () => setShowBrowserGuides(p => !p) },
                              { label: 'Color Guide', active: showFallbackColors, toggle: () => setShowFallbackColors(!showFallbackColors) },
                              { label: 'Fallback Order', active: showFallbackOrder, toggle: () => setShowFallbackOrder(!showFallbackOrder) }
                            ].map((guide) => (
                              <button
                                key={guide.label}
                                onClick={guide.toggle}
                                className={`
                                flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all
                                ${guide.active
                                    ? 'bg-white text-indigo-600'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                  }
                              `}
                              >
                                <span>{guide.label}</span>
                                {guide.active && <div className="w-1 h-1 rounded-full bg-indigo-600" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Danger Zone */}
                      <div>
                        <div className="px-1 mb-3 text-[10px] font-bold text-slate-400 tracking-wider flex items-center justify-between">
                          <span>Danger Zone</span>
                          <div className="h-px flex-1 bg-slate-100 ml-3" />
                        </div>
                        <button
                          onClick={() => {
                            resetApp();
                            setShowListSettings(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white text-rose-500 border border-slate-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/50 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                          </svg>
                          Reset Application
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-300 text-center tracking-widest uppercase">
                      v{__APP_VERSION__}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-4 transition-all duration-300 ease-in-out relative" style={{ gridTemplateColumns: `repeat(${fontObject ? gridColumns : 1}, minmax(0, 1fr))` }}>
              {visibleLanguagesList.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
                  <div className="w-12 h-12 mb-4 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                  <h3 className="text-slate-900 font-bold mb-1">No languages match your filters</h3>
                  <p className="text-slate-500 text-sm mb-4 max-w-xs mx-auto">
                    Try adjusting your search query, group filters, or font filters to see more results.
                  </p>
                  <button
                    onClick={() => {
                      if (setSearchQuery) setSearchQuery('');
                      if (setSelectedGroup) setSelectedGroup('ALL');
                      if (setFontFilter) setFontFilter([]);
                    }}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {visibleLanguagesList.map(lang => (
                    <motion.div
                      key={lang.id}
                      className="h-full"
                      style={{ zIndex: activeMenuId === lang.id ? 50 : 1 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.2 }
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <LanguageCard
                        language={lang}
                        isHighlighted={highlitLanguageId === lang.id || (highlitLanguageId === 'primary' && primaryLanguages.includes(lang.id))}
                        isMenuOpen={activeMenuId === lang.id}
                        onToggleMenu={(isOpen) => setActiveMenuId(isOpen ? lang.id : null)}
                        setHighlitLanguageId={setHighlitLanguageId}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div >
        )
      )}


      {
        showComparisonSelector && (
          <FontComparisonSelectorModal
            isOpen={showComparisonSelector}
            onClose={() => setShowComparisonSelector(false)}
            onCompare={handleStartComparison}
          />
        )
      }

      {
        showLanguageModal && (
          <AddLanguageModal
            onClose={() => setShowLanguageModal(false)}
            onConfirm={(langId, fontId) => {
              addConfiguredLanguage(langId);
              if (fontId && fontId !== 'inherit') addLanguageSpecificPrimaryFontFromId(fontId, langId);
              setActiveConfigTab(langId);
              setShowLanguageModal(false);
            }}
            configuredLanguages={configuredLanguages}
            filterGroup={addLanguageGroupFilter}
          />
        )
      }

      {
        missingFonts && pendingFonts.length === 0 && (
          <MissingFontsModal missingFonts={missingFonts} existingFiles={existingFiles} onResolve={handleResolve} onCancel={cancelImport} />
        )
      }

      {
        pendingFonts.length > 0 && (
          <FontLanguageModal
            pendingFonts={pendingFonts}
            initialMappings={parsedMappings}
            onConfirm={handleMappingsConfirm}
            onCancel={() => { setPendingFonts([]); setPendingFileMap(null); cancelImport(); }}
          />
        )
      }

      {
        activeConfigModal && activeConfigModal !== 'export-css' && (
          <ConfigActionsModal
            mode={activeConfigModal}
            onClose={() => setActiveConfigModal(null)}
            onImport={handleImport}
            onExport={handleExport}
          />
        )
      }

      {
        activeConfigModal === 'export-css' && (
          <ExportCSSModal
            onClose={() => setActiveConfigModal(null)}
          />
        )
      }


    </div >
  );
};

function App() {
  const [sidebarMode, setSidebarMode] = useState('main');

  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(''); // New search state
  const [highlitLanguageId, setHighlitLanguageId] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [addLanguageGroupFilter, setAddLanguageGroupFilter] = useState(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [activeConfigModal, setActiveConfigModal] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [fontFilter, setFontFilter] = useState([]); // Lifted State (Multi-select)
  // Force HMR Update

  const { resetApp, isAppResetting, fontObject, configuredLanguages, fontStyles } = useTypo();

  const isLandingPage = !fontObject && configuredLanguages.length === 0 && !fontStyles?.primary?.fonts?.[0]?.name;

  // Live Preview Mode


  const handleAddLanguage = (group) => {
    setAddLanguageGroupFilter(group);
    setShowLanguageModal(true);
  };

  const handleResetApp = async () => {
    await resetApp();
  };

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen w-full">
        {/* LEFT SIDEBAR: Show only when NOT in header mode and NOT on landing page */}
        {sidebarMode !== 'headers' && !isLandingPage && (
          <SideBar
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode}

            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            onAddLanguage={handleAddLanguage}
            highlitLanguageId={highlitLanguageId}
            setHighlitLanguageId={setHighlitLanguageId}
            onManageLanguages={() => setShowLanguageSelector(true)}
            onOpenSettings={(mode) => setActiveConfigModal(mode)}
            onResetApp={() => setShowResetConfirm(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            fontFilter={fontFilter}
            setFontFilter={setFontFilter}
          />
        )}

        <MainContent
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          onAddLanguage={handleAddLanguage}
          showLanguageModal={showLanguageModal}
          setShowLanguageModal={setShowLanguageModal}
          addLanguageGroupFilter={addLanguageGroupFilter}
          setAddLanguageGroupFilter={setAddLanguageGroupFilter}
          highlitLanguageId={highlitLanguageId}
          setHighlitLanguageId={setHighlitLanguageId}

          activeConfigModal={activeConfigModal}
          setActiveConfigModal={setActiveConfigModal}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          expandedGroups={expandedGroups}
          fontFilter={fontFilter} // New Sync Prop
          setFontFilter={setFontFilter} // Lifted Prop
        // showResetConfirm and setShowResetConfirm are no longer needed here as App handles the modal
        />

        {/* RIGHT SIDEBAR: Show only when IN header mode and NOT on landing page */}
        {sidebarMode === 'headers' && !isLandingPage && (
          <SideBar
            sidebarMode={sidebarMode}
            setSidebarMode={setSidebarMode} // Pass same props

            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            onAddLanguage={handleAddLanguage}
            highlitLanguageId={highlitLanguageId}
            setHighlitLanguageId={setHighlitLanguageId}
            onManageLanguages={() => setShowLanguageSelector(true)}
            onOpenSettings={(mode) => setActiveConfigModal(mode)}
            onResetApp={() => setShowResetConfirm(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            expandedGroups={expandedGroups}
            setExpandedGroups={setExpandedGroups}
            fontFilter={fontFilter}
          />
        )}
      </div>

      {showLanguageSelector && (
        <LanguageSelectorModal onClose={() => setShowLanguageSelector(false)} />
      )}

      <ResetConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetApp}
      />

      {isAppResetting && <ResetLoadingScreen />}
    </ErrorBoundary>
  );
}

export default App;
