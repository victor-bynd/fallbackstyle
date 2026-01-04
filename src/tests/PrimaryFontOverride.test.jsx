import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import { FontCard } from '../components/FontCards';
import '@testing-library/jest-dom';

// Mock child components to isolate FontCard UI logic
vi.mock('../components/ResetConfirmModal', () => ({ default: () => <div data-testid="reset-confirm-modal" /> }));
vi.mock('../components/LanguageMultiSelectModal', () => ({ default: () => <div data-testid="lang-multi-select" /> }));
vi.mock('../components/FontSelectionModal', () => ({ default: () => <div data-testid="font-select-modal" /> }));
vi.mock('../components/InfoTooltip', () => ({ default: () => <div data-testid="info-tooltip" /> }));

// Mock context
vi.mock('../context/useTypo', () => ({
    useTypo: () => ({
        visibleLanguageIds: [],
        primaryFontOverrides: {},
        isLanguageVisible: () => true
    })
}));

describe('Primary Font Override UI', () => {
    const mockFont = {
        id: 'font-1',
        type: 'primary',
        family: 'Roboto',
        fontObject: { names: { fontFamily: { en: 'Roboto' } } }
    };

    const defaultProps = {
        font: mockFont,
        isActive: true,
        activeTab: 'ja-JP',
        onSelectLanguage: vi.fn(),
        getFontColor: () => '#000',
        updateFontColor: vi.fn(),
        getEffectiveFontSettings: () => mockFont,
        updateFallbackFontOverride: vi.fn(),
        updateFontWeight: vi.fn(),
        updateLanguageSpecificSetting: vi.fn(),
        setLetterSpacing: vi.fn(),
        fontFilter: [],
        handleScopedUpdate: vi.fn(),
        onOverride: vi.fn(),
    };

    test('shows Override Style button when isInherited is true', () => {
        render(
            <FontCard
                {...defaultProps}
                isInherited={true}
            />
        );

        expect(screen.getByText('Inherited from Global')).toBeInTheDocument();
        expect(screen.getByText('OVERRIDE STYLE')).toBeInTheDocument();
    });

    test('calls onOverride and does NOT show button when clicked (simulation requires parent state, but verify click)', () => {
        const onOverrideMock = vi.fn();
        render(
            <FontCard
                {...defaultProps}
                isInherited={true}
                onOverride={onOverrideMock}
            />
        );

        const btn = screen.getByText('OVERRIDE STYLE');
        fireEvent.click(btn);
        expect(onOverrideMock).toHaveBeenCalled();
    });

    test('does NOT show Override Style button when isInherited is false', () => {
        render(
            <FontCard
                {...defaultProps}
                isInherited={false}
            />
        );

        expect(screen.queryByText('Inherited from Global')).not.toBeInTheDocument();
        expect(screen.queryByText('OVERRIDE STYLE')).not.toBeInTheDocument();
    });
});
