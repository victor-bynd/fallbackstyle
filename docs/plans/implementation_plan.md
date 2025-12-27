# Implementation Plan - JSON Configuration Export/Import

This plan outlines the steps to replace the existing CSS export functionality with a comprehensive JSON export/import system. This system will allow users to save their entire styling configuration and restore it, with specific handling for re-uploading custom font files.

## User Review Required

> [!IMPORTANT]
> **Breaking Change**: The "Export CSS" button will be removed and replaced with "Export Config" / "Import Config". The CSS export logic will be completely removed as requested.

## Proposed Changes

### Component Layer

#### [NEW] [ConfigManager.jsx](file:///Users/victortolosa/Documents/GitHub/localize-type/src/components/ConfigManager.jsx)
- **Purpose**: Manage the buttons for Export and Import, and handle the import flow logic (parsing JSON, identifying missing fonts).
- **Features**:
    - `handleExport`: Gathers state from `useTypo`, serializes it, and triggers a JSON download.
    - `handleImport`: Reads a JSON file, validates structure.
    - **Missing Fonts Logic**: Compares imported font records against necessity for file objects. If files are needed (non-system fonts), triggers the `MissingFontsModal`.

#### [NEW] [MissingFontsModal.jsx](file:///Users/victortolosa/Documents/GitHub/localize-type/src/components/MissingFontsModal.jsx)
- **Purpose**: A dialog shown when an imported configuration requires font files that are missing.
- **UI**:
    - List of missing fonts (names/filenames).
    - Drop area / file input to upload these files.
    - "Resolve" logic: Matches uploaded files to missing entries by filename.
    - "Finish Import" button: Enabled when all fonts are provided (or maybe allowed to skip?).

#### [MODIFY] [SideBar.jsx](file:///Users/victortolosa/Documents/GitHub/localize-type/src/components/SideBar.jsx)
- **Changes**:
    - Remove `CSSExporter` import and button.
    - Add `ConfigManager` component to the bottom sidebar area.

#### [DELETE] [CSSExporter.jsx](file:///Users/victortolosa/Documents/GitHub/localize-type/src/components/CSSExporter.jsx)
- Remove as user requested.

#### [DELETE] [cssExporter.js](file:///Users/victortolosa/Documents/GitHub/localize-type/src/utils/cssExporter.js)
- Remove utility logic.

### State / Context Layer

#### [MODIFY] [TypoContext.jsx](file:///Users/victortolosa/Documents/GitHub/localize-type/src/context/TypoContext.jsx)
- **New Action**: `replaceState(newState)` or `restoreConfiguration(config, fontFilesMap)`
    - This function will take the parsed JSON configuration and a map of `id -> File` (for the re-uploaded fonts).
    - It will need to:
        1. Reconstruct `fontStyles`.
        2. For each font in the import, if it has a corresponding file in `fontFilesMap`, parse that file (using `parseFontFile` logic) to recreate the `fontObject` and `fontUrl`.
        3. Restore all other simple state variables (`activeFontStyleId`, `headerStyles`, `overrides`, etc.).
        4. Persist necessary parts (like `visibleLanguageIds`) to localStorage if needed.

## Verification Plan

### Manual Verification
1.  **Export Flow**:
    -   Configure the app (add fonts, change weights, set overrides).
    -   Click "Export Config".
    -   Verify a `.json` file is downloaded.
    -   Inspect JSON content to ensure it contains all expected data.
2.  **Import Flow - No Missing Fonts**:
    -   Export a simple config (system fonts only, if possible, or just settings).
    -   Refresh page (reset state).
    -   Import the JSON.
    -   Verify settings are restored.
3.  **Import Flow - With Missing Fonts**:
    -   Upload a custom font (e.g., `Roboto-Regular.ttf`).
    -   Configure settings.
    -   Export JSON.
    -   Refresh page.
    -   Import JSON.
    -   **Expect**: Modal "Missing Fonts" appears listing `Roboto-Regular.ttf`.
    -   Upload the file.
    -   **Expect**: Import completes, font displays correctly, settings restored.
4.  **Order Preservation**:
    -   Create a stack with 3 fonts. Reorder them.
    -   Export -> Refresh -> Import.
    -   Verify order is exactly as exported.

### Automated Tests
- No existing unit tests found for UI interactions. Verification will be primarily manual user testing.
