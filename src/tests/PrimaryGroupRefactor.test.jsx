import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import TypoContext from '../context/TypoContext';
import FontTabs from '../components/FontTabs';
import { groupAndSortFonts } from '../utils/fontSortUtils';

// Mock helpers if needed, but integration test with Context is better.
// We need to construct a wrapper to access Context methods.

const TestWrapper = ({ children }) => {
    // We need a real provider. but TypoContext export is the Provider component which wraps children.
    // Wait, TypoContext default export IS the provider component (lines 1802).
    // So we can use it.
    return <TypoContext>{children}</TypoContext>;
};

// Component to drive the test
const TestDriver = ({ onReady }) => {
    const context = React.useContext(require('../context/TypoContext').useTypo());
    // Wait, TypoContext default export is the Provider. 
    // The hook is usually named `useTypo`. 
    // I need to find where `useTypo` is exported.
    // It's likely a named export or default export from context file?
    // In view_file 42/39/etc it showed `export default TypoContext`. 
    // I need to check if `useTypo` is exported. 
    // Line 1743 in FontTabs uses `useTypo()`.

    React.useEffect(() => {
        onReady(context);
    }, [context, onReady]);

    return null;
};

// Mock `useTypo` if I can't import it easily? 
// No, I should import it. 

describe('Primary Group Refactor', () => {
    let context;

    // We need to mocking/setup might be complex if we don't have direct access to internal state easily.
    // Instead, let's unit test the logic if possible, or use a component that exposes state.

    test('fontSortUtils groups primary overrides correctly', () => {
        const fonts = [
            { id: 'f1', type: 'primary', isPrimaryOverride: true, metricGroupId: 'g1' },
            { id: 'f2', type: 'primary', isPrimaryOverride: true, metricGroupId: 'g1' },
            { id: 'f3', type: 'primary', isPrimaryOverride: true }, // Standalone
            { id: 'fb1', type: 'fallback' }
        ];

        const metricGroups = {
            'g1': { id: 'g1', name: 'Group 1' }
        };

        const primaryOverridesMap = {
            'ja': 'f1',
            'ko': 'f2',
            'zh': 'f3'
        };

        const result = groupAndSortFonts(fonts, {}, primaryOverridesMap, metricGroups);

        expect(result.primaryOverrideGroups).toHaveLength(2); // Group 1 + Standalone (virtual group)

        const group1 = result.primaryOverrideGroups.find(g => g.type === 'group');
        expect(group1).toBeDefined();
        expect(group1.group.name).toBe('Group 1');
        expect(group1.fonts).toHaveLength(2);
        expect(group1.fonts.map(f => f.font.id).sort()).toEqual(['f1', 'f2'].sort());

        const standalone = result.primaryOverrideGroups.find(g => g.type === 'standalone');
        expect(standalone).toBeDefined();
        expect(standalone.fonts).toHaveLength(1);
        expect(standalone.fonts[0].font.id).toBe('f3');
    });

});
