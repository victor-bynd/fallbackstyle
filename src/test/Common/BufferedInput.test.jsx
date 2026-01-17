import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BufferedInput from '../../shared/components/BufferedInput';
import { vi } from 'vitest';

describe('BufferedInput', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('should render with initial value', () => {
        render(<BufferedInput value="initial" onChange={mockOnChange} />);
        expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
    });

    it('should update local state on change if focused', () => {
        const Wrapper = () => {
            const [val, setVal] = React.useState('initial');
            return <BufferedInput value={val} onChange={(e) => setVal(e.target.value)} />;
        };
        render(<Wrapper />);
        const input = screen.getByDisplayValue('initial');

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'updated' } });

        expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
    });

    it('should sync with external updates when not focused', () => {
        const { rerender } = render(<BufferedInput value="initial" onChange={mockOnChange} />);

        rerender(<BufferedInput value="external" onChange={mockOnChange} />);

        expect(screen.getByDisplayValue('external')).toBeInTheDocument();
    });

    it('should not sync external updates if focused and values are numerically equivalent', () => {
        const { rerender } = render(<BufferedInput value="1" onChange={mockOnChange} />);
        const input = screen.getByDisplayValue('1');

        // Focus the input
        fireEvent.focus(input);

        // User types "1."
        fireEvent.change(input, { target: { value: '1.' } });

        // Simulate parent updating value to "1" (since 1. == 1)
        rerender(<BufferedInput value="1" onChange={mockOnChange} />);

        // Should verify that input still says "1."
        expect(screen.getByDisplayValue('1.')).toBeInTheDocument();
    });

    it('should sync on blur', () => {
        render(<BufferedInput value="initial" onChange={mockOnChange} />);
        const input = screen.getByDisplayValue('initial');

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'changed' } });
        fireEvent.blur(input);

        // On blur it re-syncs with prop value if provided
        // Since prop is still "initial" (we didn't rerender with new prop), it might revert if logic dictates
        expect(input.value).toBe('initial');
    });
});
