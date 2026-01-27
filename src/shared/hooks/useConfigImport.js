import { useState } from 'react';
import { useFontManagement } from '../context/useFontManagement';
import { useLanguageMapping } from '../context/useLanguageMapping';
import { usePersistence } from '../context/usePersistence';
import { ConfigService } from '../services/ConfigService';

export const useConfigImport = () => {
    const { fontStyles } = useFontManagement();
    const { batchAddConfiguredLanguages } = useLanguageMapping();
    const { restoreConfiguration } = usePersistence();
    const [missingFonts, setMissingFonts] = useState(null);
    const [existingFiles, setExistingFiles] = useState([]);
    const [parsedMappings, setParsedMappings] = useState({});
    const [pendingConfig, setPendingConfig] = useState(null);

    const extractMappings = (rawConfig) => {
        const data = rawConfig.data || rawConfig;
        const extracted = {};

        if (data.fontStyles?.primary) {
            const style = data.fontStyles.primary;
            // Helper map: fontId -> { fileName, name }
            const idsToInfo = {};
            (style.fonts || []).forEach(f => {
                if (f.id) {
                    idsToInfo[f.id] = {
                        fileName: f.fileName,
                        name: f.name
                    };
                }
            });

            const addMapping = (fontId, langId) => {
                const info = idsToInfo[fontId];
                if (!info) return;

                if (info.fileName) extracted[info.fileName] = langId;
                if (info.name) extracted[info.name] = langId;
            };

            // Process Fallback Overrides
            if (style.fallbackFontOverrides) {
                Object.entries(style.fallbackFontOverrides).forEach(([langId, val]) => {
                    if (typeof val === 'string') {
                        addMapping(val, langId);
                    } else if (typeof val === 'object' && val !== null) {
                        Object.values(val).forEach(targetId => {
                            addMapping(targetId, langId);
                        });
                    }
                });
            }

            // Process Primary Overrides
            if (style.primaryFontOverrides) {
                Object.entries(style.primaryFontOverrides).forEach(([langId, fontId]) => {
                    addMapping(fontId, langId);
                });
            }
        }
        return extracted;
    };

    const validateAndRestore = async (rawConfig) => {
        // ... (User Language List support checks remain same) ...
        // Feature: Support User's Language List JSON { "languages": [ { "code": "..." } ] }
        if (rawConfig.languages && Array.isArray(rawConfig.languages)) {
            const langIds = rawConfig.languages
                .map(l => l.code)
                .filter(c => typeof c === 'string');

            if (langIds.length > 0) {
                batchAddConfiguredLanguages(langIds);
                alert(`Enabled ${langIds.length} languages from list.`);
                return;
            }
        }

        // Feature: Support simple Language List import ["en-US", ...]
        if (Array.isArray(rawConfig) && rawConfig.some(i => typeof i === 'string')) {
            const langIds = rawConfig.filter(i => typeof i === 'string');
            if (langIds.length > 0) {
                batchAddConfiguredLanguages(langIds);
                alert(`Enabled ${langIds.length} languages.`);
                return;
            }
        }

        let data;
        try {
            data = ConfigService.normalizeConfig(rawConfig);
            console.log("Normalized data:", data);

            // Extract mappings immediately when validating
            const mappings = extractMappings(rawConfig);
            if (Object.keys(mappings).length > 0) {
                setParsedMappings(mappings);
            }

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
                    ...(fontStyles?.primary?.fonts || [])
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

    const handleResolveMissingFonts = async (fileMap) => {
        if (pendingConfig) {
            try {
                await restoreConfiguration(pendingConfig, fileMap);
            } catch (error) {
                console.error("Error restoring configuration with missing fonts:", error);
                alert("There was a problem restoring the configuration. Some settings may be missing.");
            } finally {
                setMissingFonts(null);
                setPendingConfig(null);
            }
        } else {
            console.warn("No pending config found when resolving missing fonts.");
            setMissingFonts(null);
        }
    };

    const cancelImport = () => {
        setMissingFonts(null);
        setExistingFiles([]);
        setPendingConfig(null);
        setParsedMappings({});
    };

    return {
        importConfig,
        missingFonts,
        existingFiles,
        resolveMissingFonts: handleResolveMissingFonts,
        cancelImport,
        parsedMappings // Expose this
    };
};
