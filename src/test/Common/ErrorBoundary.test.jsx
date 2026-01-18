import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { vi } from 'vitest';

// Suppress console.error for expected errors
const originalError = console.error;
beforeAll(() => {
    console.error = vi.fn();
});

afterAll(() => {
    console.error = originalError;
});

const ThrowError = () => {
    throw new Error('Test Error');
};

describe('ErrorBoundary', () => {
    it('should render children when no error', () => {
        render(
            <ErrorBoundary>
                <div>Safe Content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('Safe Content')).toBeInTheDocument();
    });

    it('should render error UI when error occurs', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/Error: Test Error/)).toBeInTheDocument();
    });
});
