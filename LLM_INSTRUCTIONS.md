# LLM Instructions for Multilang Tool

This file contains strict instructions for any Large Language Model (LLM) or developer working on the **Multilang Tool** components (located in `src/components/MultiLanguage/` and `src/pages/MultiLanguageFallback.jsx`).

## 1. PRESERVE FUNCTIONALITY
- **Do NOT remove or alter existing logic** unless explicitly requested.
- If you refactor code, you **MUST** ensure that all existing tests pass.
- Key functionality includes:
    - Language selection and filtering.
    - Fallback font inheritance and overrides.
    - Font metric calculations (vertical metric overrides).
    - Configuration export/import.

## 2. TESTING REQUIREMENTS
- **Run `npm test`** before making changes to understand the baseline.
- **Run `npm test`** after every change to verify no regressions.
- If you add new features, you **MUST** add corresponding tests in `src/test/MultiLanguage/`.
- Use the helper mocks in `src/test/test-utils.jsx` to simplify test setup.

## 3. DESTRUCTIVE CHANGES
- Avoid changing file structures or component hierarchies without a comprehensive migration plan.
- Do not delete existing tests. Update them if the behavior intentionally changes.

## 4. CRITICAL COMPONENTS
- `LanguageCard.jsx`: Handles complex font fallback visualization. Be extremely careful with metric overrides logic.
- `MultiLanguageFallback.jsx`: The main coordinator. Ensure state management for selection/highlighting remains intact.
- `AddLanguageModal.jsx`: Ensure interaction flows (select -> confirm) are preserved.

## 5. MOCKING
- Use `mockUseTypo` and `mockUseUI` from `src/test/test-utils.jsx`.
- Update these mocks if you add new properties to the Contexts. Don't mock them locally in every file to avoid inconsistencies.

## 6. COMMON COMPONENTS
Components in `src/components/Common/` are SHARED across tools.
- **Do NOT** introduce tool-specific logic (e.g. imports from `../BrandFont/`) into these components.
- Any change to `BufferedInput.jsx` or `ViewModeSelector.jsx` MUST be verified in BOTH:
    1. Brand Font Tool
    2. Multilang Tool
- Run `npm test src/test/Common` after any changes to these files.

_These instructions are to be followed strictly to maintain the stability of the Multilang Tool._
