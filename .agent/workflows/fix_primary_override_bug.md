---
description:
# Fix Primary Override Deletion Bug

1.  **Reproduce**: Create a test case confirming that deleting a primary override font causes text to disappear or fallback incorrectly. (Done: `src/tests/PrimaryOverrideDeletion.test.jsx`)
2.  **Fix Rendering**: Update `LanguageCard.jsx` to fallback to Global Primary if the override font is missing. (Done)
3.  **Fix Font Family**: Update `LanguageCard.jsx` to ensure `font-family` CSS property doesn't point to a deleted override ID. (Done)
4.  **Fix State Cleanup**: Update `removeFallbackFont` in `TypoContext.jsx` to ensure `primaryFontOverrides` and `fallbackFontOverrides` maps are cleaned up when a font is deleted. This fixes the checkbox state in `LanguageCard`. (Done)
5.  **Verify**: Ensure tests pass and UI behaves correctly. (Done)
gic:
   - Current: `primaryOverrideId ? 'FallbackFont...' : 'UploadedFont...'`
   - New: Check if `effectivePrimaryFont` (or `primaryFont` in the loop variables) is actually the override font.
   - `const isActualOverride = primaryFont?.id === primaryOverrideId;`
   - `fontFamily: isActualOverride ? ... : ...`
   - Ensure `primaryFont` is the variable holding the robustly resolved font object.
3. Verify both the list loop (lines ~540+) and the single view (lines ~650+) are updated.
