
const mockState = {
    fontStyles: {
        primary: {
            fonts: [
                { id: 'f1', fileName: 'MyFont.ttf', name: 'MyFont' },
                { id: 'f2', fileName: 'OtherFont.ttf', name: 'OtherFont' },
                { id: 'f3', fileName: 'Thai.ttf', name: 'ThaiFont' } // Used for Thai override
            ],
            // Fallback Overrides: langId -> fontId
            fallbackFontOverrides: {
                'fr-FR': 'f2',
                'th-TH': 'f3'
            },
            // Primary Overrides: langId -> fontId
            primaryFontOverrides: {
                'de-DE': 'f1'
            }
        }
    }
};

// Simulate ConfigService.serializeConfig (Simplified logic)
const serializeConfig = (state) => {
    const { fontStyles } = state;
    return {
        metadata: { version: 1 },
        data: {
            fontStyles
        }
    };
};

// Simulate Import Logic (from FontUploader)
const parseImport = (json) => {
    const data = json;
    const configData = data.data || data;
    const extractedAssignments = {};

    if (configData.fontStyles?.primary) {
        const style = configData.fontStyles.primary;
        // Helper map: fontId -> fileName
        const idToName = {};
        (style.fonts || []).forEach(f => {
            if (f.id && (f.fileName || f.name)) {
                idToName[f.id] = f.fileName || f.name;
            }
        });

        // Process Fallback Overrides
        if (style.fallbackFontOverrides) {
            Object.entries(style.fallbackFontOverrides).forEach(([langId, val]) => {
                if (typeof val === 'string') {
                    const name = idToName[val];
                    if (name) extractedAssignments[name] = langId;
                } else if (typeof val === 'object' && val !== null) {
                    Object.values(val).forEach(targetId => {
                        const name = idToName[targetId];
                        if (name) extractedAssignments[name] = langId;
                    });
                }
            });
        }

        // Process Primary Overrides
        if (style.primaryFontOverrides) {
            Object.entries(style.primaryFontOverrides).forEach(([langId, fontId]) => {
                const name = idToName[fontId];
                if (name) extractedAssignments[name] = langId;
            });
        }
    }
    return extractedAssignments;
};

// RUN
const json = serializeConfig(mockState);
console.log("JSON Overrides:", json.data.fontStyles.primary.fallbackFontOverrides);

const result = parseImport(json);
console.log("Extracted Assignments:", result);

// VALIDATION
const expected = {
    'OtherFont.ttf': 'fr-FR',
    'Thai.ttf': 'th-TH',
    'MyFont.ttf': 'de-DE'
};

const keys = Object.keys(expected);
const allMatch = keys.every(k => result[k] === expected[k]);

if (allMatch) {
    console.log("SUCCESS: Logic verified.");
} else {
    console.error("FAILURE: Mismatch.");
    process.exit(1);
}
