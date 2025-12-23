import React, { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';

const TestHarness = ({ onReady }) => {
    const context = useTypo();
    useEffect(() => {
        onReady(context);
    }, [context, onReady]);
    return null;
};

describe('Primary Group Integration', () => {
    test('Can create group and assign languages', async () => {
        let ctx;

        await act(async () => {
            render(
                <TypoProvider>
                    <TestHarness onReady={(c) => ctx = c} />
                </TypoProvider>
            );
        });

        expect(ctx).toBeDefined();

        // 1. Initial State
        const primary = ctx.fonts.find(f => f.type === 'primary');
        expect(primary).toBeDefined();

        // 2. Add JA Override (Standalone)
        await act(async () => {
            ctx.addLanguageSpecificPrimaryFont('ja');
        });

        // Check primaryFontOverrides
        // Note: access context state via ctx
        let jaFontId = ctx.primaryFontOverrides['ja'] || ctx.fonts.find(f => f.isPrimaryOverride && f.id.includes('ja'))?.id;
        // In TypoContext: primaryFontOverrides: activeStyle.primaryFontOverrides || {}
        // Wait, TypoContext expose primaryFontOverrides state directly (line 1754).
        jaFontId = ctx.primaryFontOverrides['ja'];
        expect(jaFontId).toBeDefined();

        // 3. Create Group for JA
        let createdGroupId;
        await act(async () => {
            // createGroupForFont returns the groupId
            // But createGroupForFont (line 442) wraps state update. Does it return value synchronously to the caller?
            // Line 468 snippet: `return groupId;`. 
            // Yes, it returns it.
            createdGroupId = ctx.createGroupForFont(jaFontId, 'CJK Group', { lineHeight: 1.5 });
        });

        expect(createdGroupId).toBeDefined();
        expect(ctx.metricGroups[createdGroupId]).toBeDefined();
        expect(ctx.metricGroups[createdGroupId].lineHeight).toBe(1.5);

        const jaFont = ctx.fonts.find(f => f.id === jaFontId);
        expect(jaFont.metricGroupId).toBe(createdGroupId);

        // 4. Add KO to Group
        await act(async () => {
            ctx.addLanguageToPrimaryGroup('ko', createdGroupId);
        });

        const koFontId = ctx.primaryFontOverrides['ko'];
        expect(koFontId).toBeDefined();
        const koFont = ctx.fonts.find(f => f.id === koFontId);
        expect(koFont.metricGroupId).toBe(createdGroupId);

        // 5. Verify Shared Metrics
        const jaSettings = ctx.getEffectiveFontSettings(jaFontId);
        expect(jaSettings.lineHeight).toBe(1.5);

        const koSettings = ctx.getEffectiveFontSettings(koFontId);
        expect(koSettings.lineHeight).toBe(1.5);

        // 6. Update Group Metrics
        await act(async () => {
            ctx.updateMetricGroup(createdGroupId, { lineHeight: 1.8 });
        });

        const jaSettings2 = ctx.getEffectiveFontSettings(jaFontId);
        expect(jaSettings2.lineHeight).toBe(1.8);

        // 7. Independent Fallbacks
        await act(async () => {
            ctx.setFallbackFontOverride('ja', 'fallback-font-1');
        });

        expect(ctx.fallbackFontOverrides['ja']).toBe('fallback-font-1');
        expect(ctx.fallbackFontOverrides['ko']).toBeUndefined();
    });
});
