import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InfoTooltip from '../../shared/components/InfoTooltip';
import { vi } from 'vitest';

describe('InfoTooltip', () => {
    it('should render children trigger', () => {
        render(<InfoTooltip content="Tooltip content"><span>Trigger</span></InfoTooltip>);
        expect(screen.getByText('Trigger')).toBeInTheDocument();
    });

    it('should render default icon if no children', () => {
        // Render without children, should find the svg or wrapper
        const { container } = render(<InfoTooltip content="Tooltip content" />);
        // The default icon is an SVG inside a text-slate-400 div
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show tooltip on mouse enter and hide on leave', () => {
        render(<InfoTooltip content="Tooltip content"><span>Trigger</span></InfoTooltip>);
        const trigger = screen.getByText('Trigger').closest('div').parentElement; // The wrapping div has listeners

        // Initially hidden
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();

        // Hover
        fireEvent.mouseEnter(trigger);
        expect(screen.getByText('Tooltip content')).toBeInTheDocument();

        // Leave
        fireEvent.mouseLeave(trigger);
        expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
});
