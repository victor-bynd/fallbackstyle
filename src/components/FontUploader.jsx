import { useCallback } from 'react';
import clsx from 'clsx';
import { useTypo } from '../context/TypoContext';
import { parseFontFile, createFontUrl } from '../services/FontLoader';

const FontUploader = () => {
    const { loadFont } = useTypo();

    const handleFile = async (file) => {
        try {
            if (!file) return;

            const font = await parseFontFile(file);
            const url = createFontUrl(file);
            loadFont(font, url, file.name);
        } catch (err) {
            console.error('Error parsing font:', err);
            alert('Failed to parse font file. Please ensure it is a valid TTF, OTF, WOFF, or WOFF2 file.');
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const onInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
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
                onChange={onInputChange}
            />

            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:bg-indigo-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
            </div>

            <h3 className="text-xl font-bold mb-2 text-slate-800 group-hover:text-indigo-600 transition-colors">
                Drop Font File Here
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
                Drag & drop your font file, or click to browse.
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
