import { useMemo } from 'react';
import { useTypo } from '../context/useTypo';

export const useFontFaceStyles = () => {
    const { fontStyles, getEffectiveFontSettingsForStyle } = useTypo();

    const fontFaceStyles = useMemo(() => {
        return Object.keys(fontStyles || {})
            .map(styleId => {
                const style = fontStyles?.[styleId];
                if (!style) return '';

                const primary = (style.fonts || []).find(f => f && f.type === 'primary');
                // Resolve primary settings (handles group if applicable, though primarily for base props)
                const primarySettings = primary ? getEffectiveFontSettingsForStyle(styleId, primary.id) : null;





                // Override properties are floats (0-1), convert to %
                const primaryLineGapOverride = (primarySettings && primarySettings.lineGapOverride !== undefined && primarySettings.lineGapOverride !== '')
                    ? `line-gap-override: ${primarySettings.lineGapOverride * 100}%;`
                    : '';

                const primaryAscentOverride = (primarySettings && primarySettings.ascentOverride !== undefined && primarySettings.ascentOverride !== '')
                    ? `ascent-override: ${primarySettings.ascentOverride * 100}%;`
                    : '';

                const primaryDescentOverride = (primarySettings && primarySettings.descentOverride !== undefined && primarySettings.descentOverride !== '')
                    ? `descent-override: ${primarySettings.descentOverride * 100}%;`
                    : '';

                const primaryVariationSettings = (primary && (primary.isVariable || primary.axes?.weight))
                    ? `font-variation-settings: 'wght' ${primarySettings?.weight ?? 400};`
                    : '';

                const primarySizeAdjust = (primarySettings?.scale && primarySettings.scale !== 100)
                    ? `size-adjust: ${primarySettings.scale}%;`
                    : '';

                const primaryRule = !primary?.hidden && (primary?.fontUrl || primary?.name)
                    ? `
          @font-face {
            font-family: 'UploadedFont-${styleId}';
            src: ${primary.fontUrl ? `url('${primary.fontUrl}')` : `local('${primary.name}')`};
            ${primarySizeAdjust}
            ${primaryVariationSettings}
            ${primaryLineGapOverride}
            ${primaryAscentOverride}
            ${primaryDescentOverride}
          }
        `
                    : '';

                const fallbackRules = (style.fonts || [])
                    .filter(f => {
                        if (!f || !f.fontUrl && !f.name) return false;
                        if (f.type !== 'fallback' && f.type !== 'primary') return false;
                        if (f.hidden) return false;
                        if (f.isPrimaryOverride && primary?.hidden) return false;
                        return true;
                    })
                    .map(font => {
                        const settings = getEffectiveFontSettingsForStyle(styleId, font.id);

                        // Scale (size-adjust)
                        // effectiveSettings.scale encompasses group.scale, font.scale, or global scale
                        let scale = settings?.scale;
                        // If undefined, default to 100 (though helper usually handles this, let's be safe)
                        if (scale === undefined) scale = 100;

                        const sizeAdjust = (scale !== 100)
                            ? `size-adjust: ${scale}%;`
                            : '';

                        // Weight Override
                        // Helper returns resolved weight, but for variation settings we generally want the raw override or nothing?
                        // Actually, for Variable fonts, we need 'font-variation-settings'.
                        // The helper `weight` property is the *resolved* weight (number).
                        // If it's a variable font, we should set this weight.
                        // However, standard CSS handles `font-weight`. `font-variation-settings` is extra.
                        // Existing code: `font-variation-settings: 'wght' ${weightOverride};`

                        // We need the raw override value for var settings if we are forcing a specific axis value
                        // or just rely on font-weight?
                        // The previous implementation utilized `weightOverride` directly.
                        // `getEffectiveFontSettingsForStyle` returns `weight` which is the resolved numeric weight.
                        // Let's use that for wght axis if the font is variable.

                        // BUT: We need to know if we SHOULD output it. 
                        // If it's just inheriting global weight, we might rely on the class/style.
                        // However, @font-face doesn't take params from the element style for variation settings automatically 
                        // in the same way for all browsers? 
                        // Actually, standard practice: verify if we need to force it in @font-face.
                        // The previous code only added it if `weightOverride` was verified.
                        // Let's stick to using the `weight` from settings if it differs from default or if we just want to enforce it.
                        // The safest bet is: if the font has axes, set wght axis to the resolved weight.

                        // Actually, the previous code used `font.weightOverride`. 
                        // Our helper resolves this: `weight: resolveWeightForFont(...)`.
                        // If we put `font-variation-settings: 'wght' X`, it forces that weight for *all* usage of this `@font-face`.
                        // Since each fallback has its own unique @font-face family name (FallbackFont-style-id), this is correct.

                        const variationSettings = (font.isVariable || font.axes?.weight) // Check if variable
                            ? `font-variation-settings: 'wght' ${settings?.weight ?? 400};`
                            : '';

                        const lineGapOverride = (settings?.lineGapOverride !== undefined && settings.lineGapOverride !== '')
                            ? `line-gap-override: ${settings.lineGapOverride * 100}%;`
                            : '';
                        const ascentOverride = (settings?.ascentOverride !== undefined && settings.ascentOverride !== '')
                            ? `ascent-override: ${settings.ascentOverride * 100}%;`
                            : '';
                        const descentOverride = (settings?.descentOverride !== undefined && settings.descentOverride !== '')
                            ? `descent-override: ${settings.descentOverride * 100}%;`
                            : '';

                        // Recovery: If fontUrl is missing, try to find a matching font in the stack that HAS a url
                        let activeUrl = font.fontUrl;
                        if (!activeUrl && font.name) {
                            const sibling = (style.fonts || []).find(f => f && f.fontUrl && (f.name === font.name || f.fileName === font.fileName));
                            if (sibling) activeUrl = sibling.fontUrl;
                            // Warn if recovery needed
                            if (activeUrl) console.warn(`[useFontFaceStyles] Recovered URL for font ${font.id} from sibling ${sibling.id}`);
                        }

                        const src = activeUrl ? `url('${activeUrl}')` : `local('${font.name}')`;

                        return `
            @font-face {
              font-family: 'FallbackFont-${styleId}-${font.id}';
              src: ${src};
              ${sizeAdjust}
              ${variationSettings}
              ${lineGapOverride}
              ${ascentOverride}
              ${descentOverride}
            }
          `;
                    })
                    .join('');

                // NEW: Generate rules for System Fallback Overrides (Legacy)
                // These are per-language overrides for the style.fallbackFont
                const systemOverrides = style.systemFallbackOverrides || {};
                const systemFallbackRules = Object.entries(systemOverrides).map(([langId, overrides]) => {
                    const fontName = style.fallbackFont || 'sans-serif';
                    // Skip generics to avoid invalid local() (though some browsers might tolerate it, it generally won't work for overrides)
                    // Actually, for overrides to work, we MUST have a concrete font to wrap.
                    // If the user hasn't set a concrete fallback font, they shouldn't be seeing advanced settings?
                    // Assuming reasonable usage here.

                    const sizeAdjust = (overrides.scale && overrides.scale !== 100)
                        ? `size-adjust: ${overrides.scale}%;`
                        : '';

                    const lineGapOverride = (overrides.lineGapOverride !== undefined && overrides.lineGapOverride !== '')
                        ? `line-gap-override: ${overrides.lineGapOverride * 100}%;`
                        : '';
                    const ascentOverride = (overrides.ascentOverride !== undefined && overrides.ascentOverride !== '')
                        ? `ascent-override: ${overrides.ascentOverride * 100}%;`
                        : '';
                    const descentOverride = (overrides.descentOverride !== undefined && overrides.descentOverride !== '')
                        ? `descent-override: ${overrides.descentOverride * 100}%;`
                        : '';

                    // For system/legacy fallbacks, we don't usually have variation settings support in this context yet
                    // unless we added a way to specify them for the system font.

                    return `
            @font-face {
              font-family: 'SystemFallback-${styleId}-${langId}';
              src: local('${fontName}');
              ${sizeAdjust}
              ${lineGapOverride}
              ${ascentOverride}
              ${descentOverride}
            }
          `;
                }).join('');

                return `${primaryRule}${fallbackRules}${systemFallbackRules}`;
            });
    }, [fontStyles, getEffectiveFontSettingsForStyle]);

    return fontFaceStyles;
};
