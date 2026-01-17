import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import LanguageList from './LanguageList';
import FontSelectionModal from './FontSelectionModal';

const AddLanguageModal = ({ onClose, onConfirm, filterGroup = null }) => {
    const { fonts, addFallbackFonts } = useTypo();

    // State
    const [selectedLangId, setSelectedLangId] = useState(null);
    const [selectedFontId, setSelectedFontId] = useState('inherit'); // 'inherit' or fontId
    const [showFontPicker, setShowFontPicker] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // File Input Ref
    const fileInputRef = useRef(null);

    // Derived state
    const selectedFont = fonts.find(f => f.id === selectedFontId);
    const isInherited = selectedFontId === 'inherit';

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showFontPicker) setShowFontPicker(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose, showFontPicker]);

    const handleConfirm = () => {
        if (!selectedLangId) return;
        onConfirm(selectedLangId, selectedFontId);
    };

    const handleFontSelect = (fontId) => {
        setSelectedFontId(fontId);
        // Font picker closes automatically via its own onClose prop if needed, 
        // but here we are using it as an overlay, so we close it manually
        setShowFontPicker(false);
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        try {
            const { font, metadata } = await parseFontFile(file);
            const url = createFontUrl(file);

            // Create font object consistent with TypoContext structure
            const newFont = {
                id: `uploaded-${Date.now()}`,
                type: 'fallback', // Initially add as fallback to make it available
                fontObject: font,
                fontUrl: url,
                fileName: file.name,
                name: file.name,
                axes: metadata.axes,
                isVariable: metadata.isVariable,
                staticWeight: metadata.staticWeight ?? null
            };

            // Add to context so it's available in fonts list
            addFallbackFonts([newFont]);

            // Select it immediately
            setSelectedFontId(newFont.id);

        } catch (err) {
            console.error('Failed to parse font:', err);
            alert('Failed to load font file. Please try a valid font file.');
        } finally {
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Prepare font options for the picker
    const fontOptions = fonts.map(f => ({
        id: f.id,
        label: f.name || f.fileName || 'Unknown Font',
        fileName: f.fileName
    }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[100] p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mt-12 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-2 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Add Language"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Add Language</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Select a language to add to your configuration
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Left Panel: Language Selection */}
                    <div className="flex-1 border-r border-gray-100 flex flex-col min-w-0">
                        {/* Search Input */}
                        <div className="p-3 border-b border-gray-100 bg-white shrink-0">
                            <input
                                type="text"
                                placeholder="Search languages..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <LanguageList
                            selectedIds={selectedLangId}
                            onSelect={setSelectedLangId}
                            mode="single"
                            searchTerm={searchTerm}
                            filterGroup={filterGroup}
                        // Filter out already configured languages? Usually good UX but maybe user wants to re-add/reset?
                        // Let's keep all but visually indicate if needed. 
                        // For now, simple list.
                        />
                    </div>

                    {/* Right Panel: Font Configuration (Only visible if language selected) */}
                    {selectedLangId && (
                        <div className="w-80 bg-slate-50/50 flex flex-col p-6 border-l border-gray-100 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                                Font Configuration
                            </h3>

                            <div className="space-y-4">
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Choose which font should be used as the <strong>Primary Font</strong> for this language.
                                </p>

                                {/* Option: Inherit */}
                                <button
                                    onClick={() => setSelectedFontId('inherit')}
                                    className={`
                                        w-full p-3 rounded-lg border text-left transition-all
                                        ${isInherited
                                            ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/10'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isInherited ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {isInherited && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`text-sm font-bold ${isInherited ? 'text-indigo-900' : 'text-slate-700'}`}>Inherit Primary Font</span>
                                    </div>
                                    <div className="text-xs text-slate-500 pl-7">
                                        Use the global primary font stack. Best for most languages using the same script.
                                    </div>
                                </button>

                                {/* Option: Custom Font */}
                                <button
                                    onClick={() => setShowFontPicker(true)}
                                    className={`
                                        w-full p-3 rounded-lg border text-left transition-all relative overflow-hidden
                                        ${!isInherited
                                            ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/10'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isInherited ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                                            {!isInherited && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`text-sm font-bold ${!isInherited ? 'text-indigo-900' : 'text-slate-700'}`}>Select Custom Font</span>
                                    </div>
                                    <div className="text-xs text-slate-500 pl-7 mb-2">
                                        Override the primary font for this language only.
                                    </div>

                                    {!isInherited && selectedFont && (
                                        <div className="ml-7 p-2 rounded bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700 truncate">
                                            {selectedFont.name || selectedFont.fileName}
                                        </div>
                                    )}
                                </button>

                                {/* Option: Upload Font */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".ttf,.otf,.woff,.woff2"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-3 rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-600 group-hover:text-indigo-700">Upload New Font</div>
                                            <div className="text-[10px] text-slate-400">Add a font file to use immediately</div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedLangId}
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                        Add Language
                    </button>
                </div>
            </div>

            {/* Nested Font Picker */}
            {showFontPicker && (
                <div className="absolute inset-0 z-[110]">
                    <FontSelectionModal
                        onClose={() => setShowFontPicker(false)}
                        onSelect={handleFontSelect}
                        currentFontId={selectedFontId}
                        fontOptions={fontOptions}
                        title={`Select Font for ${selectedLangId}`}
                    />
                </div>
            )}
        </div>
    );
};

AddLanguageModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    configuredLanguages: PropTypes.arrayOf(PropTypes.string),
    filterGroup: PropTypes.string
};

export default AddLanguageModal;
