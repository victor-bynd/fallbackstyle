
const DB_NAME = 'localize-type-db';
const DB_VERSION = 1;
const STORE_CONFIG = 'config';
const STORE_FONTS = 'fonts';

/** Cached database connection */
let _dbInstance = null;

/**
 * Service to handle IndexedDB interactions for state persistence.
 */
export const PersistenceService = {
    /**
     * Open (and upgrade) the database. Reuses existing connection.
     * @returns {Promise<IDBDatabase>}
     */
    initDB: () => {
        if (_dbInstance) return Promise.resolve(_dbInstance);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[PersistenceService] Error opening DB', event);
                reject(new Error('Error opening database'));
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_CONFIG)) {
                    db.createObjectStore(STORE_CONFIG);
                }

                if (!db.objectStoreNames.contains(STORE_FONTS)) {
                    db.createObjectStore(STORE_FONTS);
                }
            };

            request.onsuccess = (event) => {
                _dbInstance = event.target.result;
                _dbInstance.onclose = () => { _dbInstance = null; };
                _dbInstance.onversionchange = () => {
                    _dbInstance.close();
                    _dbInstance = null;
                };
                resolve(_dbInstance);
            };
        });
    },

    /**
     * Save the entire configuration object.
     * @param {Object} config 
     */
    saveConfig: async (config) => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_CONFIG], 'readwrite');
                const store = transaction.objectStore(STORE_CONFIG);
                const request = store.put(config, 'appState');

                request.onsuccess = () => resolve();
                request.onerror = (e) => {
                    if (e.target.error.name === 'QuotaExceededError') {
                        console.error('[PersistenceService] Storage quota exceeded while saving config');
                    }
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error('[PersistenceService] Error saving config', err);
            throw err;
        }
    },

    /**
     * Load the configuration object.
     * @returns {Promise<Object|null>}
     */
    loadConfig: async () => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_CONFIG], 'readonly');
                const store = transaction.objectStore(STORE_CONFIG);
                const request = store.get('appState');

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.error('[PersistenceService] Error loading config', err);
            return null;
        }
    },

    /**
     * Save a font file with metadata.
     * @param {string} id - Unique identifier for the font (e.g. filename or unique ID)
     * @param {Object} fontData - Object containing {fontObject, fontUrl, fileName}
     */
    saveFont: async (id, fontData) => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_FONTS], 'readwrite');
                const store = transaction.objectStore(STORE_FONTS);
                const request = store.put(fontData, id);

                request.onsuccess = () => resolve();
                request.onerror = (e) => {
                    if (e.target.error.name === 'QuotaExceededError') {
                        console.error('[PersistenceService] Storage quota exceeded while saving font:', id);
                        // Optional: Trigger a clean-up or notify user
                    }
                    reject(e.target.error);
                };
            });
        } catch (err) {
            console.error('[PersistenceService] Error saving font', id, err);
            throw err; // Re-throw to allow caller to handle
        }
    },

    /**
     * Get a font file with metadata.
     * @param {string} id
     * @returns {Promise<Object|undefined>} Object containing {fontObject, fontUrl, fileName}
     */
    getFont: async (id) => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_FONTS], 'readonly');
                const store = transaction.objectStore(STORE_FONTS);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.error('[PersistenceService] Error loading font', id, err);
            return undefined;
        }
    },

    /**
     * Delete a font file.
     * @param {string} id 
     */
    deleteFont: async (id) => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_FONTS], 'readwrite');
                const store = transaction.objectStore(STORE_FONTS);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.error('[PersistenceService] Error deleting font', id, err);
        }
    },

    /**
     * Get all font IDs currently in the store.
     * @returns {Promise<string[]>}
     */
    getFontKeys: async () => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_FONTS], 'readonly');
                const store = transaction.objectStore(STORE_FONTS);
                const request = store.getAllKeys();

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.error('[PersistenceService] Error getting font keys', err);
            return [];
        }
    },

    /**
     * Clear all data from the database.
     */
    clear: async () => {
        try {
            const db = await PersistenceService.initDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([STORE_CONFIG, STORE_FONTS], 'readwrite');

                // Clear both stores
                transaction.objectStore(STORE_CONFIG).clear();
                transaction.objectStore(STORE_FONTS).clear();

                transaction.oncomplete = () => resolve();
                transaction.onerror = (e) => reject(e);
            });
        } catch (err) {
            console.error('[PersistenceService] Error clearing DB', err);
        }
    }
};
