/**
 * Normalizes font names for consistent comparison across the application.
 * Removes file extensions, common weight/style suffixes, and standardizes formatting.
 *
 * @param {string} name - The font name or filename to normalize
 * @returns {string} - The normalized font name
 *
 * @example
 * normalizeFontName('Roboto-Bold.ttf') // returns 'roboto'
 * normalizeFontName('Open Sans Regular') // returns 'open sans'
 */
export const normalizeFontName = (name) => {
    if (!name) return '';
    let n = name.trim().toLowerCase();

    // Remove extension
    const lastDot = n.lastIndexOf('.');
    if (lastDot > 0) {
        n = n.substring(0, lastDot);
    }

    // Remove common suffixes to isolate family name
    // Order matters: specific longer suffixes first
    const suffixes = [
        '-regular', ' regular', '_regular',
        '-bold', ' bold', '_bold',
        '-italic', ' italic', '_italic',
        '-medium', ' medium', '_medium',
        '-light', ' light', '_light',
        '-thin', ' thin', '_thin',
        '-black', ' black', '_black',
        '-semibold', ' semibold', '_semibold',
        '-extrabold', ' extrabold', '_extrabold',
        '-extralight', ' extralight', '_extralight'
    ];

    for (const suffix of suffixes) {
        if (n.endsWith(suffix)) {
            n = n.substring(0, n.length - suffix.length);
        }
    }

    return n.replace(/[-_]/g, ' ').trim();
};
