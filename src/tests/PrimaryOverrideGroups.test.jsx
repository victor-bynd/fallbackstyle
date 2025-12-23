import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoContext, TypoProvider } from '../context/TypoContext';
import { useContext } from 'react';

const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Primary Override Groups', () => {
    it('synchronizes h1Rem across grouped primary overrides', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Add overrides for 'zh' and 'ja'
        await act(async () => {
            // Mock primary font existence is assumed or created implicitly? 
            // TypoContext defaults contain a primary placeholder? Yes.
            // But let's load one to be safe.
            const primaryFont = {
                id: 'primary-font-1',
                type: 'primary',
                name: 'Primary Font',
                fontUrl: 'primary.woff',
                fontObject: { unitsPerEm: 1000 }
            };
            capturedContext.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});

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

        // 2. Create a group for 'zh' with initial h1Rem
        // Simulate UI: user sets H1 Rem to 4.0 then groups it.
        // Or directly create group. 
        // FontTabs UI logic: prompt name -> addMetricGroup -> assign.

        let groupId;
        await act(async () => {
            groupId = capturedContext.addMetricGroup('CJK Group', { h1Rem: 4.0, lineHeight: 1.5 });
            capturedContext.assignFontToMetricGroup(zhId, groupId);
        });

        // 3. Assign 'ja' to the same group
        await act(async () => {
            capturedContext.assignFontToMetricGroup(jaId, groupId);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 4. Verify both have the effective settings from group
        const settingsZh = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        const settingsJa = capturedContext.getEffectiveFontSettingsForStyle('primary', jaId);

        expect(settingsZh.h1Rem).toBe(4.0);
        expect(settingsZh.lineHeight).toBe(1.5);
        expect(settingsJa.h1Rem).toBe(4.0);
        expect(settingsJa.lineHeight).toBe(1.5);

        // 5. Update group h1Rem (Simulating UI slider change on one of them)
        await act(async () => {
            capturedContext.updateMetricGroup(groupId, { h1Rem: 5.0 });
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const settingsZhUpdated = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        const settingsJaUpdated = capturedContext.getEffectiveFontSettingsForStyle('primary', jaId);

        expect(settingsZhUpdated.h1Rem).toBe(5.0);
        expect(settingsJaUpdated.h1Rem).toBe(5.0);
    });

    it('handles fallback fonts in same group differently (uses scale)', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Add primary override 'zh' and fallback 'fr'
        await act(async () => {
            const primaryFont = {
                id: 'primary-font-1',
                type: 'primary',
                name: 'Primary Font',
                fontUrl: 'primary.woff',
                fontObject: { unitsPerEm: 1000 }
            };
            capturedContext.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});
            capturedContext.addLanguageSpecificPrimaryFont('zh');

            // Add a fallback font
            capturedContext.addFallbackFont({
                id: 'fallback-1',
                type: 'fallback',
                name: 'Fallback Font',
                fontUrl: 'fallback.woff'
            });
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const zhId = capturedContext.primaryFontOverrides['zh'];
        const fallbackId = capturedContext.fonts.find(f => f.id === 'fallback-1').id;

        // 2. Create Group with both h1Rem (for primary) and scale (for fallback)
        let groupId;
        await act(async () => {
            // Suppose the group is created with scale=120 (for fallback) and h1Rem=4.0 (for primary)
            // The UI might set both or update them independently?
            // Our Context logic:
            // if PrimaryOverride -> prefer h1Rem, fallback to scale
            // if Fallback -> use scale

            groupId = capturedContext.addMetricGroup('Mixed Group', { h1Rem: 4.0, scale: 120 });
            capturedContext.assignFontToMetricGroup(zhId, groupId);
            capturedContext.assignFontToMetricGroup(fallbackId, groupId);
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const settingsZh = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        const settingsFallback = capturedContext.getEffectiveFontSettingsForStyle('primary', fallbackId);

        // zh is Primary Override -> should use h1Rem=4.0
        expect(settingsZh.h1Rem).toBe(4.0);
        // It should NOT use scale=120 as h1Rem unless h1Rem is missing.

        // fallback is Fallback -> should use scale=120
        expect(settingsFallback.scale).toBe(120);

        // 3. Update group scale (only relevant for fallback)
        await act(async () => {
            capturedContext.updateMetricGroup(groupId, { scale: 130 });
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const settingsFallbackUp = capturedContext.getEffectiveFontSettingsForStyle('primary', fallbackId);
        expect(settingsFallbackUp.scale).toBe(130);

        // zh should stay same h1Rem
        const settingsZhUp = capturedContext.getEffectiveFontSettingsForStyle('primary', zhId);
        expect(settingsZhUp.h1Rem).toBe(4.0);
        // Wait, does zh use scale for anything? 
        // Our context: finalScale = group.scale. 
        // So zh will have scale=130 too? Yes. But it won't affect H1 size calculation in LanguageCard if h1Rem is present.
        expect(settingsZhUp.scale).toBe(130);
    });
});
