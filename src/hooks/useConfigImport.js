import { useState } from 'react';
import { useTypo } from '../context/useTypo';
import { ConfigService } from '../services/ConfigService';

export const useConfigImport = () => {
    const { restoreConfiguration, fontStyles } = useTypo();
    const [missingFonts, setMissingFonts] = useState(null);
    const [existingFiles, setExistingFiles] = useState([]);
    const [pendingConfig, setPendingConfig] = useState(null);

    const validateAndRestore = async (rawConfig) => {
        let data;
        try {
            data = ConfigService.normalizeConfig(rawConfig);
            console.log("Normalized data:", data);
        } catch (e) {
            console.error("Normalization error:", e);
            alert(`Config processing error: ${e.message}`);
            return;
        }

        if (!data) {
            console.warn("Invalid config format. Keys:", Object.keys(rawConfig));
            alert("Invalid configuration file format. Please check console for details.");
            return;
        }

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

        collectFromStyle(data.fontStyles?.primary);

        if (requiredFiles.size > 0) {
            const missingList = Array.from(requiredFiles);

            // Check if we already have any of these fonts loaded in the current session
            const foundFiles = [];

            // Helper to search for a font by filename in existing styles
            const findFontByFilename = (filename) => {
                const allFonts = [
                    ...(fontStyles.primary?.fonts || [])
                ];
                return allFonts.find(f => f.fileName === filename && f.fontUrl);
            };

            await Promise.all(missingList.map(async (filename) => {
                const existingFont = findFontByFilename(filename);
                if (existingFont) {
                    try {
                        const response = await fetch(existingFont.fontUrl);
                        const blob = await response.blob();
                        const file = new File([blob], filename, { type: blob.type });
                        foundFiles.push(file);
                    } catch (e) {
                        console.warn(`Failed to retrieve existing font blob for ${filename}`, e);
                    }
                }
            }));

            setMissingFonts(missingList);
            setExistingFiles(foundFiles);
            setPendingConfig(rawConfig); // Save raw config to restore later
        } else {
            restoreConfiguration(rawConfig, {});
        }
    };

    const importConfig = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rawConfig = JSON.parse(event.target.result);
                console.log("Raw config parsed:", rawConfig);
                validateAndRestore(rawConfig);
            } catch (err) {
                console.error("Failed to parse config", err);
                alert(`Invalid configuration file: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const handleResolveMissingFonts = (fileMap) => {
        if (pendingConfig) {
            restoreConfiguration(pendingConfig, fileMap);
            setMissingFonts(null);
            setPendingConfig(null);
        }
    };

    const cancelImport = () => {
        setMissingFonts(null);
        setExistingFiles([]);
        setPendingConfig(null);
    };

    return {
        importConfig,
        missingFonts,
        existingFiles,
        resolveMissingFonts: handleResolveMissingFonts,
        cancelImport
    };
};
