import { useCallback } from 'react';
import clsx from 'clsx';
import { useTypo } from '../context/TypoContext';
import { parseFontFile, createFontUrl } from '../services/FontLoader';

const FontUploader = () => {
    const { loadFont, addFallbackFonts } = useTypo();

    const handleFiles = useCallback(async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const processedFonts = [];
        let errorCount = 0;

        // Process all files
        for (const file of files) {
            try {
                const font = await parseFontFile(file);
                const url = createFontUrl(file);
                processedFonts.push({ font, url, file });
            } catch (err) {
                console.error(`Error parsing font ${file.name}:`, err);
                errorCount++;
            }
        }

        if (processedFonts.length > 0) {
            // First font becomes Primary
            const primary = processedFonts[0];
            loadFont(primary.font, primary.url, primary.file.name);

            // Remaining fonts become Fallbacks
            if (processedFonts.length > 1) {
                const fallbacks = processedFonts.slice(1).map(item => ({
                    id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'fallback',
                    fontObject: item.font,
                    fontUrl: item.url,
                    fileName: item.file.name,
                    name: item.file.name
                }));
                addFallbackFonts(fallbacks);
            }
        }

        if (errorCount > 0) {
            alert(`Failed to parse ${errorCount} font file(s).`);
        }
    }, [loadFont, addFallbackFonts]);

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

    return (
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
            onClick={() => document.getElementById('font-input').click()}
        >
            <input
                type="file"
                id="font-input"
                className="hidden"
                accept=".ttf,.otf,.woff,.woff2"
                multiple
                onChange={onInputChange}
            />

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
    );
};

export default FontUploader;
