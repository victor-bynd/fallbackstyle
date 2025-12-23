
import React, { useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FontTabs from '../components/FontTabs';
import { TypoProvider } from '../context/TypoContext';
import { useTypo } from '../context/useTypo';
import { DndContext } from '@dnd-kit/core';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    loadFont: vi.fn(),
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(() => 'mock-url'),
}));

// Mock weightUtils
vi.mock('../utils/weightUtils', () => ({
    buildWeightSelectOptions: () => [{ value: 400, label: 'Regular' }],
    resolveWeightToAvailableOption: () => 400,
    resolveWeightForFont: () => 400
}));

const TestSeeder = ({ onReady }) => {
    const { loadFont, createGroupForFont, fonts, metricGroups } = useTypo();

    useEffect(() => {
        const seed = async () => {
            // 1. Load a primary font if not exists (TypoContext usually initializes with one)
            // 2. Add an override? 
            // TypoContext doesn't have "addPrimaryOverride" explicit method exposed easily maybe? 
            // Actually `FontTabs` uses `updateFallbackFontOverride` or relies on `primaryFontOverrides` map... 
            // Wait, `loadFont` adds a primary font if type is primary.

            // To mock a "primary override", we need a font with type='primary' and isPrimaryOverride=true.
            // TypoContext usually derives this from `primaryFontOverrides` map.

            // Let's manually inject state if possible, or use available methods.
            // `createGroupForFont` works on an EXISTING font ID.

            // We need to add a font that is a primary override.
            // Looking at TypoContext:
            // It doesn't seem to expose a direct "addOverride" easily for testing without satisfying the "file upload" or similar flow.
            // BUT `loadFont` serves to add fonts. 

            // Let's try to mock the context logic? No, we want integration.

            // We can use `createGroupForFont` on the DEFAULT primary font?
            // The default primary font has ID 'primary'.
            // If we group the MAIN primary font, it might show up as a group?
            // FontTabs logic: `primaryOverrideGroups` comes from `groupAndSortFonts`.
            // `groupAndSortFonts` groups `primary.filter(f => f.isPrimaryOverride)`.

            // So we MUST have a font with `isPrimaryOverride: true`.
            // TypoContext: `loadFont` adds to `fonts`.

            // We can simulate adding a primary override by hacking `fonts` via `setFonts`? 
            // `setFonts` is exposed in TypoContext rendering? 
            // Checked TypoContext: `setFonts` is NOT returned in `values`.

            // We need a way to get a primary override.
            // `FontTabs` usually handles "Replace Main Font" but for override?
            // Ah, `LanguageCard` usually handles "Override Primary".
            // It calls ... what?
            // `LanguageCard` calls `createPrimaryOverride`? 

            // Let's checking `useTypo` return values in `TypoContext.jsx`.
        };
        seed();
    }, []);

    return null;
};

// We need to force a primary override into the state.
// Since we can't easily do it via public API in this test without reproducing LanguageCard logic,
// We will mock `useTypo` for the `FontTabs` component, OR
// We will modify `TypoContext` to allow testing, OR
// We will rely on `addLanguageSpecificPrimaryFont` if it exists.
// Checking TypoContext.jsx ... 
// Expecting something like `addLanguageSpecificPrimaryFont`?
// I saw it in `PrimaryGroupCreation.test.jsx`: `capturedContext.addLanguageSpecificPrimaryFont('zh')`.
// So it MUST be there!

const Seeder = ({ groupName }) => {
    const { addLanguageSpecificPrimaryFont, createGroupForFont, primaryFontOverrides } = useTypo();
    const [step, setStep] = React.useState(0);

    useEffect(() => {
        if (step === 0) {
            addLanguageSpecificPrimaryFont('fr');
            setStep(1);
        } else if (step === 1) {
            const fontId = primaryFontOverrides['fr'];
            if (fontId) {
                createGroupForFont(fontId, groupName, { h1Rem: 2.5 });
                setStep(2);
            }
        }
    }, [step, addLanguageSpecificPrimaryFont, createGroupForFont, groupName, primaryFontOverrides]);

    return null;
};

describe('Primary Group UI', () => {
    it('renders the group header with the correct name', async () => {
        render(
            <DndContext>
                <TypoProvider>
                    <Seeder groupName="My Custom Group" />
                    <FontTabs />
                </TypoProvider>
            </DndContext>
        );

        // Expect "My Custom Group" to be visible
        // It might take a moment to render
        await waitFor(() => {
            expect(screen.getByText('My Custom Group')).toBeDefined();
        });

        // Also check for "Primary Override Group" subtext
        expect(screen.getByText('Primary Override Group')).toBeDefined();

        // New Layout Assertions:
        // 1. Group Header (Already checked)
        // 2. Font Card (Check for "Default Primary" or similar text from SortableFontCard)
        expect(screen.getAllByText('No font uploaded').length).toBeGreaterThan(0);

        // 3. Language Tags (Check for "French" since we seeded 'fr')
        // Note: 'fr' might map to "French" via languages.json mock or real data. 
        // Our languages.json is real import in FontTabs, but not mocked here.
        // Wait, FontTabs imports languages.json. If we don't mock it, it uses real data.
        // Assuming 'fr' is in languages.json as "French". 
        // If not found, it renders 'fr'. Let's check for 'fr' or 'French'.
        // Actually, let's just check that the tag is present in the document.
        // The tag text is likely "French" or "fr".
        const frenchTag = screen.queryByText('French') || screen.queryByText('fr');
        expect(frenchTag).not.toBeNull();

        // 4. Verify Redundant Sliders are GONE
        // "H1 Size (rem)" was the label for the removed slider.
        expect(screen.queryByText('H1 Size (rem)')).toBeNull();

        // "Line Height" label outside the card should be gone.
        // Note: SortableFontCard has "Line Height" too, but it might be hidden or different label?
        // SortableFontCard labels are usually inside.
        // The removed slider header had class "text-[10px] text-slate-500".
        // Let's rely on H1 Size being unique enough.
    });
});
