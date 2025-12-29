import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import FontCards from '../components/FontCards';
import { useTypo } from '../context/useTypo';

// Mock dependencies
vi.mock('../context/useTypo');
vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: () => { },
        transform: null,
        transition: null,
        isDragging: false,
    }),
}));
vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => '' } },
}));

describe('FontCards Filtering', () => {
    const mockFonts = [
        { id: 'primary-font', type: 'primary', name: 'Primary Font', fileName: 'Primary.ttf' },
        { id: 'assigned-font', type: 'fallback', name: 'Assigned Font', fileName: 'Assigned.ttf', fontObject: {} },
        { id: 'unassigned-font', type: 'fallback', name: 'Unassigned Font', fileName: 'Unassigned.ttf', fontObject: {} },
        { id: 'primary-override-font', type: 'fallback', name: 'Primary Override', fileName: 'Override.ttf', fontObject: {}, isPrimaryOverride: true },
        { id: 'system-font', type: 'fallback', name: 'System Font', isSystem: true } // No fontObject
    ];

    const mockContext = {
        fonts: mockFonts,
        activeFont: 'primary-font',
        setActiveFont: vi.fn(),
        updateFontWeight: vi.fn(),
        toggleFontVisibility: vi.fn(),
        updateFallbackFontOverride: vi.fn(),
        resetFallbackFontOverrides: vi.fn(),
        removeFallbackFont: vi.fn(),
        colors: { missing: '#000' },
        setColors: vi.fn(),
        weight: 400,
        fontScales: { active: 100, fallback: 100 },
        lineHeight: 1.2,
        getFontColor: vi.fn(),
        updateFontColor: vi.fn(),
        getEffectiveFontSettings: vi.fn(() => ({})),
        fallbackFontOverrides: {
            // Simulate the structure used by addLanguageSpecificFont (cloning):
            // langId -> { originalFontId: newCloneId }
            'fr-FR': { 'assigned-font': 'assigned-font-clone-id' }
        },
        primaryFontOverrides: {},
        addLanguageSpecificPrimaryFont: vi.fn(),
        addLanguageSpecificFont: vi.fn(),
        setFontScales: vi.fn(),
        setIsFallbackLinked: vi.fn(),
        setLineHeight: vi.fn(),
        letterSpacing: 0,
        setLetterSpacing: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useTypo.mockReturnValue(mockContext);
    });

    it('shows both targeted and unassigned fonts in ALL tab', () => {
        render(<FontCards activeTab="ALL" />);

        // Primary should always be visible
        expect(screen.getAllByText(/Primary/).length).toBeGreaterThan(0);

        // Assigned font should be visible (Targeted section)
        expect(screen.getAllByText(/Assigned/).length).toBeGreaterThan(0);

        // Unassigned font SHOULD be visible (Unassigned section)
        expect(screen.getAllByText(/Unassigned/).length).toBeGreaterThan(0);

        // Check for "Targeted Fonts" header
        expect(screen.getByText('Targeted Fonts')).toBeInTheDocument();

        // Check for "FALLBACK FONTS" header (Renamed from Unassigned)
        expect(screen.getByText('FALLBACK FONTS')).toBeInTheDocument();

        // CRITICAL CHECK: Ensure the "Targeted Fonts" list is NOT empty.
        expect(screen.queryByText('No fonts have been targeted yet.')).not.toBeInTheDocument();

        // Check for "Unassigned" text. Should appear once (Font card name)
        expect(screen.getAllByText('Unassigned').length).toBe(1);

        // Primary Override should NOT be visible (filtered by !isPrimaryOverride)
        expect(screen.queryByText(/Override/)).not.toBeInTheDocument();

        // System Font
        expect(screen.getAllByText(/System Font/).length).toBeGreaterThan(0);
    });

    it('shows all assigned fonts when multiple are assigned', () => {
        useTypo.mockReturnValue({
            ...mockContext,
            fallbackFontOverrides: {
                'fr-FR': 'assigned-font',
                'es-ES': 'unassigned-font' // Now assigned
            }
        });

        render(<FontCards activeTab="ALL" />);

        expect(screen.getAllByText(/Assigned/).length).toBeGreaterThan(0);
        // Unassigned font becomes assigned, visible in Targeted list.
        expect(screen.getAllByText(/Unassigned/).length).toBeGreaterThan(0);
    });

    it('shows fonts assigned via primary overrides in ALL tab', () => {
        useTypo.mockReturnValue({
            ...mockContext,
            primaryFontOverrides: {
                'de-DE': 'unassigned-font' // Assigned as primary override to German
            },
            fallbackFontOverrides: {}
        });

        render(<FontCards activeTab="ALL" />);

        // "unassigned-font" is now assigned.
        expect(screen.getAllByText(/Unassigned/).length).toBeGreaterThan(0);
    });

    it('hides fonts assigned to other languages from fallback list in language view', () => {
        useTypo.mockReturnValue({
            ...mockContext,
            fallbackFontOverrides: {
                'fr-FR': 'unassigned-font' // Originally unassigned, now assigned to French
            },
            primaryFontOverrides: {}
        });

        // Render for Spanish (es-ES)
        render(<FontCards activeTab="es-ES" />);

        // 1. Primary Font (always visible as "Primary Font" section)
        expect(screen.getByText('Primary Font')).toBeInTheDocument();

        // 2. Targeted Fonts Section
        expect(screen.getByText('Targeted Font')).toBeInTheDocument();

        // 3. FALLBACK FONTS Section
        // 'unassigned-font' is assigned to 'fr-FR', so it should NOT appear in 'es-ES' fallback list.
        expect(screen.queryByText('Unassigned Font')).not.toBeInTheDocument();

        // 'System Font' is truly unassigned, so it should appear.
        expect(screen.getByText('System Font')).toBeInTheDocument();
    });
    it('shows targeted font when override is a string (direct assignment)', () => {
        const stringOverrideState = {
            ...mockContext,
            // Simulate that we are in a language tab (e.g., Japanese)
            activeConfigTab: 'ja-JP',
            fallbackFontOverrides: {
                'ja-JP': 'unassigned-font' // The font ID directly
            }
        };

        // Note: activeTab prop on FontCards should match
        useTypo.mockReturnValue(stringOverrideState);

        render(<FontCards activeTab="ja-JP" />);

        // Should find "Targeted Font" section
        const targetedHeader = screen.getByText('Targeted Font');
        // The section containing the header
        const targetedSection = targetedHeader.closest('div').parentElement;

        // Verify "Unassigned Font" (which is now assigned) is in the Targeted section
        expect(within(targetedSection).getByText('Unassigned')).toBeInTheDocument();

        // Should NOT find it in the "FALLBACK FONTS" section
        // Fallback Fonts header
        const fallbackHeader = screen.getByText('FALLBACK FONTS');
        // The section containing the header
        const fallbackSection = fallbackHeader.closest('div').parentElement;

        expect(within(fallbackSection).queryByText('Unassigned')).not.toBeInTheDocument();
    });
});
