# Testing Documentation

This document outlines the testing framework and test suite implemented for the project.

## Framework Overview
-   **Runner**: **Vitest** (configured in `vite.config.js` for fast, native execution)
-   **Environment**: **JSDOM** (simulates a browser environment for React components)
-   **Libraries**:
    -   `@testing-library/react`: For rendering components and Hooks.
    -   `@testing-library/jest-dom`: For standard DOM assertions.

## Running Tests
To run the entire test suite in watch mode:
```bash
npm run test
```

## Implemented Test Suites

### 1. Configuration Service (`src/services/ConfigService.test.js`)
Tests the core JSON import/export logic to ensure data integrity and backward compatibility.
*   **Normalization**: Verify Version 1 and Legacy configs are accepted.
*   **Serialization**: Verify application state is correctly converted to JSON and transient objects are stripped.

### 2. Weight Utilities (`src/utils/weightUtils.test.js`)
Tests the logic for resolving font weights against OpenType axes and static definitions.
*   **Axis Resolution**: Verify correct weight clamping and default selection.
*   **Static Fallback**: Verify static weights are used when axes are missing.

### 3. Typography Context (`src/context/TypoContext.test.jsx`)
Integration tests for the main application state provider.
*   **Initialization**: Verify default state (Active Font, Base Size).
*   **State Updates**: Verify `setBaseFontSize`, `addFallbackFont`, and `removeFallbackFont` functions.

### 4. Integration Lifecycle (`src/tests/ConfigLifecycle.test.jsx`)
Tests the end-to-end data flow from user interaction to export.
*   **Simulate Interaction**: Programmatically updates `useTypo` state (changing H1 scale).
*   **Verify State**: Confirms internal state updates.
*   **Simulate Export**: Calls `getExportConfiguration` and verifies that the resulting JSON matches the user's manual override.

## Future Recommendations
*   **E2E Testing**: Implement Playwright for browser interactions (drag-and-drop, real file uploads).
