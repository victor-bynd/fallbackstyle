import React from 'react';

export const TOOLTIPS = {
    SUPPORT_CJK: "Support for this language is determined by a representative sample of common characters due to its large character set. 100% means all common characters in our sample are present in the font.",
    SUPPORT_GENERAL: "Support is calculated against the full character set required for this language.",
    LINE_HEIGHT_LOCKED: "Line Height is locked to 'normal' to ensure fallback font metric overrides (like line-gap-override) are respected.",
    STYLING_OVERRIDES: (
        <span>
            <strong className="block mb-2 text-indigo-300">Styling Overrides</strong>
            Overriding the primary font here changes the default styling but enables cascading controls (like line-height and letter-spacing) for specific language fonts, bypassing standard inheritance limitations.
        </span>
    ),
    DETARGETING_FONTS: (
        <span>
            <strong className="block mb-2 text-indigo-300">Detargeting Fonts</strong>
            Properties like `line-height` and `letter-spacing` apply to the entire element, meaning primary and fallback fonts share them. To style scripts independently, you must override the primary font or use separate elements (e.g., spans).
            <br /><br />
            <strong className="block mb-2 text-indigo-300">Browser Compatibility</strong>
            Advanced `@font-face` metrics like `ascent-override`, `descent-override`, and `line-gap-override` are currently not supported in **Safari**. Use these with caution if your target audience uses macOS or iOS.
        </span>
    ),
    STYLING_LIMITATIONS: (
        <span>
            <strong className="block mb-2 text-indigo-300">Styling Limitations</strong>
            Properties like `line-height` and `letter-spacing` apply to the entire element, meaning primary and fallback fonts share them. To style scripts independently, you must use separate elements (e.g., spans).
            <br /><br />
            <strong className="block mb-2 text-indigo-300">Browser Compatibility</strong>
            Advanced `@font-face` metrics like `ascent-override`, `descent-override`, and `line-gap-override` are currently not supported in **Safari**. Use these with caution if your target audience uses macOS or iOS.
        </span>
    ),
    OVERRIDE_MANAGER: "Override Manager: Audit and reset scale, weight, and metric adjustments.",
    MANAGE_FONTS: "Manage Fonts: Upload and configure available fonts."
};
