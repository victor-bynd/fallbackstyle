
// Simulation of LanguageCard logic

function runTest(scenario) {
    const {
        mainViewLineHeight,
        mainViewEffectiveFont,
        mainViewSettings,
        isFullSupport,
        metricsFallbackFontStack
    } = scenario;

    console.log(`\n--- Scenario: ${scenario.name} ---`);

    const hasVerticalMetricOverrides = mainViewSettings && (
        (mainViewSettings.lineGapOverride !== undefined && mainViewSettings.lineGapOverride !== '') ||
        (mainViewSettings.ascentOverride !== undefined && mainViewSettings.ascentOverride !== '') ||
        (mainViewSettings.descentOverride !== undefined && mainViewSettings.descentOverride !== '')
    );

    const hasFallbackMetricOverrides = !isFullSupport && metricsFallbackFontStack.some(f => {
        const s = f.settings;
        return s && (
            (s.lineGapOverride !== undefined && s.lineGapOverride !== '') ||
            (s.ascentOverride !== undefined && s.ascentOverride !== '') ||
            (s.descentOverride !== undefined && s.descentOverride !== '')
        );
    });

    const useNormalLineHeight = (mainViewLineHeight === 'normal') ||
        (!mainViewEffectiveFont?.fontObject && hasVerticalMetricOverrides) ||
        hasFallbackMetricOverrides;

    console.log('Main View Line Height:', mainViewLineHeight);
    console.log('Main Font Object:', mainViewEffectiveFont?.fontObject ? 'Exists' : 'Null');
    console.log('Has Main Overrides:', hasVerticalMetricOverrides);
    console.log('Is Full Support:', isFullSupport);
    console.log('Has Fallback Overrides:', hasFallbackMetricOverrides);
    console.log('=> RESULT useNormalLineHeight:', useNormalLineHeight);
}

// 1. Standard Case: Uploaded Font, 1.2 LH, No Overrides. Full Support.
runTest({
    name: 'Standard Uploaded Font',
    mainViewLineHeight: 1.2,
    mainViewEffectiveFont: { fontObject: {} },
    mainViewSettings: {},
    isFullSupport: true,
    metricsFallbackFontStack: []
});

// 2. System Font (Primary), 1.2 LH, Overrides. 
// Note: If System Font is primary, fontObject is null.
runTest({
    name: 'System Primary with Overrides',
    mainViewLineHeight: 1.2,
    mainViewEffectiveFont: { fontObject: null }, // System
    mainViewSettings: { lineGapOverride: 0.5 },
    isFullSupport: true, // N/A really
    metricsFallbackFontStack: []
});

// 3. Uploaded Primary (Missing Chars), Fallback System with Overrides.
runTest({
    name: 'Uploaded Primary (Missing Chars) + System Fallback Override',
    mainViewLineHeight: 1.2,
    mainViewEffectiveFont: { fontObject: {} },
    mainViewSettings: {},
    isFullSupport: false, // MISSING CHARS
    metricsFallbackFontStack: [
        {
            fontId: 'legacy',
            settings: {
                lineGapOverride: 1.0
            }
        }
    ]
});

// 4. Uploaded Primary (Full Support), Fallback System with Overrides.
// (Fallback overrides should be ignored as they aren't rendered)
runTest({
    name: 'Uploaded Primary (Full Support) + System Fallback Override',
    mainViewLineHeight: 1.2,
    mainViewEffectiveFont: { fontObject: {} },
    mainViewSettings: {},
    isFullSupport: true, // FULL SUPPORT
    metricsFallbackFontStack: [
        {
            fontId: 'legacy',
            settings: {
                lineGapOverride: 1.0
            }
        }
    ]
});
