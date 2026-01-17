import { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { parseFontFile, createFontUrl } from '../../../shared/services/FontLoader';
import FontSelectionModal from './FontSelectionModal';

const LanguageActionMenu = ({
    language,
    currentFallbackLabel,
    fallbackOverrideFontId,
    fallbackOverrideOptions,
    onSelectFallback,
    isOpen,
    onToggle,
    onClose,
    addLanguageSpecificFallbackFont,
    onStartEdit,
    onUnmap,
    isMapped,

    onRemove
}) => {
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);
    const [showFontModal, setShowFontModal] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);


    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { font: parsedFont, metadata } = await parseFontFile(file);
            const url = createFontUrl(file);

            addLanguageSpecificFallbackFont(
                parsedFont,
                url,
                file.name,
                metadata,
                language.id
            );

            onClose();
        } catch (err) {
            console.error('Error uploading fallback font:', err);
            alert('Failed to load font file. Please try another file.');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFileUpload}
            />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${isOpen
                        ? 'bg-indigo-50 text-indigo-600 ring-2 ring-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }
                `}
                title="Language Settings"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 14a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2 origin-top-right"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-1.5 space-y-0.5">
                        {/* Text Actions Section */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Text Content
                        </div>
                        <button
                            onClick={() => {
                                onStartEdit();
                                onClose();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-colors hover:bg-slate-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-indigo-600">
                                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">Edit Sample Sentence</span>
                        </button>
                        <div className="my-1 border-t border-slate-100" />

                        {/* Font Settings Section */}
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Typography
                        </div>
                        <button
                            onClick={() => {
                                setShowFontModal(true);
                                onClose();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-colors hover:bg-slate-50"
                        >
                            <div className="w-4 h-4 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 font-serif italic">Aa</div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">Map Font</div>
                                <div className="text-[10px] text-slate-400 truncate">{currentFallbackLabel}</div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                fileInputRef.current?.click();
                                onClose();
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-colors hover:bg-slate-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-indigo-600">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">Upload Font</span>
                        </button>

                        {isMapped && (
                            <button
                                onClick={() => {
                                    onUnmap();
                                    onClose();
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-colors hover:bg-slate-50"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-indigo-600">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">Unmap Language</span>
                            </button>
                        )}

                        <div className="my-1 border-t border-slate-100" />

                        {/* Danger Zone */}
                        <button
                            onClick={() => {
                                if (window.confirm(`Remove ${language.name} from your list?`)) {
                                    onRemove();
                                    onClose();
                                }
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 group transition-colors hover:bg-rose-50"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-rose-600">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 007.542-2.53l.841-10.518.149.022a.75.75 0 00.23-1.482 41.038 41.038 0 00-2.365-.298V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4V2.5h1.25c.69 0 1.25.56 1.25 1.25v.302c-.833-.051-1.666-.076-2.5-.076s-1.667.025-2.5.076V3.75A1.25 1.25 0 018.75 2.5H10zM14.25 7.75l-.822 10.276a1.25 1.25 0 01-1.247 1.153H7.819a1.25 1.25 0 01-1.247-1.153L5.75 7.75h8.5z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-rose-700">Remove Language</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Font Selection Modal */}
            {showFontModal && (
                <FontSelectionModal
                    onClose={() => setShowFontModal(false)}
                    onSelect={onSelectFallback}
                    currentFontId={fallbackOverrideFontId || ''}
                    fontOptions={fallbackOverrideOptions}
                    title={`Select Font for ${language.name}`}
                />
            )}
        </div>
    );
};

LanguageActionMenu.propTypes = {
    language: PropTypes.object.isRequired,
    currentFallbackLabel: PropTypes.string.isRequired,
    fallbackOverrideFontId: PropTypes.string,
    fallbackOverrideOptions: PropTypes.array.isRequired,
    onSelectFallback: PropTypes.func.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    addLanguageSpecificFallbackFont: PropTypes.func.isRequired,
    onStartEdit: PropTypes.func.isRequired,
    onUnmap: PropTypes.func.isRequired,
    isMapped: PropTypes.bool.isRequired,

    onRemove: PropTypes.func.isRequired
};

export default LanguageActionMenu;
