import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FontCardSettings from '../../apps/multi-language/components/FontCardSettings';

const renderSettings = (overrides = {}) => {
    const props = {
        isPrimary: true,
        font: { id: 'primary', type: 'primary' },
        editScope: 'fr-FR',
        baseRem: 16,
        setBaseRem: vi.fn(),
        readOnly: false,
        scopeFont: { id: 'lang-primary-fr-FR', type: 'primary', isPrimaryOverride: true },
        scopeFontId: 'lang-primary-fr-FR',
        handleScopedUpdate: vi.fn(),
        getEffectiveFontSettings: vi.fn(() => ({
            baseFontSize: 16,
            scale: 100,
            lineHeight: 'normal',
            letterSpacing: 0
        })),
        weightOptions: [{ value: 400, label: '400' }],
        resolvedWeight: 400,
        isInherited: false,
        scopeFontSettings: {
            baseFontSize: 16,
            scale: 100,
            lineHeight: 'normal',
            letterSpacing: 0
        },
        isReference: false,
        showAdvanced: false,
        setShowAdvanced: vi.fn(),
        isLineHeightLocked: false,
        ...overrides
    };

    render(<FontCardSettings {...props} />);
    return props;
};

describe('FontCardSettings primary language sizing', () => {
    it('updates the scoped primary face scale without changing the stack base size', () => {
        const props = renderSettings();

        expect(screen.queryByText('Size (Base REM)')).not.toBeInTheDocument();
        expect(screen.getByText('Primary Size-Adjust')).toBeInTheDocument();

        fireEvent.change(screen.getByRole('slider', { name: 'Primary size-adjust' }), {
            target: { value: '85' }
        });

        expect(props.handleScopedUpdate).toHaveBeenCalledWith('scale', 85);
        expect(props.setBaseRem).not.toHaveBeenCalled();
    });

    it('keeps the base-size control for the global primary scope', () => {
        renderSettings({ editScope: 'ALL' });

        expect(screen.getByText('Size (Base REM)')).toBeInTheDocument();
        expect(screen.queryByText('Primary Size-Adjust')).not.toBeInTheDocument();
    });
});
