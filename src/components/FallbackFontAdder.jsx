import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import clsx from 'clsx';

const FallbackFontAdder = ({ onClose, onAdd }) => {
    const { addFallbackFont, addFallbackFonts } = useTypo();
    const [mode, setMode] = useState('upload'); // 'name' or 'upload'
    const [fontName, setFontName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        setIsProcessing(true);
        let errorCount = 0;

        try {
            const promises = Array.from(fileList).map(async (file) => {
                try {
                    const { font, metadata } = await parseFontFile(file);
                    const url = createFontUrl(file);
                    const fontId = `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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
                    console.error(`Error parsing font ${file.name}:`, err);
                    errorCount++;
                    return null;
                }
            });

            const results = await Promise.all(promises);
            const validFonts = results.filter(f => f !== null);

            if (validFonts.length > 0) {
                if (validFonts.length === 1) {
                    addFallbackFont(validFonts[0]);
                } else {
                    addFallbackFonts(validFonts);
                }
                onAdd && onAdd();
                onClose();
            }

            if (errorCount > 0) {
                alert(`Failed to parse ${errorCount} font file(s). Please ensure they are valid TTF, OTF, WOFF, or WOFF2 files.`);
            }

        } catch (err) {
            console.error('General error processing fonts:', err);
            alert('An unexpected error occurred while processing fonts.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNameSubmit = () => {
        if (!fontName.trim()) {
            alert('Please enter a font name');
            return;
        }

        const fontId = `fallback-${Date.now()}`;
        addFallbackFont({
            id: fontId,
            type: 'fallback',
            fontObject: null,
            fontUrl: null,
            fileName: null,
            name: fontName.trim()
        });

        onAdd && onAdd();
        onClose();
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">Add Fallback Font</h3>
                <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 bg-slate-50 p-1 rounded-lg">
                <button
                    onClick={() => setMode('upload')}
                    className={clsx(
                        "flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all border border-transparent",
                        mode === 'upload'
                            ? 'bg-white text-indigo-600 border-gray-200'
                            : 'text-slate-500 hover:text-slate-700'
                    )}
                >
                    Upload File
                </button>
                <button
                    onClick={() => setMode('name')}
                    className={clsx(
                        "flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all border border-transparent",
                        mode === 'name'
                            ? 'bg-white text-indigo-600 border-gray-200'
                            : 'text-slate-500 hover:text-slate-700'
                    )}
                >
                    Font Name
                </button>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
                <div
                    className={clsx(
                        "relative overflow-hidden",
                        "border-2 border-dashed rounded-lg p-6",
                        "bg-slate-50",
                        "flex flex-col items-center justify-center text-center",
                        "transition-all duration-300 ease-in-out",
                        "hover:border-indigo-500 hover:bg-slate-100",
                        isProcessing && "opacity-50 cursor-not-allowed",
                        !isProcessing && "cursor-pointer"
                    )}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onClick={() => !isProcessing && document.getElementById('fallback-font-input').click()}
                >
                    <input
                        type="file"
                        id="fallback-font-input"
                        className="hidden"
                        accept=".ttf,.otf,.woff,.woff2"
                        multiple
                        onChange={onInputChange}
                        disabled={isProcessing}
                    />

                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                        {isProcessing ? (
                            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        )}
                    </div>

                    <h4 className="text-sm font-bold mb-1 text-slate-800">
                        {isProcessing ? 'Processing Fonts...' : 'Drop Font Files Here'}
                    </h4>
                    <p className="text-slate-500 text-xs mb-4">
                        Drag & drop multiple files or click to browse
                    </p>

                    <div className="flex gap-2">
                        {['TTF', 'OTF', 'WOFF', 'WOFF2'].map(ext => (
                            <span key={ext} className="text-[9px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                {ext}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Font Name Input Mode */}
            {mode === 'name' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            System Font Name or Stack
                        </label>
                        <input
                            type="text"
                            value={fontName}
                            onChange={(e) => setFontName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleNameSubmit();
                                }
                            }}
                            placeholder="e.g., Arial, sans-serif or 'Roboto', sans-serif"
                            className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleNameSubmit}
                        disabled={!fontName.trim() || isProcessing}
                        className="w-full px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Add Font
                    </button>
                </div>
            )}
        </div>
    );
};

FallbackFontAdder.propTypes = {
    onClose: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired
};

export default FallbackFontAdder;


