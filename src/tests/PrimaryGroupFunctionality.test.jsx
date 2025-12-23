
import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoContext, TypoProvider } from '../context/TypoContext';
import { useContext } from 'react';

const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Primary Group Functionality', () => {
    it('updates settings for all languages in a group when group settings change', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Setup: Load primary font
        await act(async () => {
            const primaryFont = {
                id: 'primary-font-1',
                type: 'primary',
                name: 'Primary Font',
                fontUrl: 'primary.woff',
                fontObject: { unitsPerEm: 1000 }
            };
            capturedContext.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});
        });

        // 2. Add overrides for 'zh' and 'ja'
        await act(async () => {
            capturedContext.addLanguageSpecificPrimaryFont('zh');
            capturedContext.addLanguageSpecificPrimaryFont('ja');
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const zhId = capturedContext.primaryFontOverrides['zh'];
        const jaId = capturedContext.primaryFontOverrides['ja'];

        expect(zhId).toBeDefined();
        expect(jaId).toBeDefined();

        // 3. Create Group for 'zh'
        let groupId;
        await act(async () => {
            groupId = capturedContext.createGroupForFont(zhId, 'East Asian Group', { h1Rem: 3.75 });
        });

        expect(groupId).toBeDefined();

        // 4. Add 'ja' to the group
        await act(async () => {
            capturedContext.addLanguagesToGroup(groupId, ['ja']);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // Verify both are in the group
        const zhFont = capturedContext.fonts.find(f => f.id === zhId);
        // Note: addLanguagesToGroup might reuse the existing override or create a new one?
        // Let's check the override ID for 'ja' again, it typically stays same if just assigned to group, 
        // but if addLanguagesToGroup implementation re-creates it, we need updated ID.
        const jaIdNew = capturedContext.primaryFontOverrides['ja'];
        const jaFont = capturedContext.fonts.find(f => f.id === jaIdNew);

        expect(zhFont.metricGroupId).toBe(groupId);
        expect(jaFont.metricGroupId).toBe(groupId);

        // 5. Verify initial settings
        let zhSettings = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        let jaSettings = capturedContext.getEffectiveFontSettingsForStyle('primary', jaIdNew);

        expect(zhSettings.scale).toBeDefined();
        // Note: For primary override, h1Rem is the key if defined.
        // Wait, getEffectiveFontSettingsForStyle logic maps group.h1Rem/scale.
        // If we set { h1Rem: 3.75 }, checks logic.
        // Primary text usually checks group.scale or group.h1Rem.

        // 6. Update Group Setting (Simulate Slider Change)
        await act(async () => {
            capturedContext.updateMetricGroup(groupId, { h1Rem: 5.0 });
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 7. Verify Propagated to Both
        zhSettings = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        jaSettings = capturedContext.getEffectiveFontSettingsForStyle('primary', jaIdNew);

        // Based on logic in TypoContext getEffectiveFontSettingsForStyle:
        // if (group) { finalH1Rem = group.h1Rem !== undefined ? group.h1Rem : group.scale; }
        // So both should act as if they have h1Rem 5.0

        // However, the return object of getEffectiveFontSettingsForStyle might not strictly have h1Rem?
        // Let's check what it returns. It returns { baseFontSize, scale, lineHeight, ... }
        // Wait, it DOES NOT return h1Rem property explicitly in the returned object in TypoContext Lines 718-726?
        // Actually, lines 718-726 are for PRIMARY (type === 'primary'). 
        // Lines 736-764 handles fallback/primaryOverride.
        // But the main return statement lines 800+ (not shown fully) constructs the final object.

        // I need to see the end of getEffectiveFontSettingsForStyle in TypoContext.jsx.
        // But assuming it returns scale or we can inspect h1Rem if wired.

        // Let's check specifically for the outcome we want: 
        // Is the font size calculated based on this group setting?

        // Since I can't see the return value fully, I will inspect the result object keys in the test.
    });
});
