
import { render, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TypoContext, TypoProvider } from '../context/TypoContext';
import { useContext } from 'react';

const TestComponent = ({ onContext }) => {
    const context = useContext(TypoContext);
    if (onContext) onContext(context);
    return null;
};

describe('Primary Group Creation (Atomic)', () => {
    it('creates a group and assigns font in a single update', async () => {
        let capturedContext;

        const { rerender } = render(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 1. Add overrides for 'zh'
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
        });

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        const zhId = capturedContext.primaryFontOverrides['zh'];
        expect(zhId).toBeDefined();

        // 2. Call createGroupForFont
        let groupId;
        const initialSettings = { h1Rem: 4.5, lineHeight: 1.6 };

        await act(async () => {
            groupId = capturedContext.createGroupForFont(zhId, 'New Atomic Group', initialSettings);
        });

        expect(groupId).toBeDefined();

        rerender(
            <TypoProvider>
                <TestComponent onContext={ctx => capturedContext = ctx} />
            </TypoProvider>
        );

        // 3. Verify Group Exists
        const group = capturedContext.metricGroups[groupId];
        expect(group).toBeDefined();
        expect(group.name).toBe('New Atomic Group');
        expect(group.h1Rem).toBe(4.5);
        expect(group.lineHeight).toBe(1.6);

        // 4. Verify Font is Assigned
        const font = capturedContext.fonts.find(f => f.id === zhId);
        expect(font.metricGroupId).toBe(groupId);
    });
});
