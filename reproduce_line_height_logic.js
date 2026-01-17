
// Mock calculateNumericLineHeight logic from fontUtils.js (Reverted state)
const calculateNumericLineHeight = (lineHeight, fontObject, overrides = {}) => {
    let numLineHeight = parseFloat(lineHeight);

    const hasActiveOverrides = overrides && (
        (overrides.ascentOverride !== undefined && overrides.ascentOverride !== '') ||
        (overrides.descentOverride !== undefined && overrides.descentOverride !== '') ||
        (overrides.lineGapOverride !== undefined && overrides.lineGapOverride !== '')
    );

    if (lineHeight === 'normal' || (typeof lineHeight === 'number' && isNaN(lineHeight)) || hasActiveOverrides) {
        if (fontObject) {
            // Mockup for uploaded font logic
            // ..
            return 1.5; // Mock calculated
        } else {
            numLineHeight = 1.2; // Default fallback (Reverted state)
        }
    }
    return numLineHeight;
};

// Mock LanguageCard logic
function getLineHeightResult(fontObject, overrides) {
    const mainViewLineHeight = 1.2; // Default global
    const mainViewEffectiveFont = { fontObject };

    const mainViewSettings = overrides;

    // Logic from LanguageCard.jsx
    const mainViewNumericLineHeight = calculateNumericLineHeight(
        mainViewLineHeight,
        mainViewEffectiveFont?.fontObject,
        mainViewSettings
    );

    const hasVerticalMetricOverrides = mainViewSettings && (
        (mainViewSettings.lineGapOverride !== undefined && mainViewSettings.lineGapOverride !== '') ||
        (mainViewSettings.ascentOverride !== undefined && mainViewSettings.ascentOverride !== '') ||
        (mainViewSettings.descentOverride !== undefined && mainViewSettings.descentOverride !== '')
    );

    const finalLineHeight = (mainViewLineHeight === 'normal' || (!mainViewEffectiveFont?.fontObject && hasVerticalMetricOverrides))
        ? 'normal'
        : mainViewNumericLineHeight;

    console.log('--- Test Case ---');
    console.log('Font Object:', fontObject ? 'Present' : 'Null');
    console.log('Overrides:', JSON.stringify(overrides));
    console.log('Has Vertical Metrics:', hasVerticalMetricOverrides);
    console.log('Numeric Calc Result:', mainViewNumericLineHeight);
    console.log('FINAL LINE HEIGHT:', finalLineHeight);
}

// Case 1: System Font (No Object), No Overrides
getLineHeightResult(null, {});

// Case 2: System Font (No Object), With Line Gap Override
getLineHeightResult(null, { lineGapOverride: 0.5 });

// Case 3: Uploaded Font, With Overrides
getLineHeightResult({}, { lineGapOverride: 0.5 });
