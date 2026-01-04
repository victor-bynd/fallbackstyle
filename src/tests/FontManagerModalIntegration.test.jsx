
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FontManagerModal from '../components/FontManagerModal';
import { useTypo } from '../context/useTypo';

// Mock the context hook
vi.mock('../context/useTypo');

// Mock child components to simplify testing (especially DnD)
vi.mock('../components/SortableFontRow', () => ({
    default: ({ item, isPrimary, onOpenLanguagePicker }) => (
        <div data-testid={`font-row-${item.id}`}>
            <span>{item.name}</span>
            {isPrimary && <span data-testid="is-primary">Primary</span>}
            <button
                data-testid={`map-btn-${item.id}`}
                onClick={() => onOpenLanguagePicker(item.id)}
            >
                Map
            </button>
        </div>
    )
}));

vi.mock('../components/LanguageList', () => ({
    default: ({ onSelect, selectedIds }) => (
        <div data-testid="language-list">
            <button onClick={() => onSelect('fr-FR')}>French</button>
            <button onClick={() => onSelect('es-ES')}>Spanish</button>
        </div>
    )
}));

// Mock DnD Kit to just render children
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }) => <div>{children}</div>,
    closestCenter: {},
    KeyboardSensor: {},
    PointerSensor: {},
    useSensor: () => { },
    useSensors: () => { },
    DragOverlay: () => null
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }) => <div>{children}</div>,
    verticalListSortingStrategy: {},
    sortableKeyboardCoordinates: {},
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: () => { },
        transform: null,
        transition: null,
        isDragging: false
    })
}));

describe('FontManagerModal Integration', () => {
    let mockContext;
    const assignFontToMultipleLanguagesMock = vi.fn();

    beforeEach(() => {
        assignFontToMultipleLanguagesMock.mockClear();

        mockContext = {
            fonts: [
                { id: 'primary-font', name: 'Primary Font', type: 'primary' },
                { id: 'fallback-font', name: 'Fallback Font' }
            ],
            reorderFonts: vi.fn(),
            removeFallbackFont: vi.fn(),
            languages: [
                { id: 'en-US', name: 'English (US)' },
                { id: 'fr-FR', name: 'French' },
                { id: 'es-ES', name: 'Spanish' }
            ],
            fallbackFontOverrides: {},
            primaryFontOverrides: {},
            updateFallbackFontOverride: vi.fn(),
            addLanguageSpecificPrimaryFont: vi.fn(),
            toggleFontGlobalStatus: vi.fn(),
            normalizeFontName: (name) => name,
            assignFontToMultipleLanguages: assignFontToMultipleLanguagesMock,
            loadFont: vi.fn()
        };

        useTypo.mockReturnValue(mockContext);
    });

    it('should allow mapping languages to the Primary Font', () => {
        render(<FontManagerModal onClose={() => { }} />);

        // Verify Primary Font is rendered
        const primaryRow = screen.getByTestId('font-row-primary-font');
        expect(primaryRow).toBeInTheDocument();
        expect(within(primaryRow).getByTestId('is-primary')).toBeInTheDocument();

        // Click Map Button for Primary Font
        const mapBtn = within(primaryRow).getByTestId('map-btn-primary-font');
        fireEvent.click(mapBtn);

        // Verify Language List appears (meaning we switched view to picker)
        expect(screen.getByTestId('language-list')).toBeInTheDocument();
        expect(screen.getByText('Map Language for Primary Font')).toBeInTheDocument();

        // Click French to map it
        fireEvent.click(screen.getByText('French'));

        // Verify assignFontToMultipleLanguages called with correct args
        expect(assignFontToMultipleLanguagesMock).toHaveBeenCalledWith('primary-font', ['fr-FR']);
    });
});
