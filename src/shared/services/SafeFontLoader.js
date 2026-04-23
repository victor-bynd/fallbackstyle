import { parseFontFile } from './FontLoader';

// Track active workers so tests/devtools can force cleanup.
const activeWorkers = new Set();

const createWorker = () => {
    const worker = new Worker(new URL('../workers/fontValidation.worker.js', import.meta.url), {
        type: 'module'
    });
    activeWorkers.add(worker);
    return worker;
};

// For testing purposes
export const resetWorker = () => {
    activeWorkers.forEach((worker) => worker.terminate());
    activeWorkers.clear();
};

export const safeParseFontFile = async (file, timeoutMs = 3000) => {
    const buffer = await file.arrayBuffer();
    return new Promise((resolve, reject) => {
        const worker = createWorker();

        try {
            let isResolved = false;
            let timer = null;

            const handleMessage = (e) => {
                const { success, error } = e.data;

                cleanup();

                if (success) {
                    // Worker approved! Now safe to parse on main thread.
                    // We knowingly accept the double-parse cost for safety.
                    parseFontFile(file)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Worker validation failed: ${error}`));
                }
            };

            const handleError = (err) => {
                cleanup();
                reject(new Error(`Worker error: ${err.message}`));
            };

            const cleanup = () => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timer);
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                worker.terminate();
                activeWorkers.delete(worker);
            };

            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);

            // Send data
            worker.postMessage({ buffer, fileName: file.name }, [buffer]); // Transfer buffer ownership

            // Set timeout
            timer = setTimeout(() => {
                if (!isResolved) {
                    cleanup();
                    // If we time out, we assume the worker is stuck.
                    console.warn(`SafeFontLoader: Timed out validating ${file.name}`);
                    reject(new Error("Font validation timed out"));
                }
            }, timeoutMs);

        } catch (e) {
            worker.terminate();
            activeWorkers.delete(worker);
            reject(e);
        }
    });
};
