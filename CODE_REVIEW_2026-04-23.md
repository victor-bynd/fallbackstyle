# Code review: fallbackstyle

Date: 2026-04-23
Scope: src/ excluding node_modules/dist
Focus: correctness, performance, maintainability

Prior review issues (CODE_REVIEW.md, Jan 26) were mostly resolved — god-object TypoContext split into 5 providers, normalizeFontName extracted, blob URL cleanup fixed, Logger service created. The issues below are current state.

## Correctness and bugs

### ConfigService.validateConfig only inspects the 'primary' style

ConfigService.js line 116: `const styles = ['primary'];`. If the app ever produces a multi-style config (the code paths in FontManagementContext use `fontStyles[styleId]` generically), every non-primary style's orphan overrides go uncleaned. This is a latent correctness bug the moment a second style is added. Either iterate `Object.keys(cleanData.fontStyles)` or document the single-style invariant somewhere enforceable.

### useConfigImport calls restoreConfiguration with the wrong signature

useConfigImport.js lines 156 and 178 call `restoreConfiguration(rawConfig, {})` and `restoreConfiguration(pendingConfig, fileMap)`, passing two arguments. PersistenceContext.restoreConfiguration accepts one argument. The extra arg is silently ignored — which means the `fileMap` branch on line 178 does nothing and the font-file rehydration implied by that call path is being dropped. Either add fileMap as a real parameter or delete the second argument at call sites.

### SafeFontLoader shares one worker across concurrent calls, with a destructive timeout

SafeFontLoader.js uses a lazy singleton worker. The timeout branch on lines 86-89 terminates the worker wholesale. If a user uploads 10 fonts at once and one times out, every in-flight sibling also loses its worker and its message-listener handle — they'll hang until their own timeouts fire. Fix: either spawn a worker per request, or queue requests through a single worker instead of parallelizing them.

### useFontStack builds excludedFontIds globally but applies it per-language

useFontStack.js lines 27-43 gather excluded font IDs from `Object.values(fallbackOverrides)` across all languages, then filter every language's stack against that shared set. A font used as an override for lang A gets removed from the general fallback stack for lang B even if B has no such override. This may be intentional (dedupe), but it's not obviously correct — a user viewing lang B loses a stack entry because of a mapping in an unrelated language. Worth verifying against product intent and adding a comment either way.

### escapeCSSString is insufficient

useFontFaceStyles.js escapeCSSString handles `\`, `'`, `\n` only. Font `id` values — which are `Date.now() + Math.random()` strings — are interpolated into CSS family names (`'FallbackFont-${styleId}-${font.id}'`) without any escape. Low severity because ids are machine-generated, but if any user-provided string ever hits a CSS context here, you've got an injection surface. Consider CSS.escape() or a strict allowlist regex.

### TypoContext.test.jsx is broken dead code

src/shared/context/TypoContext.test.jsx (250 lines) imports `./TypoContext` and `./TypoContextDefinition` — neither file exists. The test will fail immediately on `vitest`. Delete it, or the CI signal is misleading.

### DebugLogger.jsx is empty

src/shared/components/DebugLogger.jsx contains only `import React from 'react';` and no references anywhere in src. Delete.

### Auto-save in PersistenceContext double-depends

PersistenceContext.jsx useEffect around lines 329-340 lists both individual properties of `fontContext` AND `fontContext` itself in the dependency array. The object reference changes on every render, so the effect fires more often than the granular deps suggest. Pick one; the granular list is the right one.

### indexedDB.databases() is not universally supported

PersistenceContext.jsx uses `indexedDB.databases()`. Firefox doesn't implement it (historically — verify if still true in current versions). If it returns undefined or throws, the reset path can break silently. Add a feature check or wrap in try/catch with a documented fallback.

### Non-deterministic IDs

FontManagementContext uses `Date.now() + Math.random()` for font IDs. Low probability of collision, but `crypto.randomUUID()` is available in all target browsers that run React 19 — use that instead. Also simplifies the "what can be in an id" story for the CSS escape concern above.

### getFont cache can serve stale data

PersistenceService.js caches `_dbInstance` forever unless explicitly closed. If anything deletes the database externally (devtools, another tab, your own `clear()` followed by reload race), the cached handle is stale. Low-risk in practice, but the `indexedDB.deleteDatabase` reset path should invalidate `_dbInstance`.

### setBaseFontSize and setBaseRem both mutate both values

TypographyContext.jsx: the two setters are redundant. Either rename to make the coupling obvious (`setBaseSize`) or keep one as a derived computation. As-is, reading the code twice to understand why two different setters do the same thing is wasted attention.

## Performance

### Context useMemo dep lists are unmanageable

LanguageMappingContext has a useMemo with ~40 dependencies. FontManagementContext has one with ~30. Any of those identity changes invalidates the whole context value, re-rendering every consumer. The practical effect is that typing in a debounced input or toggling a boolean upstream re-renders every language card, every font card, and the entire preview grid. Two options: split each context into a state slice and an action slice (actions are stable, state is targeted), or stop memoizing entirely and let React skip on referential equality per-consumer via `useSyncExternalStore`. The memoization as written costs CPU without meaningfully reducing renders.

### addLanguageSpecificFallbackFont reads stale `fonts`

LanguageMappingContext.jsx — the callback closes over `fonts` as a dependency, so it rebuilds on every font change. Use `setFonts(prev => ...)` functional form so the callback identity stays stable and you don't churn every consumer whenever a font is added.

### updateFontWeight captures `fonts`

FontManagementContext.jsx: same pattern. The setter is listed as a dep and re-created on every fonts change. Functional setState avoids this.

### FontManagement reset handler reattaches on every fontStyles change

FontManagementContext.jsx line 744 area: the reset handler depends on `fontStyles`. Every style change (every slider move) re-registers it. Stable callbacks via refs or functional updates.

### useTextRenderer renders per-char spans uncached

useTextRenderer.jsx slow path (when `showFallbackColors || showBrowserGuides`) renders `text.length × fallbackStack.length` lookups per render, uncached. For a language card previewing a full paragraph with 5 fallbacks, that's a lot of per-keystroke work. Memoize the glyph-support map per font, or switch to a `Map<char, stackIndex>` built once per fallback stack change.

### Auto-save on every keystroke

PersistenceContext auto-saves on every dependency change. For a slider or a typing input, you're writing to IndexedDB dozens of times per second. Debounce — 250–500ms is invisible to the user and cuts IDB writes by two orders of magnitude.

### Scroll interval polling every 50ms up to 500ms

multi-language/index.jsx line 319: `setInterval(50)` polling for a DOM element after `activeConfigTab`/`highlitLanguageId` change. Use `MutationObserver` on a parent container, or a `requestAnimationFrame` loop, or simply scroll once in a useLayoutEffect — the polling pattern is a smell and will fire on every focus tab change.

## Maintainability

### Component sizes

Largest jsx files: multi-language/index.jsx 1046, FontCards.jsx 976, brand-font/index.jsx 821, FontUploader.jsx 627, FontCard.jsx 617. The top two are 40%+ markup inline. You already split contexts successfully; apply the same treatment to these shells. The prior review called this out and it's still the biggest ergonomic debt in the repo.

### Logger adoption is incomplete

64 `console.*` calls across 23 files. PersistenceService (10), brand-font/index.jsx (7), FontUploader.jsx (7), useConfigImport.js (6). The Logger service exists — these should be migrated. At minimum replace the user-facing file-parse errors; those will leak to production console in release builds.

### alert() for user feedback

21 `alert()` calls across the codebase for error surfaces — bad parse, missing font, duplicate file, "invalid configuration file format." `alert` blocks the main thread, cannot be tested headlessly, is unstylable, and looks broken. Replace with a toast component or an inline error area. This is especially bad in the drag-drop paths where multiple files error in sequence.

### Hardcoded language group categorization with obvious errors

languageUtils.js lines 81-84: Vietnamese, Indonesian, Malay, Tagalog are mapped to `Western Latin (Americas & Western Europe)` despite being placed under the "APAC - South & Southeast Asia" section header. They use Latin scripts, so the mapping is defensible, but the code structure makes it look like a mistake. Either split the group definition into "writing system" vs "region" so the mapping is self-documenting, or add a comment explaining why these are Latin. As-is it will read as a bug on any future review.

### Showstate in MultiLanguageFallback has dead props

multi-language/index.jsx line 933: `showLanguageSelector` is created and forwarded but the setter is never passed to MainContent. Multiple `setExpandedGroups` / `setAddLanguageGroupFilter` handlers are unused. This matches the "Unused variables removed" comment that didn't actually remove them. Minor but cruft adds up.

### Test coverage is narrow

22 test files in src/test/ + 3 colocated. Covers BrandFont metrics, a few components, context provider basics. No tests for ConfigService's validateConfig (the exact site with the hardcoded-primary bug), no tests for useFontStack's exclusion logic, no tests for SafeFontLoader's timeout/concurrent behavior. The test where the bugs actually live is unwritten.

### Provider hierarchy is deep and order-sensitive

main.jsx has 5 nested providers. Each downstream provider assumes the upstream ones exist. If that order is swapped during a refactor, failures will be cryptic. Consider a single `AppProviders` component that encodes the required nesting with an eslint rule against direct nesting outside it, or a comment block documenting the ordering invariants.

## Priority ranking

If you fix four things this week:

1. ConfigService.validateConfig hardcoded styles
2. useConfigImport.restoreConfiguration signature mismatch
3. SafeFontLoader destructive timeout
4. Debounce PersistenceContext auto-save

The first two are correctness, the third is a reliability cliff under concurrent uploads, the fourth is the single biggest wasted-work item.

Everything else is quality work. The component-size issue is real but it's a refactor project, not a bug fix — don't bundle it with the above.
