export const LANGUAGE_GROUPS = [
    'Western Latin (Americas & Western Europe)',
    'APAC - CJK (East Asia)',
    'EEMEA - Right-to-Left (Middle East & South Asia)',
    'EEMEA - Cyrillic, Greek & Eastern Europe',
    'APAC - South & Southeast Asia (Complex Scripts)',
    'Sub-Saharan Africa',
    'Nordic & Baltic (Northern Europe)',
    'Other'
];

export const LANGUAGE_GROUP_SHORT_NAMES = {
    'Western Latin (Americas & Western Europe)': 'Western Latin',
    'APAC - CJK (East Asia)': 'APAC - CJK',
    'EEMEA - Right-to-Left (Middle East & South Asia)': 'EEMEA - RTL',
    'EEMEA - Cyrillic, Greek & Eastern Europe)': 'EEMEA - Cyrillic', // Corrected key to match array? No wait, array is "EEMEA - Cyrillic, Greek & Eastern Europe"
    'EEMEA - Cyrillic, Greek & Eastern Europe': 'EEMEA - Cyrillic',
    'APAC - South & Southeast Asia (Complex Scripts)': 'APAC - SE Asia',
    'Sub-Saharan Africa': 'Africa',
    'Nordic & Baltic (Northern Europe)': 'Nordic & Baltic',
    'Other': 'Other'
};

// Strict mapping of Language IDs to their specific groups
const GROUP_MAPPING = {
    // 1. Western Latin (Americas & Western Europe)
    'en-US': 'Western Latin (Americas & Western Europe)',
    'en-GB': 'Western Latin (Americas & Western Europe)',
    'es': 'Western Latin (Americas & Western Europe)',
    'es-ES': 'Western Latin (Americas & Western Europe)',
    'es-MX': 'Western Latin (Americas & Western Europe)',
    'es-AR': 'Western Latin (Americas & Western Europe)',
    'fr-FR': 'Western Latin (Americas & Western Europe)',
    'fr-CA': 'Western Latin (Americas & Western Europe)',
    'pt-BR': 'Western Latin (Americas & Western Europe)',
    'pt-PT': 'Western Latin (Americas & Western Europe)',
    'de-DE': 'Western Latin (Americas & Western Europe)',
    'it-IT': 'Western Latin (Americas & Western Europe)',
    'nl-NL': 'Western Latin (Americas & Western Europe)',
    'ga-IE': 'Western Latin (Americas & Western Europe)',
    'mt-MT': 'Western Latin (Americas & Western Europe)',

    // 2. APAC - CJK (East Asia)
    'zh-Hans': 'APAC - CJK (East Asia)',
    'zh-Hant': 'APAC - CJK (East Asia)',
    'ja-JP': 'APAC - CJK (East Asia)',
    'ko-KR': 'APAC - CJK (East Asia)',

    // 3. EEMEA - Right-to-Left (Middle East & South Asia)
    'ar': 'EEMEA - Right-to-Left (Middle East & South Asia)',
    'he-IL': 'EEMEA - Right-to-Left (Middle East & South Asia)',
    'fa-IR': 'EEMEA - Right-to-Left (Middle East & South Asia)',
    'ur-PK': 'EEMEA - Right-to-Left (Middle East & South Asia)',

    // 4. EEMEA - Cyrillic, Greek & Eastern Europe
    'ru-RU': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'el-GR': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'uk-UA': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'pl-PL': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'tr-TR': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'cs-CZ': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'sk-SK': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'hu-HU': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'ro-RO': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'bg-BG': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'hr-HR': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'sl-SI': 'EEMEA - Cyrillic, Greek & Eastern Europe',
    'kk-KZ': 'EEMEA - Cyrillic, Greek & Eastern Europe',

    // 5. APAC - South & Southeast Asia (Complex Scripts)
    'hi-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'mr-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'bn-BD': 'APAC - South & Southeast Asia (Complex Scripts)',
    'bn-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'pa-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'gu-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'ta-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'te-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'kn-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'ml-IN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'th-TH': 'APAC - South & Southeast Asia (Complex Scripts)',
    'vi-VN': 'APAC - South & Southeast Asia (Complex Scripts)',
    'id-ID': 'APAC - South & Southeast Asia (Complex Scripts)',
    'ms-MY': 'APAC - South & Southeast Asia (Complex Scripts)',
    'tl-PH': 'APAC - South & Southeast Asia (Complex Scripts)',

    // 6. Sub-Saharan Africa
    'sw-KE': 'Sub-Saharan Africa',
    'am-ET': 'Sub-Saharan Africa',
    'zu-ZA': 'Sub-Saharan Africa',
    'yo-NG': 'Sub-Saharan Africa',
    'af-ZA': 'Sub-Saharan Africa',

    // 7. Nordic & Baltic (Northern Europe)
    'sv-SE': 'Nordic & Baltic (Northern Europe)',
    'da-DK': 'Nordic & Baltic (Northern Europe)',
    'nb-NO': 'Nordic & Baltic (Northern Europe)',
    'fi-FI': 'Nordic & Baltic (Northern Europe)',
    'et-EE': 'Nordic & Baltic (Northern Europe)',
    'lv-LV': 'Nordic & Baltic (Northern Europe)',
    'lt-LT': 'Nordic & Baltic (Northern Europe)'
};

export const getLanguageGroup = (language) => {
    if (!language || !language.id) return 'Other';
    return GROUP_MAPPING[language.id] || 'Other';
};

export const getGroupedLanguages = (languages, searchTerm = '') => {
    // Initialize groups in correct order
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
            // Should theoretically catch anything else in 'Other' if initialized,
            // or we add it to 'Other' explicitly
            if (!grouped['Other']) grouped['Other'] = [];
            grouped['Other'].push(lang);
        }
    });

    return LANGUAGE_GROUPS
        .map((key) => ({ key, items: grouped[key] || [] }))
        .filter((g) => g.items.length > 0);
};
