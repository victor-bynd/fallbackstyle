
import React, { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import { parseFontFile, createFontUrl } from '../../../shared/services/FontLoader';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const PrimaryFontInput = ({ onFontLoaded }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const processFile = useCallback(async (file) => {
        if (!file) return;

        // Reset error
        setError(null);
        setLoading(true);

        try {
            // Validate extension
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
                throw new Error('Unsupported file format. Please upload .ttf, .otf, .woff, or .woff2 files.');
            }

            const { font, metadata } = await parseFontFile(file);
            const url = createFontUrl(file);

            if (onFontLoaded) {
                onFontLoaded({
                    font,
                    metadata,
                    url,
                    file,
                    fileName: file.name
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to parse font file.');
        } finally {
            setLoading(false);
        }
    }, [onFontLoaded]);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    }, [processFile]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const onInputChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
            // Reset value so same file can be selected again if needed
            e.target.value = '';
        }
    };

    return (
        <div className="w-full">
            <div
                className={clsx(
                    "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300 ease-in-out cursor-pointer p-12",
                    "flex flex-col items-center justify-center text-center",
                    isDragging
                        ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                        : "border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50",
                    loading && "opacity-50 pointer-events-none"
                )}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className={clsx(
                    "w-16 h-16 mb-6 rounded-2xl flex items-center justify-center transition-colors shadow-sm",
                    isDragging ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500 group-hover:text-blue-500"
                )}>
                    {loading ? (
                        <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    )}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Upload Brand Font
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                    Drag & drop your font file here, or click to browse.
                    We support TTF, OTF, WOFF, and WOFF2.
                </p>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Trusted by designers
                </span>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={onInputChange}
                />
            </div>

            {error && (
                <div className="mt-3 p-3 text-sm text-red-400 bg-red-900/10 border border-red-900/20 rounded-lg flex items-center animate-fadeIn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}
        </div>
    );
};

export default PrimaryFontInput;
