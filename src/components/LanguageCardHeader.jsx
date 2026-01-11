import PropTypes from 'prop-types';
import InfoTooltip from './InfoTooltip';
import LanguageActionMenu from './LanguageActionMenu';

const LanguageCardHeader = ({
    language,
    isPrimary,
    hasVerifiableFont,
    supportHelpText,
    supportedPercent,
    isFullSupport,
    textOverride,
    showFallbackOrder,
    metricsPrimaryFont,
    currentFallbackFont, // The explicitly mapped font (if any)
    effectiveFallbackFont, // The one actually being used (mapped or auto) for color/badges
    fallbackOverrideFontId,
    currentFallbackLabel,
    isMapped,
    fallbackOverrideOptions,
    onSelectFallback,
    menuOpen,
    onToggleMenu,
    onCloseMenu,
    addLanguageSpecificFallbackFont,
    onStartEdit,
    onRemove,
    onUnmap
}) => {
    return (
        <div className="bg-slate-50/50 px-5 py-3 border-b border-gray-100 flex flex-wrap gap-y-2 justify-between items-center backdrop-blur-sm relative z-30 rounded-t-xl">
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-sm text-slate-800 tracking-tight truncate">{language.name}</h3>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-200/60 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {language.id}
                        </span>
                        {isPrimary && (
                            <div className="flex items-center text-amber-500" title="Primary Language (Always Visible)" aria-label="Primary Language">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {hasVerifiableFont ? (
                        <InfoTooltip content={supportHelpText}>
                            <div
                                className={`text-[10px] font-mono border px-2 py-0.5 rounded-md whitespace-nowrap ${isFullSupport
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}
                            >
                                {supportedPercent}% Supported
                            </div>
                        </InfoTooltip>
                    ) : (
                        <div className="text-[10px] font-mono border px-2 py-0.5 rounded-md whitespace-nowrap bg-slate-100 text-slate-500 border-slate-200">
                            Unknown Support
                        </div>
                    )}

                    {textOverride && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Custom</span>
                    )}
                </div>

                {/* Font Indicators - Controlled by showFallbackOrder */}
                {showFallbackOrder && (
                    <div className="flex items-center gap-1.5 overflow-hidden pt-1">
                        {/* Primary Font (Background) */}
                        {(!currentFallbackFont || (metricsPrimaryFont && currentFallbackFont && metricsPrimaryFont.id !== currentFallbackFont.id && !currentFallbackFont.isPrimaryOverride)) && (
                            <>
                                <span
                                    className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap"
                                    title="Primary Font"
                                >
                                    {metricsPrimaryFont?.label || metricsPrimaryFont?.fileName?.replace(/\.[^/.]+$/, '') || metricsPrimaryFont?.name || 'Primary'}
                                </span>

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-300 flex-shrink-0">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}

                        {/* Mapped / Auto Font */}
                        {fallbackOverrideFontId !== 'legacy' && currentFallbackLabel && (
                            <>
                                <div
                                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide max-w-[200px]"
                                    style={effectiveFallbackFont?.color ? {
                                        backgroundColor: effectiveFallbackFont.color + '1A', // ~10% opacity
                                        color: effectiveFallbackFont.color,
                                        borderColor: effectiveFallbackFont.color + '40', // ~25% opacity
                                    } : {
                                        backgroundColor: '#EFF6FF', // blue-50
                                        color: '#2563EB', // blue-600
                                        borderColor: '#DBEAFE' // blue-100
                                    }}
                                    title={isMapped ? `Mapped to: ${currentFallbackLabel}` : `Using Global Fallback: ${currentFallbackLabel}`}
                                >
                                    {/* Icon */}
                                    {isMapped ? (
                                        // Pin Icon (Mapped)
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 flex-shrink-0 opacity-70">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                        </svg>
                                    ) : (
                                        // Unpin Icon (Unmapped/Global) - "Unmap" style
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 flex-shrink-0 opacity-70">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                                        </svg>
                                    )}

                                    <span className="truncate">
                                        {currentFallbackLabel}
                                    </span>
                                </div>

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-slate-300 flex-shrink-0">
                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                </svg>
                            </>
                        )}

                        {/* System Fallback */}
                        <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide bg-slate-50 text-slate-400 border border-slate-200 whitespace-nowrap opacity-75"
                            title="System Fallback"
                        >
                            System
                        </span>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <LanguageActionMenu
                    language={language}
                    currentFallbackLabel={currentFallbackLabel}
                    fallbackOverrideFontId={fallbackOverrideFontId}
                    fallbackOverrideOptions={fallbackOverrideOptions}
                    isMapped={isMapped}
                    onSelectFallback={onSelectFallback}
                    isOpen={menuOpen}
                    onToggle={onToggleMenu}
                    onClose={onCloseMenu}
                    addLanguageSpecificFallbackFont={addLanguageSpecificFallbackFont}
                    onStartEdit={onStartEdit}
                    onRemove={onRemove}
                    onUnmap={onUnmap}
                />
            </div>
        </div>
    );
};

LanguageCardHeader.propTypes = {
    language: PropTypes.object.isRequired,
    isPrimary: PropTypes.bool,
    hasVerifiableFont: PropTypes.bool,
    supportHelpText: PropTypes.string,
    supportedPercent: PropTypes.number,
    isFullSupport: PropTypes.bool,
    textOverride: PropTypes.string,
    showFallbackOrder: PropTypes.bool,
    metricsPrimaryFont: PropTypes.object,
    currentFallbackFont: PropTypes.object,
    effectiveFallbackFont: PropTypes.object,
    fallbackOverrideFontId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    currentFallbackLabel: PropTypes.string,
    isMapped: PropTypes.bool,
    fallbackOverrideOptions: PropTypes.array,
    onSelectFallback: PropTypes.func.isRequired,
    menuOpen: PropTypes.bool.isRequired,
    onToggleMenu: PropTypes.func.isRequired,
    onCloseMenu: PropTypes.func.isRequired,
    addLanguageSpecificFallbackFont: PropTypes.func.isRequired,
    onStartEdit: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onUnmap: PropTypes.func.isRequired
};

export default LanguageCardHeader;
