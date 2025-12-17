import React, { useState } from 'react';
import { useTypo } from '../context/useTypo';
import MissingFontsModal from './MissingFontsModal';

const ConfigManager = () => {
    const { getExportConfiguration, restoreConfiguration } = useTypo();
    const [missingFonts, setMissingFonts] = useState(null);
    const [pendingConfig, setPendingConfig] = useState(null);

    const handleExport = () => {
        const config = getExportConfiguration();
        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `typography-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                validateAndRestore(config);
            } catch (err) {
                console.error("Failed to parse config", err);
                alert("Invalid configuration file");
            }
        };
        reader.readAsText(file);

        // Reset input
        e.target.value = '';
    };

    const validateAndRestore = (config) => {
        // Collect required files
        const requiredFiles = new Set();

        const collectFromStyle = (style) => {
            if (!style?.fonts) return;
            style.fonts.forEach(f => {
                if (f.fileName) {
                    requiredFiles.add(f.fileName);
                }
            });
        };

        collectFromStyle(config.fontStyles?.primary);
        collectFromStyle(config.fontStyles?.secondary);

        if (requiredFiles.size > 0) {
            setMissingFonts(Array.from(requiredFiles));
            setPendingConfig(config);
        } else {
            restoreConfiguration(config, {});
        }
    };

    const handleResolveMissingFonts = (fileMap) => {
        if (pendingConfig) {
            restoreConfiguration(pendingConfig, fileMap);
            setMissingFonts(null);
            setPendingConfig(null);
        }
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
                    onResolve={handleResolveMissingFonts}
                    onCancel={() => {
                        setMissingFonts(null);
                        setPendingConfig(null);
                    }}
                />
            )}
        </>
    );
};

export default ConfigManager;
