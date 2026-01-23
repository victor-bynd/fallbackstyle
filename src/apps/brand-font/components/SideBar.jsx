import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import appVersion from '../version.json';
import systemFonts from '../../../shared/constants/systemFonts.json';
import { parseFontFile, createFontUrl } from '../../../shared/services/FontLoader';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const hexToRgba = (hex) => {
    if (!hex) return { hex: '#3B82F6', alpha: 0.35 };
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    if (cleanHex.length === 8) {
        const h = cleanHex.slice(0, 6);
        const a = parseInt(cleanHex.slice(6, 8), 16) / 255;
        return { hex: `#${h}`, alpha: a };
    }
    return { hex: `#${cleanHex.slice(0, 6)}`, alpha: 1 };
};

const rgbaToHex = (hex, alpha) => {
    const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `#${cleanHex}${a}`;
};

const ColorDot = ({ id, color, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { hex, alpha } = hexToRgba(color);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + 8,
                    left: rect.left
                });
            }
        };

        updatePosition();
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative flex items-center shrink-0">
            <button
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-3.5 h-3.5 flex-shrink-0 rounded-full border border-slate-200 shadow-sm overflow-hidden relative group/dot"
                style={{ backgroundColor: color || '#3B82F6' }}
                title="Change color & opacity"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/dot:opacity-100 transition-opacity" />
            </button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] min-w-[140px] animate-in fade-in zoom-in-95 origin-top-left"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color</span>
                            <div className="relative w-6 h-6 rounded-md border border-slate-200 overflow-hidden shrink-0">
                                <div className="absolute inset-0" style={{ backgroundColor: hex }} />
                                <input
                                    type="color"
                                    value={hex}
                                    onInput={(e) => onChange(id, rgbaToHex(e.target.value, alpha))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer scale-150"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
                                <span className="text-[10px] font-bold text-slate-600 tabular-nums">{Math.round(alpha * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={alpha}
                                onInput={(e) => onChange(id, rgbaToHex(hex, parseFloat(e.target.value)))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const CopyOverridesPopover = ({ onSelect, fontColors }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + 8,
                    left: rect.right - 160 // min-w is 160
                });
            }
        };

        updatePosition();
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={clsx(
                    "p-1.5 rounded-md transition-all flex items-center justify-center",
                    isOpen ? "bg-indigo-100 text-indigo-600" : "text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                )}
                title="Copy metrics from simulated fallback"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5V7a2.25 2.25 0 00-2.25-2.25H4.75V5.25a2.25 2.25 0 012.25-2.25h9a2.25 2.25 0 012.25 2.25z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M2.25 8.25a2.25 2.25 0 012.25-2.25h6.5A2.25 2.25 0 0113.25 8.25v6.5a2.25 2.25 0 01-2.25 2.25h-6.5A2.25 2.25 0 012.25 14.75v-6.5z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed p-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] min-w-[160px] animate-in fade-in zoom-in-95 origin-top-right"
                    style={{
                        top: coords.top,
                        left: coords.left
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-2 py-1.5 border-b border-slate-50 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Copy Overrides From</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {systemFonts.map((font) => (
                            <button
                                key={font.id}
                                onClick={() => {
                                    onSelect(font);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full border border-slate-200" style={{ backgroundColor: fontColors[font.id] }} />
                                {font.name}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const SideBar = ({
    primaryFont,
    selectedFallback,
    onSelectFallback,
    customFonts = [],
    onAddCustomFont,
    onRemoveFallback,
    onCopyOverrides,
    onResetApp,
    onReplacePrimaryFont,
    fontColors = {},
    onUpdateFontColor,
    onExport
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [newFontName, setNewFontName] = useState('');
    const [isReplacing, setIsReplacing] = useState(false);

    const settingsRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleAddCustom = () => {
        if (!newFontName.trim()) return;
        onAddCustomFont(newFontName.trim());
        setNewFontName('');
    };

    const handleReplaceClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsReplacing(true);
        try {
            const { font, metadata } = await parseFontFile(file);
            const url = createFontUrl(file);
            onReplacePrimaryFont({
                font,
                metadata,
                url,
                file,
                fileName: file.name
            });
        } catch (err) {
            console.error("Failed to replace font:", err);
            alert("Failed to parse font file: " + err.message);
        } finally {
            setIsReplacing(false);
            e.target.value = '';
        }
    };



    return (
        <div className="w-72 flex flex-col h-screen border-r border-gray-100 bg-white overflow-hidden text-slate-900 sticky top-0">
            {/* Header Section */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-50 bg-white shrink-0">
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    FONT STACK
                </div>
                <button
                    onClick={onExport}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Export CSS for all fallbacks"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">

                {/* Brand Font Section */}
                <div className="flex flex-col gap-1">
                    <div className="px-1 py-1 text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-2">BRAND FONT</span>
                        {primaryFont && (
                            <button
                                onClick={handleReplaceClick}
                                disabled={isReplacing}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50"
                                title="Replace Brand Font"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={clsx("w-3.5 h-3.5", isReplacing && "animate-spin")}>
                                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.451a.75.75 0 000-1.5H4.125a.75.75 0 00-.75.75v4.125a.75.75 0 001.5 0v-2.102l.312.312a7 7 0 0011.724-3.141.75.75 0 00-1.599-.309zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311h-2.451a.75.75 0 000 1.5h4.125a.75.75 0 00.75-.75V3.125a.75.75 0 00-1.5 0v2.102l-.312-.312A7 7 0 003.088 8.056a.75.75 0 101.599.309z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {primaryFont ? (
                        <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-3.5 relative group">
                            <div className="flex items-center gap-3">
                                <ColorDot
                                    id="primary"
                                    color={fontColors.primary}
                                    onChange={onUpdateFontColor}
                                />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-900 truncate" title={primaryFont.fileName}>
                                        {primaryFont.fileName}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex justify-start items-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".ttf,.otf,.woff,.woff2"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-[11px] text-slate-400 italic px-2 py-1">
                            No brand font selected
                        </div>
                    )}
                </div>

                {/* Simulated Fallbacks Section */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between w-full px-1 py-1 text-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            SIMULATED FALLBACKS
                            <InfoTooltip content="These fonts are loaded as webfonts to simulate system fallback fonts when specific system fonts aren't available on your system." />
                        </span>
                    </div>

                    <div className="space-y-1">
                        {systemFonts.map((font) => (
                            <div
                                key={font.id}
                                onClick={() => onSelectFallback(font)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectFallback(font);
                                    }
                                }}
                                className={clsx(
                                    "w-full text-left p-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border flex items-center gap-3 group/item cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20",
                                    selectedFallback?.id === font.id
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600"
                                )}
                            >
                                <ColorDot
                                    id={font.id}
                                    color={fontColors[font.id]}
                                    onChange={onUpdateFontColor}
                                />
                                <span className="truncate flex-1">{font.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* System Fallbacks Section */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between w-full px-1 py-1 text-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            SYSTEM FALLBACKS
                            <InfoTooltip content="System fallback fonts cannot be automatically styled due to browser tech limitations." />
                        </span>
                    </div>

                    <div className="space-y-1">
                        {customFonts.length > 0 ? (
                            customFonts.map((font) => (
                                <div key={font.id} className="relative group">
                                    <div
                                        onClick={() => onSelectFallback(font)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onSelectFallback(font);
                                            }
                                        }}
                                        className={clsx(
                                            "w-full text-left p-3.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border flex items-center gap-3 group/item pr-10 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500/20",
                                            selectedFallback?.id === font.id
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-500/10 shadow-sm"
                                                : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600"
                                        )}
                                    >
                                        <ColorDot
                                            id={font.id}
                                            color={fontColors[font.id]}
                                            onChange={onUpdateFontColor}
                                        />
                                        <span className="truncate flex-1">{font.name}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all">
                                        <CopyOverridesPopover onSelect={onCopyOverrides} fontColors={fontColors} />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFallback(font.id);
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 transition-all rounded-md hover:bg-rose-50"
                                            title="Remove font"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-3.5 py-2 text-[10px] text-slate-400 italic">No system fonts added</div>
                        )}

                        {/* Add Custom Font */}
                        <div className="mt-2 pt-4 border-t border-slate-50">
                            <label className="block text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wider px-1">Add System Font Name</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newFontName}
                                    onChange={(e) => setNewFontName(e.target.value)}
                                    placeholder="e.g. Comic Sans"
                                    className="flex-1 h-8 px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
                                />
                                <button
                                    onClick={handleAddCustom}
                                    disabled={!newFontName.trim()}
                                    className="h-8 px-3 bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Settings Footer */}
            <div className="p-2 border-t border-gray-100 bg-white" ref={settingsRef}>
                <div className="mb-2 pt-2 px-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest leading-none">
                    <span className="font-black text-slate-500">FALLBACK STYLE</span>
                    <span className="font-bold text-slate-900">BRAND FONT</span>
                </div>
                <div className="relative">
                    {showSettings && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 origin-bottom-left z-50">
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        onResetApp();
                                        setShowSettings(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-75">
                                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                                    </svg>
                                    Reset App State
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex.1 w-full flex items-center gap-3 px-2 py-1.5 rounded-lg border transition-all ${showSettings
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            <div className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.047 7.047 0 010-2.228l-1.267-1.113a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-xs font-semibold">Settings</div>
                        </button>
                        <div className="px-3 py-1.5 bg-slate-50 rounded-lg text-center min-w-[3rem]">
                            <span className="text-[10px] font-medium text-slate-400">
                                v{appVersion.version}
                            </span>
                        </div>
                    </div>
                </div>
            </div >
        </div>
    );
};

export default SideBar;
