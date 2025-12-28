
export const TsImportService = {
    /**
     * Parses the text content of typography.types.ts
     * This is a heuristic parser that looks for specific exported constants.
     * @param {string} text - The raw file content
     * @returns {Object} standardized config object (normalized for ConfigService)
     */
    parseTsContent: (text) => {
        try {
            // 1. Extract JSON objects from the string content.
            // We look for patterns like: export const fontFamilies: ... = { ... };

            const extractObject = (varName) => {
                // Regex to find "export const varName ... = { ... };"
                // Multiline support needed. We assume valid JSON-like object structure after the equals sign.
                // Since the export was JSON.stringify'd, it should be valid JSON.
                const regex = new RegExp(`export const ${varName}[^=]*=\\s*({[\\s\\S]*?});`, 'm');
                const match = text.match(regex);
                if (match && match[1]) {
                    return JSON.parse(match[1]);
                }
                return null;
            };

            const fontFamilies = extractObject('fontFamilies');
            const localeOverrides = extractObject('localeOverrides');
            const typeRamp = extractObject('typeRamp');

            if (!fontFamilies) {
                throw new Error("Could not parse fontFamilies from TS file");
            }

            return TsImportService.mapTsToConfig({ fontFamilies, localeOverrides, typeRamp });

        } catch (e) {
            console.error("TS parsing error:", e);
            throw new Error("Failed to parse TypeScript file. Ensure it is a valid export.");
        }
    },

    /**
     * Maps partial TS schema back to App State Config
     */
    mapTsToConfig: ({ fontFamilies, localeOverrides, typeRamp }) => {
        // Reconstruct primary style
        const primaryFamilyKey = Object.keys(fontFamilies).find(k => fontFamilies[k].roles.includes('heading') && k === 'brandHeading') || Object.keys(fontFamilies)[0];
        const primaryFamily = fontFamilies[primaryFamilyKey];
        const primaryName = primaryFamily.name;

        // We only have the Name, not the file. We set up expectations.
        // The "fileName" property in the font object will be set to this Name, 
        // and the MissingFontsModal will ask for a file with this name.

        // Base Font Size & Header Styles from TypeRamp
        let baseFontSize = 16;
        let headerStyles = {};
        let weight = 400;

        if (typeRamp) {
            if (typeRamp.bodyM) {
                baseFontSize = typeRamp.bodyM.size;
                weight = typeRamp.bodyM.weight;
            }

            // Map headings
            const map = { headingXL: 'h1', headingL: 'h2', headingM: 'h3', headingS: 'h4', headingXS: 'h5', headingXXS: 'h6' };
            Object.entries(typeRamp).forEach(([rampKey, style]) => {
                const tag = map[rampKey];
                if (tag) {
                    // Calculate scale relative to base
                    const scale = style.size / baseFontSize;
                    headerStyles[tag] = {
                        scale: Number(scale.toFixed(4)),
                        lineHeight: style.lineHeight,
                        letterSpacing: style.letterSpacing || 0
                    };
                }
            });
        }

        // Reconstruct Overrides
        const primaryFontOverrides = {};
        const fallbackFontOverrides = {};

        if (localeOverrides) {
            Object.entries(localeOverrides).forEach(([langId, entry]) => {
                // Heading override -> Primary Override
                if (entry.heading) {
                    const family = fontFamilies[entry.heading];
                    if (family) {
                        // We store the Name as the expected ID/target
                        // Ideally we'd map this to a specific ID after file loaded, 
                        // but keying by Name works if we unify IDs.
                        // For now, let's assume the Font Loader will see "Name" and match it.
                        // But wait, the app uses IDs. 
                        // When importing, if we don't have the font file yet, we can't generate the final ID.
                        // The App's import logic (useConfigImport) creates requirements based on fileName.
                        // So we should pretend the ID is the Name for now?
                        // Or actually, `primaryFontOverrides` expects an ID. 
                        // If we use the family name as the ID, the resolver needs to use that ID for the loaded font.
                        // Let's use the family name as the ID reference.
                        primaryFontOverrides[langId] = family.name;
                    }
                }

                // Body override -> Fallback Override (simplified mapping)
                // If body differs from primary and differs from what primary would be?
                // In our simple export, we often just dumped same font into heading/body.
                // If entry.body exists and is different from main primary...
                if (entry.body && entry.body !== primaryFamilyKey) {
                    const family = fontFamilies[entry.body];
                    if (family) {
                        fallbackFontOverrides[langId] = family.name;
                    }
                }
            });
        }

        // Prepare "Fonts" list for the config
        // We need to define all the referenced fonts so useConfigImport knows they are missing.
        const fonts = [];

        const addFontPlaceHolder = (famName, type) => {
            if (fonts.find(f => f.name === famName)) return; // distinct
            fonts.push({
                id: famName, // Temporary ID matching reference
                type,
                name: famName,
                fileName: famName, // Use strict family name match logic instead of guessing extension
                // The resolver in MissingFontsModal will now need to be smart enough to match uploads against this name
            });
        };

        // Add Primary
        addFontPlaceHolder(primaryName, 'primary');

        // Add all override targets
        Object.values(primaryFontOverrides).forEach(name => addFontPlaceHolder(name, 'fallback'));
        Object.values(fallbackFontOverrides).forEach(name => addFontPlaceHolder(name, 'fallback'));


        return {
            fontStyles: {
                primary: {
                    baseFontSize,
                    weight,
                    lineHeight: typeRamp?.bodyM?.lineHeight || 1.5,
                    fonts,
                    primaryFontOverrides,
                    fallbackFontOverrides
                }
            },
            headerStyles: Object.keys(headerStyles).length > 0 ? headerStyles : undefined
        };
    }
};
