import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import React from 'react';
import { TypoProvider } from '../context/TypoContext';
import FontCards from '../components/FontCards';
import { DndContext } from '@dnd-kit/core';

// Mock FontLoader services
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

describe('FontCards Component', () => {
    it('renders without crashing', () => {
        render(
            <TypoProvider>
                <DndContext>
                    <FontCards />
                </DndContext>
            </TypoProvider>
        );
    });
});
