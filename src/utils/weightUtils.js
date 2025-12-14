export const COMMON_WEIGHT_DEFS = [
    { label: 'Thin 100', value: 100 },
    { label: 'Extra Light 200', value: 200 },
    { label: 'Light 300', value: 300 },
    { label: 'Regular 400', value: 400 },
    { label: 'Medium 500', value: 500 },
    { label: 'Semi Bold 600', value: 600 },
    { label: 'Bold 700', value: 700 },
    { label: 'Extra Bold 800', value: 800 },
    { label: 'Black 900', value: 900 }
];

const isWeightAvailableForFont = (font, weight) => {
    if (!font) return false;

    if (!font.fontObject) return true;

    const axis = font.axes?.weight;
    if (axis) {
        return weight >= axis.min && weight <= axis.max;
    }

    if (typeof font.staticWeight === 'number') return weight === font.staticWeight;

    return true;
};

export const buildWeightSelectOptions = (font) => {
    const common = COMMON_WEIGHT_DEFS
        .filter(def => isWeightAvailableForFont(font, def.value))
        .map(def => ({ ...def }));

    const axis = font?.axes?.weight;
    if (font?.fontObject && axis && common.length === 0) {
        const fallbackValue = Math.round(axis.default ?? axis.min ?? 400);
        return [{ label: `Default ${fallbackValue}`, value: fallbackValue }];
    }

    const staticWeight = typeof font?.staticWeight === 'number' ? font.staticWeight : null;
    if (font?.fontObject && !axis && staticWeight !== null) {
        const has = common.some(o => o.value === staticWeight);
        if (!has) {
            return [{ label: `Weight ${staticWeight}`, value: staticWeight }];
        }
        return common;
    }

    return common;
};

export const resolveWeightToAvailableOption = (font, requestedWeight) => {
    const fallback = typeof requestedWeight === 'number' ? requestedWeight : 400;
    const options = buildWeightSelectOptions(font);
    if (!options || options.length === 0) return fallback;

    if (options.some(o => o.value === requestedWeight)) return requestedWeight;

    // Snap to nearest available option.
    let best = options[0].value;
    let bestDist = Math.abs(best - fallback);

    for (const opt of options) {
        const dist = Math.abs(opt.value - fallback);
        if (dist < bestDist) {
            best = opt.value;
            bestDist = dist;
        }
    }

    return best;
};

export const resolveWeightForFont = (font, requestedWeight) => {
    if (!font) return requestedWeight;

    if (!font.fontObject) return requestedWeight;

    const axis = font.axes?.weight;
    if (axis) {
        const min = typeof axis.min === 'number' ? axis.min : 100;
        const max = typeof axis.max === 'number' ? axis.max : 900;
        const clamped = Math.max(min, Math.min(max, requestedWeight));
        return Math.round(clamped);
    }

    if (typeof font.staticWeight === 'number') return font.staticWeight;

    return requestedWeight;
};
