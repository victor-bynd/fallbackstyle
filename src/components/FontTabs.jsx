import { useRef, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import FallbackFontAdder from './FallbackFontAdder';
import { buildWeightSelectOptions, resolveWeightToAvailableOption } from '../utils/weightUtils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createFontUrl, parseFontFile } from '../services/FontLoader';
import { groupAndSortFonts } from '../utils/fontSortUtils';
import languages from '../data/languages.json';
import LanguageMultiSelectModal from './LanguageMultiSelectModal';

const PrimaryOverrideGroup = ({
    group,
    fonts,
    activeFont,
    fontScales,
    lineHeight,
    updateMetricGroup,
    weight,
    setActiveFont,
    getFontColor,
    updateFontColor,
    getEffectiveFontSettings,
    toggleFontVisibility,
    updateFontWeight,
    removeFallbackFont,
    previousLineHeight,
    setPreviousLineHeight,
    toggleGlobalLineHeightAuto,
    toggleFallbackLineHeightAuto,
    fallbackLineHeight,
    fallbackLetterSpacing,
    baseFontSize
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const effectiveWeight = group.weightOverride || 400; // Simplified for group, or derive from first font?
    const { addLanguagesToGroup } = useTypo();

    const handleAddLanguages = (langIds) => {
        addLanguagesToGroup(group.id, langIds);
        setShowLanguageModal(false);
    };

    return (
        <div className="bg-white rounded-lg border border-indigo-100 shadow-sm overflow-hidden ring-1 ring-indigo-50/50">
            {/* Group Header */}
            <div className="px-3 py-2 bg-indigo-50/50 border-b border-indigo-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div>
                            <span className="text-sm font-bold text-indigo-900 block leading-tight">{group.name}</span>
                            <span className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">Group</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowLanguageModal(true)}
                        className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded transition-colors text-xs font-medium flex items-center gap-1"
                        title="Add languages to this group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                    </button>
                </div>

                {/* Group Controls Removed - Controlled via Font Card */}
            </div>

            {/* Group Items */}
            <div className="p-2 space-y-2 bg-slate-50/30">
                {/* 
                    Collapse all fonts in the group to a SINGLE representative card. 
                    This assumes the group settings (applied via the card) control all fonts in the group.
                */}
                {fonts.length > 0 && (() => {
                    const representativeFont = fonts[0].font;
                    // Aggregate all languages and their source font IDs for targeted deletion
                    const allLanguageChips = fonts.flatMap(item =>
                        item.langIds.map(lid => ({ langId: lid, fontId: item.font.id }))
                    );

                    return (
                        <div className="relative group/item">
                            <SortableFontCard
                                font={representativeFont}
                                isActive={activeFont === representativeFont.id}
                                getFontColor={getFontColor}
                                updateFontColor={updateFontColor}
                                getEffectiveFontSettings={getEffectiveFontSettings}
                                fontScales={fontScales}
                                lineHeight={lineHeight}
                                isDraggable={false}
                                onRemoveOverride={null}
                                languageTags={[]}
                                setActiveFont={setActiveFont}
                                // Simplified handling for group items
                                handleRemove={() => { }}
                                updateFontWeight={updateFontWeight}
                                toggleFontVisibility={toggleFontVisibility}
                                previousLineHeight={previousLineHeight}
                                setPreviousLineHeight={setPreviousLineHeight}
                                toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                                toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                                globalLineHeight={fallbackLineHeight}
                                globalLetterSpacing={fallbackLetterSpacing}
                            />

                            {/* Languages Chips - Unified List */}
                            <div className="mt-2 text-[10px] text-indigo-600 font-bold mb-1 uppercase tracking-wider flex flex-wrap gap-1 items-center">
                                {allLanguageChips.map(({ langId, fontId }) => (
                                    <div key={`${langId}-${fontId}`} className="flex items-center bg-indigo-50 rounded border border-indigo-100 overflow-hidden">
                                        <span className="px-1.5 py-0.5 text-indigo-700">
                                            {langId}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Remove override for ${languages.find(l => l.id === langId)?.name || langId}?`)) {
                                                    removeFallbackFont(fontId);
                                                }
                                            }}
                                            className="px-1 py-0.5 text-indigo-300 hover:text-rose-500 hover:bg-indigo-100/50 transition-colors border-l border-indigo-100"
                                            title="Remove language"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {showLanguageModal && (
                <LanguageMultiSelectModal
                    onClose={() => setShowLanguageModal(false)}
                    onConfirm={handleAddLanguages}
                    title={`Add Languages to ${group.name}`}
                    confirmLabel="Update Languages"
                    initialSelectedIds={fonts.flatMap(f => f.langIds)}
                />
            )}
        </div>
    );
};

export const SortableFontCard = ({
    font,
    isActive,
    globalWeight,
    globalLineHeight,
    globalLetterSpacing,
    setGlobalLineHeight,
    setGlobalLetterSpacing,
    hasLineHeightOverrides,
    lineHeightOverrideCount,
    resetAllLineHeightOverrides,
    toggleGlobalLineHeightAuto,
    toggleFallbackLineHeightAuto,
    previousLineHeight,
    setPreviousLineHeight,
    getFontColor,
    updateFontColor,
    getEffectiveFontSettings,
    fontScales,
    lineHeight,
    updateFallbackFontOverride,
    resetFallbackFontOverrides,

    setActiveFont,
    handleRemove,
    updateFontWeight,
    toggleFontVisibility,
    languageTags = [],
    isDraggable = true,
    onRemoveOverride
}) => {
    const {
        loadFont,
        colors,
        baseFontSize,
        metricGroups,
        addMetricGroup,
        updateMetricGroup,
        assignFontToMetricGroup,
        removeFontFromMetricGroup,
        createGroupForFont
    } = useTypo();
    const [isHovered, setIsHovered] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const replacePrimaryInputRef = useRef(null);

    const activeGroup = font.metricGroupId ? metricGroups[font.metricGroupId] : null;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: font.id,
        disabled: !isDraggable
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : (font.hidden ? 0.6 : 1),
        position: 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    const isPrimary = font.type === 'primary';

    const effectiveWeight = getEffectiveFontSettings(font.id)?.weight ?? 400;
    const weightOptions = buildWeightSelectOptions(font);
    const resolvedWeight = resolveWeightToAvailableOption(font, effectiveWeight);

    const globalLineHeightPct = globalLineHeight === '' ? '' : Math.round((Number(globalLineHeight) || 1.2) * 100);
    const globalLetterSpacingEm = typeof globalLetterSpacing === 'number' ? globalLetterSpacing : 0;

    const isInheritingGlobalWeight = font.type === 'fallback' && (font.weightOverride === undefined || font.weightOverride === null || font.weightOverride === '');
    const isGlobalWeightUnavailable = isInheritingGlobalWeight && typeof globalWeight === 'number' && effectiveWeight !== globalWeight;

    const rawName = font.fileName || font.name || 'No font uploaded';
    let displayName = rawName;
    let extension = '';

    if (rawName && rawName.lastIndexOf('.') !== -1) {
        const lastDot = rawName.lastIndexOf('.');
        if (lastDot > 0) { // Ensure dot is not start
            displayName = rawName.substring(0, lastDot);
            extension = rawName.substring(lastDot + 1);
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                bg-slate-50 rounded-lg border transition-all relative
                p-2
                ${isPrimary ? '' : 'cursor-pointer'}
                ${isActive && !isPrimary
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }
            `}
            onClick={isPrimary ? undefined : () => setActiveFont(isActive ? null : font.id)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {font.type === 'primary' && (
                <>
                    <input
                        ref={replacePrimaryInputRef}
                        type="file"
                        className="hidden"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            try {
                                const { font: parsedFont, metadata } = await parseFontFile(file);
                                const url = createFontUrl(file);
                                loadFont(parsedFont, url, file.name, metadata);
                            } catch (err) {
                                console.error('Error loading font:', err);
                                alert('Failed to load font file.');
                            } finally {
                                e.target.value = '';
                            }
                        }}
                    />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            replacePrimaryInputRef.current?.click();
                        }}
                        className="absolute top-2 right-2 text-slate-400 hover:text-indigo-600 transition-colors p-1 z-10"
                        title="Replace main font"
                        onPointerDown={(e) => e.stopPropagation()}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a1.875 1.875 0 112.652 2.652L8.25 17.403a4.5 4.5 0 01-1.897 1.13l-2.685.895.895-2.685a4.5 4.5 0 011.13-1.897L16.862 3.487z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 6l-1.5-1.5" />
                        </svg>
                    </button>
                </>
            )}
            {font.type !== 'primary' && !font.fontObject && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFontVisibility(font.id);
                    }}
                    className={`absolute right-8 text-slate-400 hover:text-indigo-600 transition-all duration-200 p-1 z-10
                        ${isHovered || font.hidden ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                        top-[5px]
                    `}
                    title={font.hidden ? "Show font" : "Hide font"}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        {font.hidden ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        ) : (
                            <>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </>
                        )}
                    </svg>
                </button>
            )}
            {font.type !== 'primary' && (
                <button
                    onClick={(e) => handleRemove(e, font.id)}
                    className={`absolute right-2 text-slate-400 hover:text-rose-500 transition-all duration-200 p-1 z-10 
                        ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                        ${!font.fontObject ? 'top-[5px]' : 'top-2'}
                    `}
                    title="Remove font"
                    onPointerDown={(e) => e.stopPropagation()}
                    type="button"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            )}
            <div className={`flex gap-[3px] ${!isPrimary && isDraggable ? '-ml-[3px]' : ''} ${!isDraggable ? 'pl-1 items-center' : 'items-start'}`}>
                {isDraggable && (
                    <div
                        className="text-slate-400 cursor-move flex-shrink-0 hover:text-indigo-600 transition-colors p-1 -ml-1 rounded hover:bg-slate-100 touch-none"
                        title="Drag to reorder"
                        {...attributes}
                        {...listeners}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M7 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM7 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 8a2 2 0 1 1 0 4a2 2 0 0 1 0-4ZM13 14a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z" />
                        </svg>
                    </div>
                )}
                <div className={`flex-1 min-w-0 font-mono text-xs break-all text-slate-700 font-medium pr-6 ${isDraggable ? 'mt-0.5' : ''}`}>
                    {displayName}
                </div>
            </div>
            {!isPrimary && isGlobalWeightUnavailable && (
                <div className="text-[10px] text-amber-600 mt-1">
                    Main weight {globalWeight} not available; using {effectiveWeight}.
                </div>
            )}
            {(font.fontObject || !isPrimary) && (
                <div className={`text-xs text-slate-400 mt-2 flex items-center justify-between ${!isPrimary ? '' : ''}`}>
                    <div className="flex items-center gap-2">
                        {(font.fontObject || isPrimary) && (
                            <div className="relative w-3 h-3 flex-shrink-0 cursor-pointer group">
                                <div
                                    className="absolute inset-0 rounded-full ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-shadow"
                                    style={{ backgroundColor: getFontColor(font.id) }}
                                />
                                <input
                                    type="color"
                                    value={getFontColor(font.id)}
                                    onChange={(e) => updateFontColor(font.id, e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title={`Change color for ${isPrimary ? 'Primary' : 'Fallback'} font`}
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={e => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {font.fontObject && `${font.fontObject.numGlyphs} glyphs`}
                    </div>
                    <div className="flex items-center gap-1">
                        {languageTags && languageTags.length > 0 && (
                            <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
                                {languageTags.map(langId => (
                                    <div
                                        key={langId}
                                        className={`flex items-center gap-1 border px-1.5 py-0.5 rounded transition-colors relative
                                            ${font.isPrimaryOverride && !activeGroup
                                                ? 'cursor-pointer border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300'
                                                : 'cursor-default border-slate-200 bg-slate-100 group/tag hover:border-rose-200 hover:bg-rose-50'
                                            }`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (font.isPrimaryOverride && !activeGroup) {
                                                setShowGroupMenu(!showGroupMenu);
                                            }
                                        }}
                                        title={font.isPrimaryOverride && !activeGroup ? "Click to create group" : `Used in ${langId}`}
                                    >
                                        <span className={`text-[9px] font-bold uppercase tracking-wider 
                                            ${font.isPrimaryOverride && !activeGroup ? 'text-indigo-600' : 'text-slate-500 group-hover/tag:text-rose-500'}
                                        `}>
                                            {langId}
                                        </span>
                                        {onRemoveOverride && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveOverride(font.id, langId);
                                                }}
                                                className={`flex items-center justify-center w-3 h-3 -mr-0.5 rounded-full transition-colors 
                                                    ${font.isPrimaryOverride && !activeGroup
                                                        ? 'text-indigo-400 hover:text-rose-500 hover:bg-indigo-200'
                                                        : 'text-slate-400 hover:text-rose-500 hover:bg-rose-100'
                                                    }`}
                                                title="Remove language override"
                                                type="button"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* Group Menu Dropdown attached to the first language tag if active */}
                                        {font.isPrimaryOverride && !activeGroup && showGroupMenu && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40 cursor-default"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowGroupMenu(false);
                                                    }}
                                                />
                                                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 cursor-default">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const groupName = prompt('Enter name for new group:');
                                                            if (groupName) {
                                                                const settings = {
                                                                    scale: getEffectiveFontSettings(font.id)?.scale,
                                                                    h1Rem: font.h1Rem,
                                                                    lineHeight: font.lineHeight,
                                                                    letterSpacing: font.letterSpacing,
                                                                    weight: font.weightOverride,
                                                                    ascentOverride: font.ascentOverride,
                                                                    descentOverride: font.descentOverride,
                                                                    lineGapOverride: font.lineGapOverride
                                                                };
                                                                createGroupForFont(font.id, groupName, settings);
                                                            }
                                                            setShowGroupMenu(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                                        </svg>
                                                        Create New Group
                                                    </button>
                                                    {Object.values(metricGroups || {}).length > 0 && (
                                                        <>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase">Existing Groups</div>
                                                            {Object.values(metricGroups).map(g => (
                                                                <button
                                                                    key={g.id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`Adding this language to "${g.name}" will overwrite its current configuration with the group's settings. Continue?`)) {
                                                                            assignFontToMetricGroup(font.id, g.id);
                                                                            setShowGroupMenu(false);
                                                                        }
                                                                    }}
                                                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 truncate"
                                                                >
                                                                    {g.name}
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {extension && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isPrimary) toggleFontVisibility(font.id);
                                }}
                                className={`text-[9px] font-bold uppercase tracking-wider border rounded px-1.5 py-0.5 w-[40px] h-[18px] flex items-center justify-center transition-colors
                                    ${font.hidden
                                        ? 'bg-slate-100 border-slate-300 text-slate-400 hover:text-slate-600'
                                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                                    }
                                    ${!isPrimary ? 'cursor-pointer' : 'cursor-default'}
                                `}
                                title={!isPrimary ? (font.hidden ? "Show font" : "Hide font") : undefined}
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {!isPrimary && (font.hidden || isHovered) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                        {font.hidden ? (
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        ) : (
                                            <>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </>
                                        )}
                                    </svg>
                                ) : (
                                    extension
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )
            }


            {/* Main Font Controls */}
            {
                isPrimary && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-200 cursor-auto">
                        <div className="space-y-2" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                            {/* Weight */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Weight</span>
                                    <span className="text-slate-400 font-mono text-[10px]">{effectiveWeight}</span>
                                </div>
                                <div className="relative">
                                    <select
                                        value={resolvedWeight}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            updateFontWeight(font.id, parseInt(raw));
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-md pl-3 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                                    >
                                        {weightOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Line Height */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>Line Height</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {globalLineHeight !== 'normal' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGlobalLineHeight?.('normal');
                                                }}
                                                className="text-[9px] text-slate-400 hover:text-rose-500"
                                                title="Reset to Normal"
                                                type="button"
                                            >
                                                ↺
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <div className={`flex items-center gap-0.5 ${globalLineHeight === 'normal' ? 'opacity-50 grayscale' : ''}`}>
                                                <input
                                                    type="text"
                                                    value={globalLineHeight === 'normal' ? '' : (globalLineHeightPct === '' ? '' : Math.round((globalLineHeightPct / 100) * baseFontSize))}
                                                    placeholder="-"
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val)) {
                                                            setGlobalLineHeight?.(val / baseFontSize);
                                                        }
                                                    }}
                                                    className="w-8 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-0.5"
                                                />
                                                <span className="font-mono text-[9px] text-slate-400">px</span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-200"></div>
                                            <div className="flex items-center gap-0.5">
                                                <input
                                                    type="text"
                                                    value={globalLineHeight === 'normal' ? '' : globalLineHeightPct}
                                                    placeholder="Auto"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '') {
                                                            setGlobalLineHeight?.('');
                                                        } else {
                                                            const parsed = parseFloat(val);
                                                            if (!isNaN(parsed)) {
                                                                setGlobalLineHeight?.(parsed / 100);
                                                            }
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (globalLineHeight !== 'normal') {
                                                            const val = parseFloat(e.target.value);
                                                            if (isNaN(val)) {
                                                                setGlobalLineHeight?.(1.2);
                                                            } else {
                                                                const constrained = Math.max(50, Math.min(300, val));
                                                                setGlobalLineHeight?.(constrained / 100);
                                                            }
                                                        }
                                                    }}
                                                    className="w-10 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-0.5"
                                                />
                                                <span className="font-mono text-[9px] text-slate-400">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="50"
                                    max="300"
                                    step="5"
                                    disabled={false}
                                    value={globalLineHeight === 'normal' ? 120 : (globalLineHeight * 100)}
                                    onChange={(e) => {
                                        setGlobalLineHeight?.(e.target.value / 100);
                                    }}
                                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${globalLineHeight === 'normal'
                                        ? 'accent-slate-400'
                                        : 'accent-indigo-600'
                                        }`}
                                />
                                {hasLineHeightOverrides && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetAllLineHeightOverrides?.();
                                        }}
                                        className="w-full mt-2 py-1 text-[10px] font-bold text-rose-500 border border-rose-200 rounded hover:bg-rose-50 transition-colors"
                                        type="button"
                                    >
                                        Reset {lineHeightOverrideCount} Overrides
                                    </button>
                                )}
                            </div>

                            {/* Letter Spacing */}
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>Letter Spacing</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {globalLetterSpacingEm !== 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGlobalLetterSpacing?.(0);
                                                }}
                                                className="text-[9px] text-slate-400 hover:text-rose-500"
                                                title="Reset to 0"
                                                type="button"
                                            >
                                                ↺
                                            </button>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-0.5">
                                                <input
                                                    type="number"
                                                    value={globalLetterSpacingEm === 0 ? '' : Math.round(globalLetterSpacingEm * baseFontSize)}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (isNaN(val)) {
                                                            setGlobalLetterSpacing?.(0);
                                                            return;
                                                        }
                                                        setGlobalLetterSpacing?.(val / baseFontSize);
                                                    }}
                                                    className="w-8 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-0.5"
                                                />
                                                <span className="font-mono text-[9px] text-slate-400">px</span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-200"></div>
                                            <div className="flex items-center gap-0.5">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={globalLetterSpacingEm === 0 ? '' : globalLetterSpacingEm}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (isNaN(val)) {
                                                            setGlobalLetterSpacing?.(0);
                                                            return;
                                                        }
                                                        setGlobalLetterSpacing?.(val);
                                                    }}
                                                    className="w-10 text-right font-mono text-xs bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-0.5"
                                                />
                                                <span className="font-mono text-[9px] text-slate-400">em</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="-0.1"
                                    max="0.5"
                                    step="0.01"
                                    value={globalLetterSpacingEm}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (isNaN(val)) return;
                                        setGlobalLetterSpacing?.(val);
                                    }}
                                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${globalLetterSpacingEm !== 0
                                        ? 'accent-indigo-600'
                                        : 'accent-slate-400'
                                        }`}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Weight Control */}
            {
                !isPrimary && isActive && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-200 cursor-auto">
                        {(() => {
                            const effectiveSettings = getEffectiveFontSettings(font.id);
                            const hasOverrides = effectiveSettings && (
                                (effectiveSettings.scale !== fontScales.fallback) ||
                                (effectiveSettings.lineHeight !== lineHeight) ||
                                (font.letterSpacing !== undefined) ||
                                (font.weightOverride !== undefined) ||
                                (font.ascentOverride !== undefined && font.ascentOverride !== '') ||
                                (font.descentOverride !== undefined && font.descentOverride !== '') ||
                                (font.lineGapOverride !== undefined && font.lineGapOverride !== '')
                            );

                            return (
                                <div className="space-y-2" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
                                    {/* Header with Reset & Group Controls */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                Overrides
                                            </span>
                                            {/* Group Control */}
                                            {/* Group Control */}
                                        </div>

                                        {hasOverrides && !activeGroup && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    resetFallbackFontOverrides(font.id);
                                                }}
                                                className="text-[9px] text-rose-500 font-bold hover:text-rose-700 hover:underline"
                                            >
                                                Reset All
                                            </button>
                                        )}
                                    </div>

                                    {/* Weight Override */}
                                    <div>
                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                            <span>Weight</span>
                                            {font.weightOverride !== undefined && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateFallbackFontOverride(font.id, 'weightOverride', undefined);
                                                    }}
                                                    className="text-[9px] text-slate-400 hover:text-rose-500"
                                                    title="Reset to Main Weight"
                                                    type="button"
                                                >
                                                    ↺
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={resolvedWeight}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    updateFontWeight(font.id, parseInt(raw));
                                                }}
                                                className="w-full bg-white border border-gray-200 rounded-md pl-3 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                                            >
                                                {weightOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Font Scale / H1 Rem Slider */}
                                    <div>
                                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                            <span>{font.isPrimaryOverride ? 'H1 Size (rem)' : 'Size Adjust'}</span>
                                            <div className="flex items-center gap-2">
                                                {(font.isPrimaryOverride ? font.h1Rem : font.scale) !== undefined && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            updateFallbackFontOverride(font.id, font.isPrimaryOverride ? 'h1Rem' : 'scale', undefined);
                                                        }}
                                                        className="text-[9px] text-slate-400 hover:text-rose-500"
                                                        title={`Reset ${font.isPrimaryOverride ? 'H1 Size' : 'Size Adjust'}`}
                                                        type="button"
                                                    >
                                                        ↺
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        min={font.isPrimaryOverride ? "1" : "25"}
                                                        max={font.isPrimaryOverride ? "12" : "300"}
                                                        step={font.isPrimaryOverride ? "0.125" : "5"}
                                                        value={(font.isPrimaryOverride ? font.h1Rem : font.scale) !== undefined ? (font.isPrimaryOverride ? font.h1Rem : font.scale) : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const field = font.isPrimaryOverride ? 'h1Rem' : 'scale';
                                                            if (val === '') {
                                                                updateFallbackFontOverride(font.id, field, '');
                                                            } else {
                                                                const parsed = parseFloat(val);
                                                                updateFallbackFontOverride(font.id, field, parsed);
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            let val = parseFloat(e.target.value);
                                                            if (isNaN(val)) {
                                                                // reset to undefined
                                                                updateFallbackFontOverride(font.id, font.isPrimaryOverride ? 'h1Rem' : 'scale', undefined);
                                                            } else {
                                                                // Clamp value
                                                                const min = font.isPrimaryOverride ? 1 : 25;
                                                                const max = font.isPrimaryOverride ? 12 : 300;
                                                                val = Math.max(min, Math.min(max, val));
                                                                updateFallbackFontOverride(font.id, font.isPrimaryOverride ? 'h1Rem' : 'scale', val);
                                                            }
                                                        }}
                                                        className="w-12 text-right font-mono bg-transparent border-b border-slate-300 focus:border-indigo-600 focus:outline-none px-1"
                                                    />
                                                    <span className="font-mono">{font.isPrimaryOverride ? 'rem' : '%'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="range"
                                            min={font.isPrimaryOverride ? "1" : "25"}
                                            max={font.isPrimaryOverride ? "12" : "300"}
                                            step={font.isPrimaryOverride ? "0.125" : "5"}
                                            value={(activeGroup ? activeGroup.scale : (font.isPrimaryOverride ? (font.h1Rem || 3.75) : (effectiveSettings?.scale || fontScales.fallback))) || ''}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (activeGroup) {
                                                    // If Primary Override, update h1Rem in group
                                                    if (font.isPrimaryOverride) {
                                                        updateMetricGroup(activeGroup.id, { h1Rem: val });
                                                    } else {
                                                        updateMetricGroup(activeGroup.id, { scale: val });
                                                    }
                                                } else {
                                                    updateFallbackFontOverride(font.id, font.isPrimaryOverride ? 'h1Rem' : 'scale', val);
                                                }
                                            }}
                                            className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${((activeGroup ? (font.isPrimaryOverride ? activeGroup.h1Rem : activeGroup.scale) : (font.isPrimaryOverride ? font.h1Rem : font.scale))) !== undefined
                                                ? 'accent-indigo-600'
                                                : 'accent-slate-400'
                                                }`}
                                        />
                                    </div>


                                    {/* Line Height Slider - Only show for Primary Overrides */}
                                    {font.isPrimaryOverride && (
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Line Height</span>
                                                <div className="flex items-center gap-2">
                                                    {(activeGroup ? (activeGroup.lineHeight !== undefined && activeGroup.lineHeight !== '' && activeGroup.lineHeight !== 'normal') : (font.lineHeight !== undefined && font.lineHeight !== '' && font.lineHeight !== 'normal')) ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (activeGroup) {
                                                                    updateMetricGroup(activeGroup.id, { lineHeight: undefined }); // Or 'normal'?
                                                                } else {
                                                                    updateFallbackFontOverride(font.id, 'lineHeight', undefined);
                                                                }
                                                            }}
                                                            className="text-[9px] text-slate-400 hover:text-rose-500"
                                                            title="Reset Line Height"
                                                            type="button"
                                                        >
                                                            ↺
                                                        </button>
                                                    ) : null}
                                                    <div className={`flex items-center gap-2 ${((activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal') ? 'opacity-50 grayscale' : ''}`}>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'
                                                                    ? '-'
                                                                    : ((activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== ''
                                                                        ? Math.round((activeGroup ? activeGroup.lineHeight : font.lineHeight) * baseFontSize)
                                                                        : '')
                                                                }
                                                                disabled={(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'}
                                                                onChange={(e) => {
                                                                    const val = parseFloat(e.target.value);
                                                                    if (!isNaN(val)) {
                                                                        if (activeGroup) {
                                                                            updateMetricGroup(activeGroup.id, { lineHeight: val / baseFontSize });
                                                                        } else {
                                                                            updateFallbackFontOverride(font.id, 'lineHeight', val / baseFontSize);
                                                                        }
                                                                    }
                                                                }}
                                                                className={`w-8 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${(activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== '' && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== 'normal'
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">px</span>
                                                        </div>
                                                        <div className="w-px h-3 bg-slate-200"></div>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'
                                                                    ? '-'
                                                                    : ((activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== '' ? Math.round((activeGroup ? activeGroup.lineHeight : font.lineHeight) * 100) : '')
                                                                }
                                                                disabled={(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { lineHeight: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'lineHeight', v);

                                                                    if (val === '') {
                                                                        targetUpdater('');
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            targetUpdater(parsed / 100);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    const currentVal = activeGroup ? activeGroup.lineHeight : font.lineHeight;
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { lineHeight: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'lineHeight', v);

                                                                    if (isNaN(val)) {
                                                                        if (currentVal !== 'normal') {
                                                                            targetUpdater(undefined);
                                                                        }
                                                                    } else {
                                                                        val = Math.max(50, Math.min(400, val));
                                                                        targetUpdater(val / 100);
                                                                    }
                                                                }}
                                                                className={`w-10 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${(activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== '' && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== 'normal'
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // For group, we just toggle to 'normal'
                                                            if (activeGroup) {
                                                                updateMetricGroup(activeGroup.id, { lineHeight: 'normal' });
                                                            } else {
                                                                toggleFallbackLineHeightAuto?.(font.id);
                                                            }
                                                        }}
                                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border transition-colors ${(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                                            }`}
                                                        title="Use default font line height (ignores primary font line height)"
                                                        type="button"
                                                    >
                                                        Auto
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="4.0"
                                                step="0.05"
                                                disabled={(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'}
                                                value={(activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== '' && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== 'normal' ? (activeGroup ? activeGroup.lineHeight : font.lineHeight) : lineHeight}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (activeGroup) {
                                                        updateMetricGroup(activeGroup.id, { lineHeight: val });
                                                    } else {
                                                        updateFallbackFontOverride(font.id, 'lineHeight', val);
                                                    }
                                                }}
                                                className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${(activeGroup ? activeGroup.lineHeight : font.lineHeight) === 'normal'
                                                    ? 'opacity-50 cursor-not-allowed accent-indigo-600'
                                                    : ((activeGroup ? activeGroup.lineHeight : font.lineHeight) !== undefined && (activeGroup ? activeGroup.lineHeight : font.lineHeight) !== ''
                                                        ? 'accent-indigo-600'
                                                        : 'accent-slate-400')
                                                    }`}
                                            />
                                        </div>
                                    )}

                                    {/* Letter Spacing Slider - Only show for Primary Overrides */}
                                    {font.isPrimaryOverride && (
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Letter Spacing</span>
                                                <div className="flex items-center gap-2">
                                                    {(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== '' ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (activeGroup) {
                                                                    updateMetricGroup(activeGroup.id, { letterSpacing: undefined });
                                                                } else {
                                                                    updateFallbackFontOverride(font.id, 'letterSpacing', undefined);
                                                                }
                                                            }}
                                                            className="text-[9px] text-slate-400 hover:text-rose-500"
                                                            title="Reset Letter Spacing"
                                                            type="button"
                                                        >
                                                            ↺
                                                        </button>
                                                    ) : null}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={font.letterSpacing !== undefined && font.letterSpacing !== ''
                                                                    ? Math.round(parseFloat(font.letterSpacing) * baseFontSize)
                                                                    : ''
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') {
                                                                        updateFallbackFontOverride(font.id, 'letterSpacing', '');
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            updateFallbackFontOverride(font.id, 'letterSpacing', parsed / baseFontSize);
                                                                        }
                                                                    }
                                                                }}
                                                                className={`w-8 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${font.letterSpacing !== undefined && font.letterSpacing !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">px</span>
                                                        </div>
                                                        <div className="w-px h-3 bg-slate-200"></div>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== '' ? (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { letterSpacing: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'letterSpacing', v);

                                                                    if (val === '') {
                                                                        targetUpdater('');
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            targetUpdater(parsed);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { letterSpacing: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'letterSpacing', v);

                                                                    if (isNaN(val)) {
                                                                        targetUpdater(undefined);
                                                                    } else {
                                                                        val = Math.max(-0.1, Math.min(0.5, val));
                                                                        targetUpdater(val);
                                                                    }
                                                                }}
                                                                className={`w-10 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />

                                                            <span className="font-mono text-[9px] text-slate-400">px</span>
                                                        </div>
                                                        <div className="w-px h-3 bg-slate-200"></div>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="text"
                                                                value={(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== '' ? (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) : ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { letterSpacing: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'letterSpacing', v);

                                                                    if (val === '') {
                                                                        targetUpdater('');
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            targetUpdater(parsed);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    const targetUpdater = activeGroup
                                                                        ? (v) => updateMetricGroup(activeGroup.id, { letterSpacing: v })
                                                                        : (v) => updateFallbackFontOverride(font.id, 'letterSpacing', v);

                                                                    if (isNaN(val)) {
                                                                        targetUpdater(undefined);
                                                                    } else {
                                                                        val = Math.max(-0.1, Math.min(0.5, val));
                                                                        targetUpdater(val);
                                                                    }
                                                                }}
                                                                className={`w-10 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">em</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min="-0.1"
                                                max="0.5"
                                                step="0.01"
                                                value={(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== '' ? (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) : (globalLetterSpacing || 0)}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    if (activeGroup) {
                                                        updateMetricGroup(activeGroup.id, { letterSpacing: val });
                                                    } else {
                                                        updateFallbackFontOverride(font.id, 'letterSpacing', val);
                                                    }
                                                }}
                                                className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${(activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== undefined && (activeGroup ? activeGroup.letterSpacing : font.letterSpacing) !== ''
                                                    ? 'accent-indigo-600'
                                                    : 'accent-slate-400'
                                                    }`}
                                            />
                                        </div>
                                    )}

                                    {/* Weight Override for Variable Fonts */}
                                    {font.isVariable && (
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Weight Override</span>
                                                <div className="flex items-center gap-2">
                                                    {(activeGroup ? activeGroup.weightOverride : font.weightOverride) !== undefined && (activeGroup ? activeGroup.weightOverride : font.weightOverride) !== '' ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (activeGroup) {
                                                                    updateMetricGroup(activeGroup.id, { weightOverride: undefined });
                                                                } else {
                                                                    updateFallbackFontOverride(font.id, 'weightOverride', undefined);
                                                                }
                                                            }}
                                                            className="text-[9px] text-slate-400 hover:text-rose-500"
                                                            title="Reset Weight Override"
                                                            type="button"
                                                        >
                                                            ↺
                                                        </button>
                                                    ) : null}
                                                    <span className="font-mono text-indigo-600 font-bold">
                                                        {(activeGroup ? activeGroup.weightOverride : font.weightOverride) || 'Auto'}
                                                    </span>
                                                </div>
                                            </div>
                                            <input
                                                type="range"
                                                min={font.axes?.weight?.min || 100}
                                                max={font.axes?.weight?.max || 900}
                                                value={(activeGroup ? activeGroup.weightOverride : font.weightOverride) || 400}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    if (activeGroup) {
                                                        updateMetricGroup(activeGroup.id, { weightOverride: val });
                                                    } else {
                                                        updateFallbackFontOverride(font.id, 'weightOverride', val);
                                                    }
                                                }}
                                                className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${(activeGroup ? activeGroup.weightOverride : font.weightOverride)
                                                    ? 'accent-indigo-600'
                                                    : 'accent-slate-400'
                                                    }`}
                                            />
                                        </div>
                                    )}


                                    {/* Advanced Metrics Toggle */}
                                    <div className="flex items-center justify-between mt-4 mb-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowAdvanced(!showAdvanced);
                                            }}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-wider text-left transition-colors"
                                            type="button"
                                        >
                                            <span>ADVANCED</span>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                                className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                                            >
                                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                            </svg>
                                        </button>

                                        {showAdvanced && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-amber-500 animate-in fade-in slide-in-from-left-1 duration-200">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                                </svg>
                                                <span>Not supported by Safari</span>
                                            </div>
                                        )}
                                    </div>

                                    {showAdvanced && (
                                        <div className="space-y-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">

                                            {/* Ascent Override (CSS ascent-override) */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>Ascent Override</span>
                                                    <div className="flex items-center gap-2">
                                                        {font.ascentOverride !== undefined && font.ascentOverride !== '' ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateFallbackFontOverride(font.id, 'ascentOverride', undefined);
                                                                }}
                                                                className="text-[9px] text-slate-400 hover:text-rose-500"
                                                                title="Reset Ascent Override"
                                                                type="button"
                                                            >
                                                                ↺
                                                            </button>
                                                        ) : null}
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                step="5"
                                                                min="0"
                                                                max="200"
                                                                value={font.ascentOverride !== undefined && font.ascentOverride !== '' ? Math.round(font.ascentOverride * 100) : ''}
                                                                placeholder="none"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') {
                                                                        updateFallbackFontOverride(font.id, 'ascentOverride', undefined);
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            updateFallbackFontOverride(font.id, 'ascentOverride', parsed / 100);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) {
                                                                        if (e.target.value === '') updateFallbackFontOverride(font.id, 'ascentOverride', undefined);
                                                                    } else {
                                                                        val = Math.max(0, Math.min(200, val));
                                                                        updateFallbackFontOverride(font.id, 'ascentOverride', val / 100);
                                                                    }
                                                                }}
                                                                className={`w-12 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${font.ascentOverride !== undefined && font.ascentOverride !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="200"
                                                    step="5"
                                                    value={font.ascentOverride !== undefined && font.ascentOverride !== '' ? font.ascentOverride * 100 : 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        updateFallbackFontOverride(font.id, 'ascentOverride', val / 100);
                                                    }}
                                                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${font.ascentOverride !== undefined && font.ascentOverride !== ''
                                                        ? 'accent-indigo-600'
                                                        : 'accent-slate-400'
                                                        }`}
                                                />
                                            </div>

                                            {/* Descent Override (CSS descent-override) */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>Descent Override</span>
                                                    <div className="flex items-center gap-2">
                                                        {font.descentOverride !== undefined && font.descentOverride !== '' ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateFallbackFontOverride(font.id, 'descentOverride', undefined);
                                                                }}
                                                                className="text-[9px] text-slate-400 hover:text-rose-500"
                                                                title="Reset Descent Override"
                                                                type="button"
                                                            >
                                                                ↺
                                                            </button>
                                                        ) : null}
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                step="5"
                                                                min="0"
                                                                max="200"
                                                                value={font.descentOverride !== undefined && font.descentOverride !== '' ? Math.round(font.descentOverride * 100) : ''}
                                                                placeholder="none"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') {
                                                                        updateFallbackFontOverride(font.id, 'descentOverride', undefined);
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            updateFallbackFontOverride(font.id, 'descentOverride', parsed / 100);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) {
                                                                        if (e.target.value === '') updateFallbackFontOverride(font.id, 'descentOverride', undefined);
                                                                    } else {
                                                                        val = Math.max(0, Math.min(200, val));
                                                                        updateFallbackFontOverride(font.id, 'descentOverride', val / 100);
                                                                    }
                                                                }}
                                                                className={`w-12 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${font.descentOverride !== undefined && font.descentOverride !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="200"
                                                    step="5"
                                                    value={font.descentOverride !== undefined && font.descentOverride !== '' ? font.descentOverride * 100 : 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        updateFallbackFontOverride(font.id, 'descentOverride', val / 100);
                                                    }}
                                                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${font.descentOverride !== undefined && font.descentOverride !== ''
                                                        ? 'accent-indigo-600'
                                                        : 'accent-slate-400'
                                                        }`}
                                                />
                                            </div>

                                            {/* Line Gap Override (CSS line-gap-override) */}
                                            <div>
                                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                    <span>Line Gap Override</span>
                                                    <div className="flex items-center gap-2">
                                                        {font.lineGapOverride !== undefined && font.lineGapOverride !== '' ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateFallbackFontOverride(font.id, 'lineGapOverride', undefined);
                                                                }}
                                                                className="text-[9px] text-slate-400 hover:text-rose-500"
                                                                title="Reset Line Gap Override"
                                                                type="button"
                                                            >
                                                                ↺
                                                            </button>
                                                        ) : null}
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                step="5"
                                                                min="0"
                                                                max="200"
                                                                value={font.lineGapOverride !== undefined && font.lineGapOverride !== '' ? Math.round(font.lineGapOverride * 100) : ''}
                                                                placeholder="none"
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '') {
                                                                        updateFallbackFontOverride(font.id, 'lineGapOverride', undefined);
                                                                    } else {
                                                                        const parsed = parseFloat(val);
                                                                        if (!isNaN(parsed)) {
                                                                            updateFallbackFontOverride(font.id, 'lineGapOverride', parsed / 100);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    let val = parseFloat(e.target.value);
                                                                    if (isNaN(val)) {
                                                                        // Keep as is if empty string (placeholder)
                                                                        if (e.target.value === '') updateFallbackFontOverride(font.id, 'lineGapOverride', undefined);
                                                                    } else {
                                                                        val = Math.max(0, Math.min(200, val));
                                                                        updateFallbackFontOverride(font.id, 'lineGapOverride', val / 100);
                                                                    }
                                                                }}
                                                                className={`w-12 text-right font-mono bg-transparent border-b focus:border-indigo-600 focus:outline-none px-0.5 ${font.lineGapOverride !== undefined && font.lineGapOverride !== ''
                                                                    ? 'border-indigo-300 text-indigo-600 font-bold'
                                                                    : 'border-slate-300 text-slate-500'
                                                                    }`}
                                                            />
                                                            <span className="font-mono text-[9px] text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="200"
                                                    step="5"
                                                    value={font.lineGapOverride !== undefined && font.lineGapOverride !== '' ? font.lineGapOverride * 100 : 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        updateFallbackFontOverride(font.id, 'lineGapOverride', val / 100);
                                                    }}
                                                    className={`w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer block ${font.lineGapOverride !== undefined && font.lineGapOverride !== ''
                                                        ? 'accent-indigo-600'
                                                        : 'accent-slate-400'
                                                        }`}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )
            }
        </div >
    );
};

SortableFontCard.propTypes = {
    font: PropTypes.shape({
        id: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        fontObject: PropTypes.object,
        fileName: PropTypes.string,
        name: PropTypes.string,
        scale: PropTypes.number,
        lineHeight: PropTypes.number,
        axes: PropTypes.object,
        isVariable: PropTypes.bool,
        weightOverride: PropTypes.number,
        staticWeight: PropTypes.number,

        fontSizeAdjust: PropTypes.number,
        lineGapOverride: PropTypes.number,
        ascentOverride: PropTypes.number,
        descentOverride: PropTypes.number
    }).isRequired,
    index: PropTypes.number.isRequired,
    isActive: PropTypes.bool.isRequired,
    globalWeight: PropTypes.number,
    globalLineHeight: PropTypes.number,
    globalLetterSpacing: PropTypes.number,
    setGlobalLineHeight: PropTypes.func,
    setGlobalLetterSpacing: PropTypes.func,
    hasLineHeightOverrides: PropTypes.bool,
    lineHeightOverrideCount: PropTypes.number,
    resetAllLineHeightOverrides: PropTypes.func,
    toggleGlobalLineHeightAuto: PropTypes.func,
    toggleFallbackLineHeightAuto: PropTypes.func,
    previousLineHeight: PropTypes.number,
    setPreviousLineHeight: PropTypes.func,
    getFontColor: PropTypes.func.isRequired,
    updateFontColor: PropTypes.func.isRequired,
    getEffectiveFontSettings: PropTypes.func.isRequired,
    fontScales: PropTypes.object.isRequired,
    lineHeight: PropTypes.number.isRequired,
    updateFallbackFontOverride: PropTypes.func.isRequired,
    resetFallbackFontOverrides: PropTypes.func.isRequired,
    setActiveFont: PropTypes.func.isRequired,
    handleRemove: PropTypes.func.isRequired,
    updateFontWeight: PropTypes.func.isRequired,
    toggleFontVisibility: PropTypes.func.isRequired,
    languageTags: PropTypes.arrayOf(PropTypes.string),
    isDraggable: PropTypes.bool,
    onRemoveOverride: PropTypes.func
};

const FontTabs = () => {
    const {
        fonts,
        activeFont,
        setActiveFont,
        updateFontWeight,
        toggleFontVisibility,
        updateFallbackFontOverride,
        resetFallbackFontOverrides,
        removeFallbackFont,
        reorderFonts,
        colors,
        setColors,
        weight, // Global weight
        fontScales,
        lineHeight,
        previousLineHeight,
        setPreviousLineHeight,
        toggleGlobalLineHeightAuto,
        toggleFallbackLineHeightAuto,
        fallbackLineHeight,
        fallbackLetterSpacing,
        getFontColor,
        updateFontColor,
        getEffectiveFontSettings,
        fallbackFontOverrides,
        primaryFontOverrides,
        removeLanguageGroup,
        metricGroups,
        updateMetricGroup,
        createEmptyMetricGroup
    } = useTypo();

    const [showAdder, setShowAdder] = useState(false);
    const [showGroupCreator, setShowGroupCreator] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [fallbackFont, setFallbackFont] = useState('sans-serif');

    // Helper to determine if a font is a system font
    const isSystemFont = (font) => font.type === 'fallback' && !font.fontObject;

    // Filter fonts for the global list (exclude language-specific ones)
    // Filter fonts for the global list (exclude language-specific ones)
    // Filter fonts for the global list (exclude language-specific ones)
    const {
        primary,
        primaryOverrideGroups,
        globalFallbackFonts,
        systemFonts,
        overriddenFonts
    } = useMemo(
        () => groupAndSortFonts(fonts, fallbackFontOverrides, primaryFontOverrides, metricGroups),
        [fonts, fallbackFontOverrides, primaryFontOverrides, metricGroups]
    );

    const handleRemove = (e, fontId) => {
        e.stopPropagation();
        if (confirm('Remove this font?')) {
            removeFallbackFont(fontId);
        }
    };

    const handleRemoveOverride = (fontId, langId) => {
        // Check if it's a primary override
        const isPrimaryOverride = primaryFontOverrides?.[langId] === fontId;

        if (isPrimaryOverride) {
            // This logic is now handled by `removeLanguageGroup` or direct font removal
            // clearPrimaryFontOverride(langId); // This function is removed from context
            return;
        }

        // Remove the override
        // clearFallbackFontOverride(langId); // This function is removed from context

        // Check if this was the last override for this font
        const otherOverrides = Object.entries(fallbackFontOverrides).filter(([lId, fId]) =>
            fId === fontId && lId !== langId
        );

        if (otherOverrides.length === 0) {
            // No other language uses this font as an override.
            // It will return to the global fallback list (if it's not primary).
            // Move it to the bottom of the fallback list.
            const currentIndex = fonts.findIndex(f => f.id === fontId);
            const targetIndex = fonts.length - 1; // Move to end

            if (currentIndex !== -1 && currentIndex !== targetIndex) {
                reorderFonts(currentIndex, targetIndex);
            }
        }
    };

    return (
        <div className="pb-4 space-y-2">



            {globalFallbackFonts.map((font) => (
                <SortableFontCard
                    key={font.id}
                    font={font}
                    index={(fonts || []).findIndex(f => f.id === font.id)}
                    isActive={font.id === activeFont}
                    globalWeight={weight || 400}
                    getFontColor={getFontColor}
                    updateFontColor={updateFontColor}
                    getEffectiveFontSettings={getEffectiveFontSettings}
                    fontScales={fontScales}
                    lineHeight={lineHeight}
                    updateFallbackFontOverride={updateFallbackFontOverride}
                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                    setActiveFont={setActiveFont}
                    handleRemove={handleRemove}
                    updateFontWeight={updateFontWeight}
                    toggleFontVisibility={toggleFontVisibility}
                    previousLineHeight={previousLineHeight}
                    setPreviousLineHeight={setPreviousLineHeight}
                    toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                    toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                    globalLineHeight={fallbackLineHeight}
                    globalLetterSpacing={fallbackLetterSpacing}
                />
            ))}



            {/* Primary Font Groups */}
            {primaryOverrideGroups && primaryOverrideGroups.length > 0 && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Primary Overrides
                        </span>
                    </div>

                    <div className="space-y-4">
                        {primaryOverrideGroups.map((item, idx) => {
                            if (item.type === 'group') {
                                return (
                                    <PrimaryOverrideGroup
                                        key={item.group.id}
                                        group={item.group}
                                        fonts={item.fonts}
                                        activeFont={activeFont}
                                        fontScales={fontScales}
                                        lineHeight={lineHeight}
                                        updateMetricGroup={updateMetricGroup}
                                        weight={weight}
                                        setActiveFont={setActiveFont}
                                        getFontColor={getFontColor}
                                        updateFontColor={updateFontColor}
                                        getEffectiveFontSettings={getEffectiveFontSettings}
                                        toggleFontVisibility={toggleFontVisibility}
                                        updateFontWeight={updateFontWeight}
                                        removeFallbackFont={removeFallbackFont}
                                        previousLineHeight={previousLineHeight}
                                        setPreviousLineHeight={setPreviousLineHeight}
                                        toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                                        toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                                        fallbackLineHeight={fallbackLineHeight}
                                        fallbackLetterSpacing={fallbackLetterSpacing}
                                        baseFontSize={16}
                                    />
                                );
                            } else {
                                // Standalone Primary Overrides
                                return (
                                    <div key={`standalone-${idx}`} className="space-y-2">
                                        {item.fonts.map(({ font, langIds }) => (
                                            <div key={font.id} className="relative">
                                                <SortableFontCard
                                                    font={font}
                                                    isActive={activeFont === font.id}
                                                    getFontColor={getFontColor}
                                                    updateFontColor={updateFontColor}
                                                    getEffectiveFontSettings={getEffectiveFontSettings}
                                                    fontScales={fontScales}
                                                    lineHeight={lineHeight}
                                                    isDraggable={false}
                                                    onRemoveOverride={null}
                                                    languageTags={langIds}
                                                    setActiveFont={setActiveFont}
                                                    handleRemove={(e) => {
                                                        removeFallbackFont(font.id);
                                                    }}
                                                    globalWeight={weight || 400}
                                                    updateFontWeight={updateFontWeight}
                                                    toggleFontVisibility={toggleFontVisibility}
                                                    updateFallbackFontOverride={updateFallbackFontOverride}
                                                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                                                    previousLineHeight={previousLineHeight}
                                                    setPreviousLineHeight={setPreviousLineHeight}
                                                    toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                                                    toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                                                    globalLineHeight={lineHeight}
                                                    globalLetterSpacing={0}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                        })}
                    </div>
                </div>
            )}


            {/* Language Specific Fallbacks */}
            {overriddenFonts && overriddenFonts.length > 0 && (
                <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Language Specific Fallbacks
                        </span>
                        <div className="h-px flex-1 bg-slate-200"></div>
                    </div>

                    <div className="space-y-4">
                        {overriddenFonts.map(({ font, languages: langIds }) => (
                            <div key={font.id} className="relative">
                                <SortableFontCard
                                    font={font}
                                    isActive={activeFont === font.id}
                                    getFontColor={getFontColor}
                                    updateFontColor={updateFontColor}
                                    getEffectiveFontSettings={getEffectiveFontSettings}
                                    fontScales={fontScales}
                                    lineHeight={lineHeight}
                                    isDraggable={false}
                                    onRemoveOverride={handleRemoveOverride}
                                    languageTags={langIds}
                                    setActiveFont={setActiveFont}
                                    handleRemove={(e) => {
                                        removeFallbackFont(font.id);
                                    }}
                                    globalWeight={weight || 400}
                                    updateFontWeight={updateFontWeight}
                                    toggleFontVisibility={toggleFontVisibility}
                                    updateFallbackFontOverride={updateFallbackFontOverride}
                                    resetFallbackFontOverrides={resetFallbackFontOverrides}
                                    previousLineHeight={previousLineHeight}
                                    setPreviousLineHeight={setPreviousLineHeight}
                                    toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                                    toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                                    globalLineHeight={fallbackLineHeight}
                                    globalLetterSpacing={fallbackLetterSpacing}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-slate-200 my-4" />
                </div>
            )}

            {/* Static System Fallback Tab */}
            <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-200 border-dashed relative select-none">
                <div className="flex items-center gap-2 mb-1">
                    <div className="relative w-3 h-3 flex-shrink-0 cursor-pointer group">
                        <div
                            className="absolute inset-0 rounded-full ring-1 ring-slate-200 group-hover:ring-indigo-300 transition-shadow"
                            style={{ backgroundColor: colors.missing }}
                        />
                        <input
                            type="color"
                            value={colors.missing}
                            onChange={(e) => setColors(prev => ({ ...prev, missing: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title="Change system fallback color"
                        />
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        SYSTEM DEFAULT
                    </div>
                </div>

                {/* System Fonts List (fonts added by name without uploaded files) */}
                {systemFonts && systemFonts.length > 0 && (
                    <div className="space-y-2 mt-3 mb-3">
                        {systemFonts.map((font) => (
                            <SortableFontCard
                                key={font.id}
                                font={font}
                                index={(fonts || []).findIndex(f => f.id === font.id)}
                                isActive={font.id === activeFont}
                                globalWeight={weight}
                                getFontColor={getFontColor}
                                updateFontColor={updateFontColor}
                                getEffectiveFontSettings={getEffectiveFontSettings}
                                fontScales={fontScales}
                                lineHeight={lineHeight}
                                updateFallbackFontOverride={updateFallbackFontOverride}
                                resetFallbackFontOverrides={resetFallbackFontOverrides}
                                setActiveFont={setActiveFont}
                                handleRemove={handleRemove}
                                updateFontWeight={updateFontWeight}
                                toggleFontVisibility={toggleFontVisibility}
                                isDraggable={false}
                                previousLineHeight={previousLineHeight}
                                setPreviousLineHeight={setPreviousLineHeight}
                                toggleGlobalLineHeightAuto={toggleGlobalLineHeightAuto}
                                toggleFallbackLineHeightAuto={toggleFallbackLineHeightAuto}
                                globalLineHeight={fallbackLineHeight}
                                globalLetterSpacing={fallbackLetterSpacing}
                            />
                        ))}
                    </div>
                )}

                <div className={systemFonts && systemFonts.length > 0 ? "mt-3" : "mt-3"}>
                    <div className="flex bg-slate-100 rounded-md p-0.5 border border-slate-200 w-full">
                        <button
                            onClick={() => setFallbackFont('sans-serif')}
                            className={`flex-1 py-1 text-[10px] rounded-sm transition-all ${fallbackFont === 'sans-serif'
                                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Sans-serif
                        </button>
                        <button
                            onClick={() => setFallbackFont('serif')}
                            className={`flex-1 py-1 text-[10px] rounded-sm transition-all ${fallbackFont === 'serif'
                                ? 'bg-white text-indigo-600 shadow-sm font-bold'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Serif
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Fallback Font Button */}
            <button
                onClick={() => setShowAdder(!showAdder)}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 border-dashed rounded-lg p-2.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 transition-transform duration-300 ${showAdder ? 'rotate-45' : 'rotate-0'}`}
                >
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                <span>{showAdder ? 'Cancel' : 'Add Fallback Font'}</span>
            </button>

            {/* Fallback Font Adder */}
            {
                showAdder && (
                    <FallbackFontAdder
                        onClose={() => setShowAdder(false)}
                        onAdd={() => setShowAdder(false)}
                    />
                )
            }

            {/* Create Primary Group Button */}
            <button
                onClick={() => setShowGroupCreator(!showGroupCreator)}
                className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 border-dashed rounded-lg p-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all flex items-center justify-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${showGroupCreator ? 'rotate-45' : ''}`}>
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                <span>{showGroupCreator ? 'Cancel' : 'Create Primary Override Group'}</span>
            </button>

            {showGroupCreator && (
                <div className="mt-2 p-3 bg-white border border-indigo-100 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Group Name
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="e.g. Serif Languages"
                            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newGroupName.trim()) {
                                    createEmptyMetricGroup(newGroupName.trim());
                                    setNewGroupName('');
                                    setShowGroupCreator(false);
                                }
                            }}
                        />
                        <button
                            disabled={!newGroupName.trim()}
                            onClick={() => {
                                if (newGroupName.trim()) {
                                    createEmptyMetricGroup(newGroupName.trim());
                                    setNewGroupName('');
                                    setShowGroupCreator(false);
                                }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default FontTabs;
