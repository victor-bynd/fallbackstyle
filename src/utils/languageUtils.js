export const LANGUAGE_GROUPS = [
    'Latin Script',
    'CJK (Chinese, Japanese, Korean)',
    'Arabic Script (Right-to-Left)',
    'Cyrillic Script',
    'Brahmic / Indic Scripts',
    'Southeast Asian Scripts',
    'Greek Script',
    'Other'
];

export const LANGUAGE_GROUP_SHORT_NAMES = {
    'Latin Script': 'LATIN',
    'CJK (Chinese, Japanese, Korean)': 'CJK',
    'Arabic Script (Right-to-Left)': 'ARABIC',
    'Cyrillic Script': 'CYRILLIC',
    'Brahmic / Indic Scripts': 'INDIC',
    'Southeast Asian Scripts': 'SE ASIA',
    'Greek Script': 'GREEK',
    'Other': 'OTHER'
};

export const getLanguageGroup = (language) => {
    if (!language) return 'Other';

    const { id, script, dir } = language;

    // 1. Latin Script
    // Covers English, Spanish, French, German, Indonesian, Vietnamese, Turkish, etc.
    if (script === 'Latn') {
        return 'Latin Script';
    }

    // 2. CJK (Chinese, Japanese, Korean)
    if (['Hans', 'Hant', 'Jpan', 'Kore'].includes(script)) {
        return 'CJK (Chinese, Japanese, Korean)';
    }

    // 3. Arabic Script (Right-to-Left)
    // Covers Arabic, Urdu, Persian
    if (script === 'Arab' || dir === 'rtl') {
        return 'Arabic Script (Right-to-Left)';
    }

    // 4. Cyrillic Script
    // Covers Russian, Bulgarian
    if (script === 'Cyrl') {
        return 'Cyrillic Script';
    }

    // 5. Brahmic / Indic Scripts
    // Covers Hindi, Bengali, Gujarati, Marathi, Kannada, Malayalam, Punjabi, Tamil, Telugu
    if (['Deva', 'Beng', 'Gujr', 'Guru', 'Mlym', 'Taml', 'Knda', 'Telu'].includes(script)) {
        return 'Brahmic / Indic Scripts';
    }

    // 6. Southeast Asian Scripts
    // Covers Thai
    if (script === 'Thai') {
        return 'Southeast Asian Scripts';
    }

    // 7. Greek Script
    if (script === 'Grek') {
        return 'Greek Script';
    }

    return 'Other';
};

export const getGroupedLanguages = (languages, searchTerm = '') => {
    const grouped = LANGUAGE_GROUPS.reduce((acc, group) => {
        acc[group] = [];
        return acc;
    }, {});

    languages.forEach((lang) => {
        // Filter by search term if provided
        if (searchTerm &&
            !lang.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !lang.id.toLowerCase().includes(searchTerm.toLowerCase())) {
            return;
        }

        const group = getLanguageGroup(lang);
        if (grouped[group]) {
            grouped[group].push(lang);
        } else {
            grouped['Other'].push(lang);
        }
    });

    return LANGUAGE_GROUPS
        .map((key) => ({ key, items: grouped[key] || [] }))
        .filter((g) => g.items.length > 0);
};
