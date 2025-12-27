import React, { useState } from 'react';
import { useTypo } from '../context/useTypo';
import MissingFontsModal from './MissingFontsModal';
import { useConfigImport } from '../hooks/useConfigImport';
import FontLanguageModal from './FontLanguageModal';
import { parseFontFile, createFontUrl } from '../services/FontLoader';

const ConfigManager = () => {
    const { getExportConfiguration, addLanguageSpecificFallbackFont, loadFont } = useTypo();
    const { importConfig, missingFonts, existingFiles, resolveMissingFonts, cancelImport } = useConfigImport();

    const [pendingFonts, setPendingFonts] = useState([]);
    const [pendingFileMap, setPendingFileMap] = useState(null);

    const handleExport = () => {
        const config = getExportConfiguration();
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = now.toLocaleString('default', { month: 'short' }).toLowerCase();
        const year = now.getFullYear();

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strHours = String(hours).padStart(2, '0');

        const timestamp = `${day}${month}${year}-${strHours}${minutes}${ampm}`;

        const a = document.createElement('a');
        a.href = url;
        a.download = `fallbackstyles-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            importConfig(file);
        }
        // Reset input
        e.target.value = '';
    };

    const handleResolve = async (fileMap) => {
        const files = Object.values(fileMap);
        const processed = [];

        for (const file of files) {
            try {
                const { font, metadata } = await parseFontFile(file);
                const url = createFontUrl(file);
                processed.push({ font, metadata, url, file });
            } catch (err) {
                console.error("Error parsing during import resolution:", err);
            }
        }

        if (processed.length > 0) {
            setPendingFonts(processed);
            setPendingFileMap(fileMap);
        } else {
            resolveMissingFonts(fileMap);
        }
    };

    const handleAssignmentsConfirm = async ({ assignments, orderedFonts }) => {
        // First restore the main config
        await resolveMissingFonts(pendingFileMap);

        // Load the designated Primary font to ensure it's the main session font
        // We do this AFTER restoration because restoreConfiguration overwrites fontStyles
        const primaryItem = orderedFonts[0];
        if (primaryItem) {
            loadFont(
                primaryItem.font,
                primaryItem.url,
                primaryItem.file.name,
                primaryItem.metadata
            );
        }

        // Then apply the language fallback overrides for the newly uploaded fonts, respecting the user's order
        orderedFonts.forEach((item, index) => {
            if (index === 0) return; // Skip primary

            const assignment = assignments[item.file.name];
            if (assignment !== 'auto') {
                addLanguageSpecificFallbackFont(
                    item.font,
                    item.url,
                    item.file.name,
                    item.metadata,
                    assignment
                );
            }
        });

        setPendingFonts([]);
        setPendingFileMap(null);
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-100">
                <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-transparent rounded-lg cursor-pointer transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>Import</span>
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                    />
                </label>

                <button
                    onClick={handleExport}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg transition-all shadow-sm shadow-indigo-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>Export</span>
                </button>
            </div>

            {missingFonts && (
                <MissingFontsModal
                    missingFonts={missingFonts}
                    existingFiles={existingFiles}
                    onResolve={handleResolve}
                    onCancel={cancelImport}
                />
            )}

            {pendingFonts.length > 0 && (
                <FontLanguageModal
                    pendingFonts={pendingFonts}
                    onConfirm={handleAssignmentsConfirm}
                    onCancel={() => {
                        setPendingFonts([]);
                        setPendingFileMap(null);
                        cancelImport();
                    }}
                />
            )}
        </>
    );
};

export default ConfigManager;
