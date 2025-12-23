import { render, screen, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FontTabs from '../components/FontTabs';
import { TypoProvider, TypoContext } from '../context/TypoContext';
import { useContext } from 'react';

// Setup helper to initialize context with data
const ContextInitializer = ({ onReady }) => {
    const context = useContext(TypoContext);

    // Call onReady on every render to ensure test has latest context
    if (onReady) onReady(context);

    return null;
};

describe('FontTabs Rendering', () => {
    it('renders PrimaryOverrideGroup when a group exists', async () => {
        let context;
        const setContext = (c) => { context = c; };

        // Initial render
        const { rerender } = render(
            <TypoProvider>
                <ContextInitializer onReady={setContext} />
                <FontTabs />
            </TypoProvider>
        );

        // 1. Setup Data
        await act(async () => {
            const primaryFont = {
                id: 'primary-font-1',
                type: 'primary',
                name: 'Primary Font',
                fontUrl: 'primary.woff',
                fontObject: { unitsPerEm: 1000 }
            };
            context.loadFont(primaryFont.fontObject, primaryFont.fontUrl, primaryFont.name, {});
        });

        await act(async () => {
            context.addLanguageSpecificPrimaryFont('fr');
        });

        // 2. Create Group and Assign
        await act(async () => {
            const frId = context.primaryFontOverrides['fr'];
            if (!frId) throw new Error('Failed to find created font ID for fr');

            // Create Group
            const groupId = context.addMetricGroup('Test Group FR', { h1Rem: 5.0 });
            // Assign Font
            context.assignFontToMetricGroup(frId, groupId);
        });

        // 3. Rerender to ensure FontTabs sees the update
        rerender(
            <TypoProvider>
                <ContextInitializer onReady={setContext} />
                <FontTabs />
            </TypoProvider>
        );

        // 4. Assert
        // Look for the group name "Test Group FR"
        expect(screen.getByText('Test Group FR')).toBeDefined();
        // Look for the header "Primary Font Groups"
        expect(screen.getByText('Primary Font Groups')).toBeDefined();
    });
});
