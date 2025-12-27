import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTypo } from '../context/useTypo';
import { parseFontFile, createFontUrl } from '../services/FontLoader';
import FontLanguageModal from './FontLanguageModal';

const FontUploader = () => {
    const { loadFont, addFallbackFonts, addLanguageSpecificFallbackFont } = useTypo();
    const [pendingFonts, setPendingFonts] = useState([]);

    const handleFiles = useCallback(async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const processedFonts = [];
        let errorCount = 0;

        // Process all files
        for (const file of files) {
            try {
                const { font, metadata } = await parseFontFile(file);
                const url = createFontUrl(file);
                processedFonts.push({ font, metadata, url, file });
            } catch (err) {
                console.error(`Error parsing font ${file.name}: `, err);
                errorCount++;
            }
        }

        if (processedFonts.length > 0) {
            setPendingFonts(processedFonts);
        }

        if (errorCount > 0) {
            alert(`Failed to parse ${errorCount} font file(s).`);
        }
    }, []);

    const handleModalConfirm = ({ assignments, orderedFonts }) => {
        const autoFonts = [];
        const primaryItem = orderedFonts[0];

        // Use the ordered list from the modal
        orderedFonts.forEach((item, index) => {
            if (index === 0) return; // Skip primary

            const assignment = assignments[item.file.name];
            if (assignment === 'auto') {
                autoFonts.push(item);
            } else {
                // Language specific fallback assignment
                addLanguageSpecificFallbackFont(
                    item.font,
                    item.url,
                    item.file.name,
                    item.metadata,
                    assignment
                );
            }
        });

        // Load the designated Primary font first
        if (primaryItem) {
            loadFont(primaryItem.font, primaryItem.url, primaryItem.file.name, primaryItem.metadata);
        }

        // Remaining auto fonts become Fallbacks in the order they were in orderedFonts
        if (autoFonts.length > 0) {
            const fallbacks = autoFonts.map(item => {
                return {
                    id: `fallback - ${Date.now()} -${Math.random().toString(36).substr(2, 9)} `,
                    type: 'fallback',
                    fontObject: item.font,
                    fontUrl: item.url,
                    fileName: item.file.name,
                    name: item.file.name,
                    axes: item.metadata.axes,
                    isVariable: item.metadata.isVariable,
                    staticWeight: item.metadata.staticWeight ?? null
                };
            });
            addFallbackFonts(fallbacks);
        }

        setPendingFonts([]);
    };

    const handleModalCancel = () => {
        setPendingFonts([]);
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const fileInputRef = useRef(null);

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                onChange={onInputChange}
            />
            <div
                className={clsx(
                    "group relative overflow-hidden",
                    "border-2 border-dashed border-slate-300 rounded-xl p-12",
                    "bg-white",
                    "flex flex-col items-center justify-center text-center",
                    "transition-all duration-300 ease-in-out",
                    "hover:border-indigo-500 hover:bg-slate-50/50 hover:shadow-lg hover:shadow-indigo-500/10",
                    "cursor-pointer"
                )}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => fileInputRef.current?.click()}
            >

                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-indigo-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                </div>

                <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Drop Font Files Here
                </h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                    Drag & drop multiple files, or click to browse.
                </p>

                <div className="flex gap-2">
                    {['TTF', 'OTF', 'WOFF', 'WOFF2'].map(ext => (
                        <span key={ext} className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">
                            {ext}
                        </span>
                    ))}
                </div>
            </div>

            {pendingFonts.length > 0 && (
                <FontLanguageModal
                    pendingFonts={pendingFonts}
                    onConfirm={handleModalConfirm}
                    onCancel={handleModalCancel}
                />
            )}
        </>
    );
};

export default FontUploader;
