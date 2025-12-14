# Implementation Plan: Global Font Weight with Overrides

This plan outlines the changes required to implement a global font weight control (Primary/Secondary context level) that propagates to fallbacks, while allowing individual fallbacks to override this weight.

## 1. Analysis

### Current State
- `selectedWeight` is stored *per font* in the `fonts` array.
- `updateFontWeight` updates a specific font's weight.
- `LanguageCard` uses the primary font's weight for the container, and each fallback's own weight for fallback characters.

### Goals
1.  **Global Weight State**: Introduce a global `weight` state (per style context: primary/secondary) in `TypoContext`.
2.  **Propagation**: By default, fallbacks should inherit this global weight.
3.  **Overrides**: Individual fallbacks can override this weight (similar to scale/line-height overrides).
4.  **UI Updates**:
    - **Global Control**: Move the main weight slider to a prominent place (e.g., in `Controller` or top of `FontTabs`).
    - **Fallback Control**: Keep weight adjustment in `SortableFontCard` but mark it as an "Override".

---

## 2. Implementation Steps

### Step 1: Update State Model (`TypoContext.jsx`)
- Add `weight` to the style state (parallel to `baseFontSize`, `lineHeight`).
- Default to `400`.
- Add `setWeight` (or `updateStyleState` action).
- **Migration**: When loading a font, set this global weight to the font's default weight *if* it's the primary font being loaded.

### Step 2: Update `getEffectiveFontSettings`
- **Primary**: Returns global `weight`.
- **Fallback**: Returns `font.weightOverride` if present, otherwise global `weight`.

### Step 3: Update `FontLoader` Integration
- When Primary loads: Update global `weight`.
- When Fallback loads: Do **not** set an override by default.

### Step 4: UI Updates
- **Controller / Sidebar**: Add a "Global Weight" slider (if Primary is variable).
- **FontTabs**:
    - **Primary Card**: Syncs with Global Weight.
    - **Fallback Card**:
        - Show "Inherited Weight: [Value]" by default.
        - Allow user to set an *override*.
        - Add "Reset" button to clear override.

### Step 5: Refine `updateFontWeight`
- If Primary: Update global state.
- If Fallback: Update `weight` property on the specific font object (acting as override).

---

## 3. Detailed Logic

### State Shape
```javascript
// In TypoContext 'createEmptyStyleState'
weight: 400, // Global weight
fonts: [
  // ...
  {
    // ...
    // selectedWeight: REMOVE (or rename to weightOverride for clarity)
    weightOverride: undefined // If set, this is used. Else use global.
  }
]
```

### `TypoContext` Actions
- `updateGlobalWeight(weight)`: Updates `state.weight`.
- `updateFontWeight(fontId, weight)`:
    - If font is Primary -> call `updateGlobalWeight`.
    - If font is Fallback -> set `font.weightOverride`.

### `SortableFontCard`
- Display "Global Weight" slider for Primary.
- Display "Override Weight" slider for Fallback (defaulting to global value).
- Helper text to indicate inheritance.

---

## 4. Execution Plan
1.  **Context**: Update `TypoContext` to support global weight and overrides.
2.  **FontTabs**: Refactor `SortableFontCard` to distinguish between Global (Primary) and Override (Fallback) controls.
3.  **LanguageCard**: Verify it uses `getEffectiveFontSettings` which should now handle the logic transparently.
