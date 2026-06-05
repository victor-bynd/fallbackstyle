# Code Review - Cleanliness and Performance Scan

Date: 2026-06-04

Scope: Read-only review of the current working tree, focused on code cleanliness and performance. Tests were not run per project instruction.

## Findings

### P2 - CSS export repeats expensive font lookups

Files:
- `src/apps/multi-language/components/ExportCSSModal.jsx`
- `src/shared/hooks/useFontStack.js`
- `src/shared/context/TypographyContext.jsx`

`ExportCSSModal` generates selectors for every visible language and every style. For each language/style pair, it calls `buildFallbackFontStackForStyle`, which loops through style fonts and calls `getEffectiveFontSettingsForStyle`. That settings helper does a fresh `style.fonts.find` for each font.

This turns export generation into repeated language x style x font scans. It is probably fine for small projects, but users can add many languages and fonts, so the cost can grow quickly.

Suggested cleanup:
- Precompute `styleIds` once inside the export memo.
- Build `fontsById` and primary-font maps per style.
- Cache effective settings per `styleId/fontId` for the duration of CSS generation.
- Consider a lower-level helper that accepts pre-indexed style data instead of using context getters in tight loops.

### P2 - Font upload paths parse synchronously on the UI thread

Files:
- `src/apps/multi-language/components/AddLanguageModal.jsx`
- `src/apps/multi-language/components/FallbackFontAdder.jsx`
- `src/apps/multi-language/components/FontCards.jsx`
- `src/apps/multi-language/components/LanguageActionMenu.jsx`
- `src/apps/multi-language/components/FontUploader.jsx`
- `src/apps/multi-language/components/FontManagerModal.jsx`
- `src/apps/multi-language/components/Onboarding.jsx`
- `src/shared/services/FontLoader.js`
- `src/shared/services/SafeFontLoader.js`

Most upload entry points call `parseFontFile`, which uses `opentype.parse` synchronously after `FileReader` completes. The project has `SafeFontLoader`, but usage is inconsistent, and `safeParseFontFile` still validates in a worker and then reparses on the main thread.

This can cause UI stalls with large fonts or batches of fonts, and the inconsistent loader paths make future safety/performance fixes harder to apply globally.

Suggested cleanup:
- Introduce a single shared upload/parse service used by all font upload entry points.
- Move parsing fully off the main thread if possible, or return enough worker-produced metadata to avoid immediate reparsing.
- If main-thread parsing must remain, batch work with yielding/concurrency limits for multi-file uploads.
- Centralize error handling, accepted extensions, duplicate checks, URL creation, and `fontBuffer` propagation.

### P2 - Bulk language assignment performs repeated state updates

File:
- `src/shared/context/LanguageMappingContext.jsx`

`assignFontToMultipleLanguages` filters fonts once per target language and calls `setLanguageVisibility` once per language before performing the style update. For large selections, this creates repeated full-array scans and avoidable renders.

Suggested cleanup:
- Build a `Set` of target language IDs once.
- Filter language-specific fonts in a single `setFonts` call.
- Update visible language IDs in one state update.
- Keep the existing single `updateStyleState` call for mapping/configured language updates.

### P3 - Brand CSS generation computes fallback font-face blocks twice

File:
- `src/apps/brand-font/index.jsx`

The CSS export appends `generateFontFaceBlock` for each font, then `generateUsageClass` calls `generateFontFaceBlock` again to decide whether a special family is needed. That duplicates string generation and makes the helper relationship harder to read.

Suggested cleanup:
- Compute the font-face block once per font.
- Pass either the block itself or a `hasFontFaceBlock` boolean into `generateUsageClass`.
- This would make the export path simpler and remove duplicate work.

### P3 - `removeFallbackFont` performs side-effect bookkeeping inside a state updater

File:
- `src/shared/context/FontManagementContext.jsx`

`removeFallbackFont` collects blob URLs to revoke from inside the `setFonts` updater and revokes them afterward. The revocation itself happens outside the updater, but mutating `urlsToRevoke` inside the updater is still side-effect bookkeeping in render-state logic.

In React Strict Mode and future concurrent flows, updater purity is worth preserving.

Suggested cleanup:
- Derive related font IDs and URLs before calling `setFonts` when possible.
- Keep the updater focused on returning the next fonts array.
- Revoke URLs from the precomputed list after the state update is scheduled.

### P3 - Font-face hook performs repeated sibling URL recovery scans

File:
- `src/shared/hooks/useFontFaceStyles.js`

During font-face CSS generation, the hook searches sibling fonts for a recoverable URL inside the per-font map. It also logs from inside the memo when recovery happens.

This is a minor performance issue and a cleanliness issue: render-time memo code should avoid noisy side effects, and repeated sibling scans are easy to precompute.

Suggested cleanup:
- Precompute a map from font name/file name to available `fontUrl` per style.
- Use that map during fallback rule generation.
- Move recovery warnings behind a debug logger or emit them outside render-time memo generation.

## Notes

- Existing uncommitted changes were treated as user-owned and were not modified.
- This review did not run tests or perform runtime verification.
