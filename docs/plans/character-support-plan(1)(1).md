# Refactor Character Support Functionality

# Goal Description
The goal is to change the calculated "Supported %" in the Language Card to reflect coverage of the **entire language**, rather than just the characters present in the sample text (pangram/override). This provides a holistic view of how well the current font stack (Primary + Fallbacks) supports a specific language.

## User Review Required
> [!NOTE]
> I will be creating a new data file `src/data/languageCharacters.js` to define the character sets for each supported language. For large sets (like CJK), I will use standard core character lists/ranges.

## Proposed Changes

### Data Layer
#### [NEW] [languageCharacters.js](src/data/languageCharacters.js)
-   Create a new file exporting a mapping of Language ID -> Character Strings.
-   **Structure**:
    ```javascript
    export const languageCharacters = {
      'en-US': "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz...",
      'vi-VN': "...", // All vietnamese characters including stacked diacritics
      // ... for all languages
    };
    ```
-   For CJK languages (Chinese, Japanese, Korean), I will generate a string of characters based on standard "Common/Core" lists (e.g., Joyo Kanji for Japanese, Common Hanzi for Chinese) to ensure the check is meaningful but performant.

### Component Layer
#### [MODIFY] [LanguageCard.jsx](src/components/LanguageCard.jsx)
-   Import `languageCharacters` from `../data/languageCharacters`.
-   Update `contentToRender` logic (or create a separate `metricsContent`) for the purpose ofStats calculation.
-   **Current Logic**: `supportedPercent` uses `contentToRender` (pangram or user override).
-   **New Logic**:
    -   Retrieve the full character set for `language.id` from `languageCharacters`.
    -   If no full set is defined, fallback to `contentToRender`.
    -   Calculate `missingChars` and `supportedPercent` using this full set.
    -   Keep the *visual* rendering (the text shown in the card) as is (pangram or override). Only the green/red metadata badge changes.

## Verification Plan

### Manual Verification
1.  **Baseline Check**:
    -   Open the app.
    -   Observe the "Supported" percentage for English (should be 100% with default fonts).
    -   Observe Vietnamese (should be 100% with default fonts).
2.  **Partial Support Test**:
    -   Upload a custom font that has limited character support (e.g., a display font with only A-Z).
    -   Check the **English** card: Should show <100% if punctuation/lowercase is missing, or close to 100%.
    -   Check the **Vietnamese** card: Should show a significantly lower percentage (due to missing diacritics), whereas previously it might have been higher if the pangram was simple or if it only checked displayed chars.
3.  **Holistic Check**:
    -   Ensure the percentage doesn't change when I edit the text in the card (since it should now be based on the *language*, not the *card content*).
