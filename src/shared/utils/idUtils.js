export const generateUniqueId = (prefix) => {
    const randomPart = (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    return `${prefix}-${randomPart}`;
};
